<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

// 1. API Lấy danh sách sản phẩm thật kèm tổng tồn kho khả dụng (chưa hết hạn)
Route::get('/products', function () {
    $products = DB::table('products')
        ->leftJoin('product_certifications', 'products.id', '=', 'product_certifications.product_id')
        ->leftJoin('certifications', 'product_certifications.certification_id', '=', 'certifications.id')
        ->select(
            'products.*',
            DB::raw('GROUP_CONCAT(DISTINCT certifications.ten_chung_nhan) as chung_nhan')
        )
        ->where('products.trang_thai', 'Đang bán')
        ->groupBy(
            'products.id', 'products.category_id', 'products.ma_sku', 'products.ten_san_pham',
            'products.slug', 'products.mo_ta', 'products.hinh_anh_dai_dien',
            'products.gia_ban_co_ban', 'products.don_vi_tinh', 'products.trang_thai',
            'products.ngay_tao', 'products.ngay_cap_nhat'
        )
        ->get()
        ->map(function ($item) {
            // Tính tổng tồn kho của các lô còn hạn và kiểm tra giá xả hàng (nếu có)
            $batches = DB::table('batches')
                ->where('product_id', $item->id)
                ->where('so_luong_ton', '>', 0)
                ->whereDate('ngay_het_han', '>=', now()->toDateString())
                ->orderBy('ngay_het_han', 'asc')
                ->get();

            $item->ton_kho_kha_dung = $batches->sum('so_luong_ton');
            $item->gia_hien_tai = $batches->first()?->gia_xa_hang ?? $item->gia_ban_co_ban;
            return $item;
        });

    return response()->json($products);
});

// 2. API Truy xuất nguồn gốc qua mã QR (UC-04)
Route::get('/trace/{qrToken}', function ($qrToken) {
    $batch = DB::table('batches')
        ->join('products', 'batches.product_id', '=', 'products.id')
        ->join('users', 'batches.farm_staff_id', '=', 'users.id')
        ->where('batches.qr_code', $qrToken)
        ->select(
            'batches.*',
            'products.ten_san_pham',
            'products.hinh_anh_dai_dien',
            'users.ho_ten as nguoi_phu_trach'
        )
        ->first();

    if (!$batch) {
        return response()->json(['message' => 'Không tìm thấy thông tin lô hàng!'], 404);
    }

    $logs = DB::table('farming_logs')
        ->where('batch_id', $batch->id)
        ->where('da_cong_bo', true)
        ->orderBy('thoi_gian', 'asc')
        ->get();

    $documents = DB::table('batch_documents')
        ->where('batch_id', $batch->id)
        ->get();

    return response()->json([
        'batch' => $batch,
        'farming_logs' => $logs,
        'documents' => $documents,
    ]);
});

// 3. API Đặt hàng & Trừ kho tự động theo nguyên tắc FEFO (UC-01)
Route::post('/orders/checkout', function (Request $request) {
    $items = $request->input('items', []);
    if (empty($items)) {
        return response()->json(['message' => 'Giỏ hàng trống!'], 422);
    }

    return DB::transaction(function () use ($request, $items) {
        $orderId = DB::table('orders')->insertGetId([
            'ma_don_hang' => 'DH-' . now()->format('YmdHis'),
            'user_id' => $request->input('user_id'),
            'loai_don' => 'Thường',
            'ten_nguoi_nhan' => $request->input('ten_nguoi_nhan', 'Khách vãng lai'),
            'so_dien_thoai_nhan' => $request->input('so_dien_thoai_nhan', '0900000000'),
            'dia_chi_giao' => $request->input('dia_chi_giao', 'TP. Hồ Chí Minh'),
            'trang_thai' => 'Đã xác nhận',
            'tong_tien_hang' => $request->input('tong_tien_hang', 0),
            'phi_van_chuyen' => $request->input('phi_van_chuyen', 0),
            'tong_thanh_toan' => $request->input('tong_thanh_toan', 0),
        ]);

        foreach ($items as $item) {
            $conCan = $item['quantity'];

            // Khóa dòng lô hàng theo đúng quy tắc RB-01 & RB-04 (FEFO)
            $batches = DB::table('batches')
                ->where('product_id', $item['id'])
                ->where('so_luong_ton', '>', 0)
                ->whereDate('ngay_het_han', '>=', now()->toDateString())
                ->orderBy('ngay_het_han', 'asc')
                ->orderBy('ngay_thu_hoach', 'asc')
                ->lockForUpdate()
                ->get();

            if ($batches->sum('so_luong_ton') < $conCan) {
                abort(400, "Sản phẩm {$item['ten_san_pham']} không đủ tồn kho khả dụng!");
            }

            foreach ($batches as $batch) {
                if ($conCan <= 0) break;
                $tru = min($batch->so_luong_ton, $conCan);

                DB::table('batches')->where('id', $batch->id)->decrement('so_luong_ton', $tru);

                // Tách dòng order_details gắn đúng batch_id để truy vết ngược
                DB::table('order_details')->insert([
                    'order_id' => $orderId,
                    'product_id' => $item['id'],
                    'batch_id' => $batch->id,
                    'so_luong' => $tru,
                    'don_gia' => $batch->gia_xa_hang ?? $item['gia_hien_tai'],
                ]);

                $conCan -= $tru;
            }
        }

        return response()->json([
            'message' => 'Đặt hàng thành công & đã tự động phân bổ lô theo nguyên tắc FEFO!',
            'order_id' => $orderId,
        ]);
    });
});