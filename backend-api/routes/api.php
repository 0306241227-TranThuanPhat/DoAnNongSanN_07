<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Hash;

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
Route::post('/login', function (Request $request) {
    $user = DB::table('users')
        ->join('roles', 'users.role_id', '=', 'roles.id')
        ->where('users.email', $request->input('email'))
        ->select('users.*', 'roles.ma_vai_tro', 'roles.ten_vai_tro')
        ->first();

    if (!$user || !Hash::check($request->input('mat_khau'), $user->mat_khau)) {
        return response()->json(['message' => 'Email hoặc mật khẩu không chính xác!'], 401);
    }

    unset($user->mat_khau);
    return response()->json([
        'message' => 'Đăng nhập thành công!',
        'user' => $user,
    ]);
});

Route::post('/register', function (Request $request) {
    $exists = DB::table('users')->where('email', $request->input('email'))->exists();
    if ($exists) {
        return response()->json(['message' => 'Email này đã được đăng ký!'], 422);
    }

    $id = DB::table('users')->insertGetId([
        'role_id' => 1, // Mặc định vai trò Customer
        'ho_ten' => $request->input('ho_ten'),
        'email' => $request->input('email'),
        'so_dien_thoai' => $request->input('so_dien_thoai'),
        'mat_khau' => Hash::make($request->input('mat_khau')),
    ]);

    $user = DB::table('users')
        ->join('roles', 'users.role_id', '=', 'roles.id')
        ->where('users.id', $id)
        ->select('users.*', 'roles.ma_vai_tro', 'roles.ten_vai_tro')
        ->first();
    unset($user->mat_khau);

    return response()->json(['message' => 'Đăng ký thành công!', 'user' => $user]);
});

// 5. API Tổng hợp dữ liệu cho Dashboard (Admin, Sales, Farm Staff)
Route::get('/dashboard/overview', function () {
    $batches = DB::table('batches')
        ->join('products', 'batches.product_id', '=', 'products.id')
        ->select('batches.*', 'products.ten_san_pham', 'products.gia_ban_co_ban')
        ->orderBy('batches.ngay_het_han', 'asc')
        ->get();

    $orders = DB::table('orders')
        ->orderBy('ngay_tao', 'desc')
        ->get()
        ->map(function ($order) {
            $order->chi_tiet = DB::table('order_details')
                ->join('products', 'order_details.product_id', '=', 'products.id')
                ->leftJoin('batches', 'order_details.batch_id', '=', 'batches.id')
                ->where('order_details.order_id', $order->id)
                ->select('order_details.*', 'products.ten_san_pham', 'batches.ma_lo', 'batches.ngay_het_han')
                ->get();
            return $order;
        });

    $wasteRecords = DB::table('waste_records')
        ->join('batches', 'waste_records.batch_id', '=', 'batches.id')
        ->join('products', 'batches.product_id', '=', 'products.id')
        ->join('users', 'waste_records.nguoi_lap_id', '=', 'users.id')
        ->select('waste_records.*', 'batches.ma_lo', 'products.ten_san_pham', 'users.ho_ten as nguoi_lap')
        ->orderBy('waste_records.ngay_tao', 'desc')
        ->get();

    // Tính KPI tỷ lệ hao hụt toàn trang trại (Mục tiêu < 5%)
    $tongNhap = $batches->sum('so_luong_nhap');
    $tongHaoHut = $batches->sum('so_luong_hao_hut');
    $tyLeHaoHut = $tongNhap > 0 ? round(($tongHaoHut / $tongNhap) * 100, 2) : 0;

    return response()->json([
        'batches' => $batches,
        'orders' => $orders,
        'waste_records' => $wasteRecords,
        'stats' => [
            'tong_doanh_thu' => $orders->where('trang_thai', '!=', 'Đã hủy')->sum('tong_thanh_toan'),
            'tong_don_hang' => $orders->count(),
            'tong_ton_kho' => $batches->sum('so_luong_ton'),
            'ty_le_hao_hut' => $tyLeHaoHut,
        ],
    ]);
});

