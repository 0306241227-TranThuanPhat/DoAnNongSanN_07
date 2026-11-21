<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Batch;
use App\Models\Order;
use App\Models\OrderItemBatch;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    // Sales bấm xác nhận đơn -> Tự động trừ kho theo nguyên tắc FEFO (UC-01)
    public function confirmOrder($id)
    {
        $order = Order::with('items.product')->findOrFail($id);

        if ($order->status !== 'pending') {
            return response()->json(['message' => 'Đơn hàng không ở trạng thái chờ duyệt.'], 400);
        }

        try {
            DB::transaction(function () use ($order) {
                foreach ($order->items as $item) {
                    $needed = $item->quantity;

                    // 1. Lấy các lô còn tồn > 0 và CHƯA quá hạn (expiry_date >= hôm nay)
                    // Sắp xếp ưu tiên: Hết hạn trước -> Thu hoạch trước, đồng thời khóa dòng (lockForUpdate)
                    $batches = Batch::where('product_id', $item->product_id)
                        ->where('current_qty', '>', 0)
                        ->whereDate('expiry_date', '>=', now()->toDateString())
                        ->orderBy('expiry_date', 'asc')
                        ->orderBy('harvest_date', 'asc')
                        ->lockForUpdate()
                        ->get();

                    // 2. Kiểm tra tổng tồn khả dụng (Luồng ngoại lệ 3a)
                    if ($batches->sum('current_qty') < $needed) {
                        throw new \Exception("Thiếu hàng cho sản phẩm: {$item->product->name}");
                    }

                    // 3. Duyệt từng lô để trừ kho (Hỗ trợ tách trừ nhiều lô - Luồng 4a)
                    foreach ($batches as $batch) {
                        if ($needed <= 0) break;

                        $deduct = min($batch->current_qty, $needed);
                        $batch->decrement('current_qty', $deduct);

                        // Ghi vết liên kết dòng đơn - lô để phục vụ truy xuất & báo cáo
                        OrderItemBatch::create([
                            'order_item_id' => $item->id,
                            'batch_id'      => $batch->id,
                            'deducted_qty'  => $deduct,
                        ]);

                        $needed -= $deduct;
                    }
                }

                $order->update(['status' => 'confirmed']);
            }, 3); // Thử lại tối đa 3 lần nếu gặp deadlock (Luồng 4b)

            return response()->json([
                'message' => 'Duyệt đơn và trừ kho FEFO thành công!',
                'order'   => $order->load('items.batchAllocations.batch')
            ]);

        } catch (\Exception $e) {
            // Chuyển trạng thái đơn sang Thiếu hàng để Sales liên hệ khách
            $order->update(['status' => 'out_of_stock']);
            return response()->json([
                'message' => $e->getMessage(),
                'status'  => 'out_of_stock'
            ], 422);
        }
    }
}