<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Facades\Artisan;

Artisan::command('farm:daily-tasks', function () {
    // 1. Lấy ngưỡng cảnh báo cận hạn từ bảng system_settings (mặc định 2 ngày)
    $ngayCanhBao = (int) (DB::table('system_settings')
        ->where('khoa', 'nguong_canh_bao_can_han')
        ->value('gia_tri') ?? 2);

    // 2. Quét lô cận hạn & đẩy vào bảng expiry_alerts (UC-06)
    $nearBatches = DB::table('batches')
        ->where('so_luong_ton', '>', 0)
        ->whereDate('ngay_het_han', '<=', now()->addDays($ngayCanhBao)->toDateString())
        ->whereDate('ngay_het_han', '>=', now()->toDateString())
        ->get();

    $soCanhBaoMoi = 0;
    foreach ($nearBatches as $batch) {
        // Cột sinh batch_dang_mo sẽ ngăn tạo trùng cảnh báo đang mở (RB-12)
        $inserted = DB::table('expiry_alerts')->insertOrIgnore([
            'batch_id' => $batch->id,
            'trang_thai' => 'Đang mở',
            'ngay_tao' => now(),
        ]);
        if ($inserted) $soCanhBaoMoi++;
    }

    // 3. Tự động chốt kho FEFO cho các đơn con giao ngày mai (UC-02)
    $ngayMai = now()->addDay()->toDateString();
    $schedules = DB::table('delivery_schedules')
        ->join('orders', 'delivery_schedules.order_id', '=', 'orders.id')
        ->whereDate('delivery_schedules.ngay_giao', $ngayMai)
        ->where('orders.trang_thai', 'Chờ giao')
        ->select('orders.*')
        ->get();

    $donSanSang = 0;
    $donThieuHang = 0;

    foreach ($schedules as $order) {
        DB::transaction(function () use ($order, &$donSanSang, &$donThieuHang) {
            $details = DB::table('order_details')->where('order_id', $order->id)->get();
            $duHang = true;

            foreach ($details as $dt) {
                $tongTon = DB::table('batches')
                    ->where('product_id', $dt->product_id)
                    ->where('so_luong_ton', '>', 0)
                    ->whereDate('ngay_het_han', '>=', now()->toDateString())
                    ->sum('so_luong_ton');

                if ($tongTon < $dt->so_luong) {
                    $duHang = false;
                    break;
                }
            }

            if (!$duHang) {
                DB::table('orders')->where('id', $order->id)->update(['trang_thai' => 'Chờ phương án']);
                $donThieuHang++;
                return;
            }

            // Đủ hàng -> Tiến hành trừ kho FEFO và gắn batch_id
            foreach ($details as $dt) {
                $conCan = $dt->so_luong;
                $batches = DB::table('batches')
                    ->where('product_id', $dt->product_id)
                    ->where('so_luong_ton', '>', 0)
                    ->whereDate('ngay_het_han', '>=', now()->toDateString())
                    ->orderBy('ngay_het_han', 'asc')
                    ->orderBy('ngay_thu_hoach', 'asc')
                    ->lockForUpdate()
                    ->get();

                $firstBatch = true;
                foreach ($batches as $batch) {
                    if ($conCan <= 0) break;
                    $tru = min($batch->so_luong_ton, $conCan);
                    DB::table('batches')->where('id', $batch->id)->decrement('so_luong_ton', $tru);

                    if ($firstBatch) {
                        DB::table('order_details')->where('id', $dt->id)->update([
                            'batch_id' => $batch->id,
                            'so_luong' => $tru,
                        ]);
                        $firstBatch = false;
                    } else {
                        DB::table('order_details')->insert([
                            'order_id' => $order->id,
                            'product_id' => $dt->product_id,
                            'batch_id' => $batch->id,
                            'so_luong' => $tru,
                            'don_gia' => $dt->don_gia,
                        ]);
                    }
                    $conCan -= $tru;
                }
            }

            DB::table('orders')->where('id', $order->id)->update(['trang_thai' => 'Sẵn sàng giao']);
            $donSanSang++;
        });
    }

    $this->info("Hoàn tất Scheduler: Tạo {$soCanhBaoMoi} cảnh báo cận hạn | {$donSanSang} đơn con sẵn sàng giao | {$donThieuHang} đơn thiếu hàng.");
})->purpose('Tác vụ tự động hằng ngày lúc 18:00 (UC-02 & UC-06)');

// Lên lịch tự động chạy lúc 18:00 mỗi ngày
Schedule::command('farm:daily-tasks')->dailyAt('18:00');