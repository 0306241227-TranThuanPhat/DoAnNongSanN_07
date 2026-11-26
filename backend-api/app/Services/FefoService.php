<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Exception;

class FefoService
{
    /**
     * Xuất kho tự động theo nguyên tắc FEFO (First-Expired, First-Out)
     *
     * @param int $orderId
     * @param int $productId
     * @param string $productName
     * @param float $quantityNeeded
     * @param float $fallbackPrice
     * @return array Danh sách các lô đã phân bổ
     * @throws Exception
     */
    public function allocateStock(int $orderId, int $productId, string $productName, float $quantityNeeded, float $fallbackPrice): array
    {
        // Bước 1: Query các lô hàng có tồn kho > 0 và còn hạn sử dụng, ưu tiên ngày hết hạn gần nhất
        $batches = DB::table('batches')
            ->where('product_id', $productId)
            ->where('so_luong_ton', '>', 0)
            ->whereDate('ngay_het_han', '>=', now()->toDateString())
            ->orderBy('ngay_het_han', 'asc')
            ->orderBy('ngay_thu_hoach', 'asc')
            ->lockForUpdate()
            ->get();

        // Kiểm tra tổng tồn kho khả dụng -> Quăng Exception chặn thanh toán nếu không đủ
        $totalAvailable = $batches->sum('so_luong_ton');
        if ($totalAvailable < $quantityNeeded) {
            throw new Exception("Sản phẩm '{$productName}' không đủ tồn kho khả dụng (Cần: {$quantityNeeded}, Còn: {$totalAvailable})!");
        }

        // Bước 2 & 3: Vòng lặp trừ dần từng lô và lưu chi tiết đơn hàng
        $remaining = $quantityNeeded;
        $allocatedBatches = [];

        foreach ($batches as $batch) {
            if ($remaining <= 0) {
                break;
            }

            $deduct = min((float) $batch->so_luong_ton, $remaining);

            DB::table('batches')
                ->where('id', $batch->id)
                ->decrement('so_luong_ton', $deduct);

            $unitPrice = $batch->gia_xa_hang ?? $fallbackPrice;

            DB::table('order_details')->insert([
                'order_id'   => $orderId,
                'product_id' => $productId,
                'batch_id'   => $batch->id,
                'so_luong'   => $deduct,
                'don_gia'    => $unitPrice,
            ]);

            $allocatedBatches[] = [
                'batch_id' => $batch->id,
                'ma_lo'    => $batch->ma_lo,
                'so_luong' => $deduct,
            ];

            $remaining -= $deduct;
        }

        return $allocatedBatches;
    }
}