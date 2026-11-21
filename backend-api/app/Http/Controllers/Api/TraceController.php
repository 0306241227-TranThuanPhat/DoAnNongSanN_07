<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Batch;
use Illuminate\Support\Str;

class TraceController extends Controller
{
    // Farm Staff sinh mã QR sau khi lô đã thu hoạch (UC-04)
    public function generateQr($batchId)
    {
        $batch = Batch::with('farmingLogs')->findOrFail($batchId);

        if ($batch->status !== 'harvested' || $batch->farmingLogs->isEmpty()) {
            return response()->json([
                'message' => 'Chỉ được sinh mã QR khi lô đã thu hoạch và có nhật ký canh tác.'
            ], 422);
        }

        // Nếu đã có mã QR thì trả lại mã cũ, tránh làm vô hiệu tem đã in (Luồng 7b)
        if (!$batch->qr_token) {
            $batch->update(['qr_token' => Str::uuid()->toString()]);
            // Khóa không cho xóa nhật ký đã công bố
            $batch->farmingLogs()->update(['is_locked' => true]);
        }

        return response()->json([
            'qr_token'  => $batch->qr_token,
            'trace_url' => url("/trace/{$batch->qr_token}")
        ]);
    }

    // Khách hàng / Guest quét mã QR xem thông tin công khai (Tải < 2 giây)
    public function show($qrToken)
    {
        $batch = Batch::with([
            'product:id,name,certification,image_url',
            'farmingLogs' => fn($q) => $q->orderBy('activity_date', 'asc')
        ])->where('qr_token', $qrToken)->firstOrFail();

        return response()->json($batch);
    }
}