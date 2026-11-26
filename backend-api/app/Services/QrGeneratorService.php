<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Exception;

class QrGeneratorService
{
    /**
     * Tạo/Lấy thông tin mã QR truy xuất nguồn gốc theo ID lô hàng
     */
    public function generateForBatch(int $batchId, string $frontendBaseUrl = 'http://localhost:5173'): array
    {
        $batch = DB::table('batches')
            ->join('products', 'batches.product_id', '=', 'products.id')
            ->where('batches.id', $batchId)
            ->select('batches.*', 'products.ten_san_pham')
            ->first();

        if (!$batch) {
            throw new Exception("Không tìm thấy lô hàng với ID #{$batchId}!");
        }

        $qrToken = $batch->qr_code;
        if (empty($qrToken)) {
            $qrToken = 'qr-' . strtolower($batch->ma_lo) . '-' . time();
            DB::table('batches')->where('id', $batchId)->update(['qr_code' => $qrToken]);
        }

        $traceUrl = rtrim($frontendBaseUrl, '/') . "/trace/{$qrToken}";
        $qrImageUrl = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" . urlencode($traceUrl);

        return [
            'batch_id'     => $batch->id,
            'ma_lo'        => $batch->ma_lo,
            'ten_san_pham' => $batch->ten_san_pham,
            'qr_token'     => $qrToken,
            'trace_url'    => $traceUrl,
            'qr_image_url' => $qrImageUrl,
        ];
    }
}