// 6. Farm Staff: Tạo lô thu hoạch mới & sinh mã QR (UC-04)
Route::post('/farm/batches', function (Request $request) {
    $maLo = 'LO-' . strtoupper(substr(uniqid(), -5));
    $qrToken = 'qr-' . strtolower($maLo) . '-' . time();

    $id = DB::table('batches')->insertGetId([
        'product_id' => $request->input('product_id'),
        'ma_lo' => $maLo,
        'farm_staff_id' => $request->input('farm_staff_id', 2),
        'ngay_gieo_hat' => $request->input('ngay_gieo_hat'),
        'ngay_thu_hoach' => $request->input('ngay_thu_hoach'),
        'ngay_het_han' => $request->input('ngay_het_han'),
        'so_luong_nhap' => $request->input('so_luong_nhap'),
        'so_luong_ton' => $request->input('so_luong_nhap'),
        'so_luong_hao_hut' => 0,
        'qr_code' => $qrToken,
        'trang_thai' => 'Đã thu hoạch',
    ]);

    return response()->json(['message' => "Đã tạo lô $maLo và sinh mã QR thành công!", 'id' => $id, 'qr_code' => $qrToken]);
});

// 7. Farm Staff: Thêm nhật ký canh tác cho lô (UC-04)
Route::post('/farm/farming-logs', function (Request $request) {
    DB::table('farming_logs')->insert([
        'batch_id' => $request->input('batch_id'),
        'farm_staff_id' => $request->input('farm_staff_id', 2),
        'hanh_dong' => $request->input('hanh_dong'),
        'thoi_gian' => now(),
        'ghi_chu' => $request->input('ghi_chu'),
        'hinh_anh_minh_chung' => $request->input('hinh_anh_minh_chung') ?: 'https://images.unsplash.com/photo-1591857177580-dc82b9ac4e1e?w=600',
        'da_cong_bo' => true,
    ]);

    return response()->json(['message' => 'Đã thêm nhật ký canh tác và công bố lên mã QR!']);
});

// 8. Farm Staff: Ghi nhận xuất hủy / hao hụt (UC-05, RB-11)
Route::post('/farm/waste-records', function (Request $request) {
    $soLuongHuy = (float) $request->input('so_luong');
    if ($soLuongHuy <= 0 || !$request->input('ly_do')) {
        return response()->json(['message' => 'Số lượng phải > 0 và bắt buộc nhập lý do xuất hủy!'], 422);
    }

    return DB::transaction(function () use ($request, $soLuongHuy) {
        $batch = DB::table('batches')->where('id', $request->input('batch_id'))->lockForUpdate()->first();
        if (!$batch || $batch->so_luong_ton < $soLuongHuy) {
            abort(400, 'Số lượng xuất hủy vượt quá tồn kho hiện tại của lô!');
        }

        DB::table('batches')->where('id', $batch->id)->update([
            'so_luong_ton' => $batch->so_luong_ton - $soLuongHuy,
            'so_luong_hao_hut' => $batch->so_luong_hao_hut + $soLuongHuy,
        ]);

        DB::table('waste_records')->insert([
            'batch_id' => $batch->id,
            'loai_phieu' => 'Xuất hủy',
            'so_luong' => $soLuongHuy,
            'ly_do' => $request->input('ly_do'),
            'nguoi_lap_id' => $request->input('nguoi_lap_id', 2),
        ]);

        return response()->json(['message' => "Đã lập phiếu xuất hủy {$soLuongHuy} đơn vị cho lô {$batch->ma_lo}!"]);
    });
});

// 9. Sales: Áp dụng giảm giá Flash Sale cho lô cận hạn (UC-06)
Route::post('/sales/flash-sale/{batchId}', function (Request $request, $batchId) {
    $giaXaHang = (float) $request->input('gia_xa_hang');
    DB::table('batches')->where('id', $batchId)->update([
        'gia_xa_hang' => $giaXaHang > 0 ? $giaXaHang : null,
    ]);

    return response()->json(['message' => 'Đã cập nhật giá Flash Sale xả hàng cho lô!']);
});