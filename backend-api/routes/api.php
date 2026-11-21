<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Artisan;

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

// 4. Đăng nhập & Đăng ký
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
        ->orderBy('id', 'desc')
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

// 10. Lấy danh sách gói rau củ định kỳ (UC-02)
Route::get('/subscription-plans', function () {
    $plans = DB::table('subscription_plans')
        ->where('trang_thai', 'Đang mở bán')
        ->get()
        ->map(function ($plan) {
            $plan->san_pham = DB::table('subscription_plan_items')
                ->join('products', 'subscription_plan_items.product_id', '=', 'products.id')
                ->where('subscription_plan_items.plan_id', $plan->id)
                ->select('products.id', 'products.ten_san_pham', 'products.don_vi_tinh', 'subscription_plan_items.so_luong')
                ->get();
            return $plan;
        });

    return response()->json($plans);
});

// 11. Đăng ký gói định kỳ 1 tháng & tự động sinh lịch giao + đơn con (UC-02)
Route::post('/subscriptions', function (Request $request) {
    $userId = $request->input('user_id');
    if (!$userId) {
        return response()->json(['message' => 'Vui lòng đăng nhập để đăng ký gói định kỳ!'], 401);
    }

    return DB::transaction(function () use ($request, $userId) {
        $plan = DB::table('subscription_plans')->where('id', $request->input('plan_id'))->first();
        $planItems = DB::table('subscription_plan_items')
            ->join('products', 'subscription_plan_items.product_id', '=', 'products.id')
            ->where('plan_id', $plan->id)
            ->select('subscription_plan_items.*', 'products.gia_ban_co_ban')
            ->get();

        // Lưu địa chỉ giao hàng cố định của gói (RB: mỗi gói 1 địa chỉ)
        $addressId = DB::table('addresses')->insertGetId([
            'user_id' => $userId,
            'ten_nguoi_nhan' => $request->input('ten_nguoi_nhan'),
            'so_dien_thoai' => $request->input('so_dien_thoai'),
            'dia_chi_chi_tiet' => $request->input('dia_chi_chi_tiet'),
            'quan_huyen' => $request->input('quan_huyen', 'Quận 1'),
            'tinh_thanh' => 'TP. Hồ Chí Minh',
            'la_mac_dinh' => true,
        ]);

        // Tính các ngày giao trong 30 ngày tới theo thứ đã chọn (VD: [2, 5] là Thứ 3 & Thứ 6)
        $selectedDays = $request->input('days_of_week', [2, 5]); // Carbon: 2 = Tuesday, 5 = Friday
        $ngayBatDau = now()->addDay();
        $ngayKetThuc = now()->addDays(30);
        $deliveryDates = [];

        for ($date = $ngayBatDau->copy(); $date->lte($ngayKetThuc); $date->addDay()) {
            if (in_array($date->dayOfWeek, $selectedDays)) {
                $deliveryDates[] = $date->toDateString();
            }
        }

        $soDotGiao = count($deliveryDates);
        $tongTien = $plan->gia_moi_lan_giao * $soDotGiao;

        // Tạo bản ghi Subscription "Đang hoạt động"
        $subId = DB::table('subscriptions')->insertGetId([
            'user_id' => $userId,
            'plan_id' => $plan->id,
            'address_id' => $addressId,
            'khung_gio_nhan' => $request->input('khung_gio_nhan', '08:00 - 10:00'),
            'ngay_bat_dau' => $ngayBatDau->toDateString(),
            'ngay_ket_thuc' => $ngayKetThuc->toDateString(),
            'tong_tien' => $tongTien,
            'trang_thai' => 'Đang hoạt động',
        ]);

        // Ghi nhận giao dịch thanh toán trước toàn bộ gói (RB-13 & RB-15)
        DB::table('payments')->insert([
            'subscription_id' => $subId,
            'loai_giao_dich' => 'Thanh toán',
            'phuong_thuc' => $request->input('phuong_thuc', 'VNPay'),
            'so_tien' => $tongTien,
            'trang_thai' => 'Thành công',
            'ma_giao_dich_cong' => 'SUB-' . time(),
            'thoi_gian_thanh_toan' => now(),
        ]);

        // Tự động sinh lịch giao (delivery_schedules) và đơn con (loai_don = 'Con')
        foreach ($deliveryDates as $idx => $ngayGiao) {
            $childOrderId = DB::table('orders')->insertGetId([
                'ma_don_hang' => 'DH-SUB' . $subId . '-' . ($idx + 1),
                'user_id' => $userId,
                'loai_don' => 'Con',
                'ten_nguoi_nhan' => $request->input('ten_nguoi_nhan'),
                'so_dien_thoai_nhan' => $request->input('so_dien_thoai'),
                'dia_chi_giao' => $request->input('dia_chi_chi_tiet') . ', ' . $request->input('quan_huyen', 'Quận 1') . ', TP.HCM',
                'khung_gio_nhan' => $request->input('khung_gio_nhan', '08:00 - 10:00'),
                'trang_thai' => 'Chờ giao',
                'tong_tien_hang' => $plan->gia_moi_lan_giao,
                'phi_van_chuyen' => 0,
                'tong_thanh_toan' => $plan->gia_moi_lan_giao,
                'ghi_chu' => "Đơn tự động đợt " . ($idx + 1) . " từ gói #{$subId}",
            ]);

            foreach ($planItems as $item) {
                DB::table('order_details')->insert([
                    'order_id' => $childOrderId,
                    'product_id' => $item->product_id,
                    'batch_id' => null, // Sẽ được Scheduler 18:00 phân bổ FEFO trước ngày giao
                    'so_luong' => $item->so_luong,
                    'don_gia' => $item->gia_ban_co_ban,
                ]);
            }

            DB::table('delivery_schedules')->insert([
                'subscription_id' => $subId,
                'order_id' => $childOrderId,
                'ngay_giao' => $ngayGiao,
            ]);
        }

        return response()->json([
            'message' => "Đăng ký thành công! Hệ thống đã tự động lên lịch {$soDotGiao} đợt giao hàng trong 30 ngày.",
        ]);
    });
});

// 12. Khách hàng: Lấy danh sách đơn hàng, gói định kỳ và khiếu nại cá nhân
Route::get('/my-orders/{userId}', function ($userId) {
    $orders = DB::table('orders')
        ->where('user_id', $userId)
        ->orderBy('id', 'desc')
        ->get()
        ->map(function ($order) {
            $order->chi_tiet = DB::table('order_details')
                ->join('products', 'order_details.product_id', '=', 'products.id')
                ->leftJoin('batches', 'order_details.batch_id', '=', 'batches.id')
                ->where('order_details.order_id', $order->id)
                ->select('order_details.*', 'products.ten_san_pham', 'batches.ma_lo')
                ->get();
            $order->khieu_nai = DB::table('complaints')->where('order_id', $order->id)->first();
            return $order;
        });

    $subscriptions = DB::table('subscriptions')
        ->join('subscription_plans', 'subscriptions.plan_id', '=', 'subscription_plans.id')
        ->where('subscriptions.user_id', $userId)
        ->select('subscriptions.*', 'subscription_plans.ten_goi')
        ->orderBy('subscriptions.ngay_tao', 'desc')
        ->get();

    return response()->json([
        'orders' => $orders,
        'subscriptions' => $subscriptions,
    ]);
});

// 13. Giả lập xác nhận "Đã giao hàng" để kích hoạt mốc tính 24 giờ khiếu nại (UC-03)
Route::post('/orders/{id}/mark-delivered', function ($id) {
    DB::table('orders')->where('id', $id)->update([
        'trang_thai' => 'Đã giao',
        'thoi_gian_giao' => now(),
    ]);
    return response()->json(['message' => 'Đơn hàng đã chuyển sang trạng thái Đã giao (Bắt đầu tính mốc 24h khiếu nại).']);
});

// 14. Khách hàng: Gửi khiếu nại kèm ảnh minh chứng trong vòng 24 giờ (UC-03, RB-06, RB-07)
Route::post('/complaints', function (Request $request) {
    $orderId = $request->input('order_id');
    $order = DB::table('orders')->where('id', $orderId)->first();

    if (!$order || $order->trang_thai !== 'Đã giao') {
        return response()->json(['message' => 'Chỉ được khiếu nại đơn hàng ở trạng thái Đã giao!'], 422);
    }

    // Kiểm tra thời hạn 24 giờ (RB-07)
    if ($order->thoi_gian_giao && now()->diffInHours($order->thoi_gian_giao) > 24) {
        return response()->json(['message' => 'Đã quá thời hạn 24 giờ kể từ lúc nhận hàng!'], 422);
    }

    // Kiểm tra mỗi đơn chỉ khiếu nại 1 lần (RB-06)
    if (DB::table('complaints')->where('order_id', $orderId)->exists()) {
        return response()->json(['message' => 'Đơn hàng này đã được gửi khiếu nại trước đó!'], 422);
    }

    $fileUrl = $request->input('file_url');
    if (!$fileUrl) {
        return response()->json(['message' => 'Bắt buộc đính kèm hình ảnh hoặc video minh chứng!'], 422);
    }

    return DB::transaction(function () use ($request, $order, $fileUrl) {
        $complaintId = DB::table('complaints')->insertGetId([
            'order_id' => $order->id,
            'user_id' => $order->user_id,
            'ly_do' => $request->input('ly_do'),
            'mo_ta' => $request->input('mo_ta'),
            'trang_thai' => 'Chờ xử lý',
        ]);

        // Gắn toàn bộ dòng chi tiết đơn vào khiếu nại để truy vết lô lỗi
        $details = DB::table('order_details')->where('order_id', $order->id)->get();
        foreach ($details as $dt) {
            DB::table('complaint_items')->insert([
                'complaint_id' => $complaintId,
                'order_detail_id' => $dt->id,
            ]);
        }

        DB::table('complaint_media')->insert([
            'complaint_id' => $complaintId,
            'loai_tep' => 'Ảnh',
            'file_url' => $fileUrl,
        ]);

        return response()->json(['message' => 'Đã gửi khiếu nại thành công! Nhân viên Sales sẽ phản hồi sớm.']);
    });
});

// 15. Sales: Lấy danh sách & duyệt khiếu nại (Hoàn tiền hoặc Giao bù FEFO - UC-03)
Route::get('/sales/complaints', function () {
    return DB::table('complaints')
        ->join('orders', 'complaints.order_id', '=', 'orders.id')
        ->join('users', 'complaints.user_id', '=', 'users.id')
        ->select('complaints.*', 'orders.ma_don_hang', 'orders.tong_thanh_toan', 'users.ho_ten as ten_khach')
        ->orderBy('complaints.ngay_tao', 'desc')
        ->get()
        ->map(function ($c) {
            $c->media = DB::table('complaint_media')->where('complaint_id', $c->id)->get();
            return $c;
        });
});

Route::post('/sales/complaints/{id}/resolve', function (Request $request, $id) {
    $action = $request->input('action'); // 'Hoàn tiền' | 'Giao bù' | 'Từ chối'
    $complaint = DB::table('complaints')->where('id', $id)->first();
    $order = DB::table('orders')->where('id', $complaint->order_id)->first();

    return DB::transaction(function () use ($request, $action, $complaint, $order) {
        if ($action === 'Hoàn tiền') {
            DB::table('payments')->insert([
                'order_id' => $order->id,
                'loai_giao_dich' => 'Hoàn tiền',
                'phuong_thuc' => 'Sandbox',
                'so_tien' => $order->tong_thanh_toan,
                'trang_thai' => 'Thành công',
                'ghi_chu' => "Hoàn tiền cho khiếu nại #{$complaint->id}",
            ]);

            DB::table('complaints')->where('id', $complaint->id)->update([
                'trang_thai' => 'Đã duyệt - Hoàn tiền',
                'sales_id' => $request->input('sales_id', 3),
                'thoi_gian_xu_ly' => now(),
            ]);

            return response()->json(['message' => 'Đã duyệt Hoàn tiền cho khách hàng!']);
        }

        if ($action === 'Giao bù') {
            // Tạo đơn giao bù (loai_don = 'Bù') và tự động trừ kho FEFO
            $donBuId = DB::table('orders')->insertGetId([
                'ma_don_hang' => 'DH-BU-' . now()->format('His'),
                'user_id' => $order->user_id,
                'loai_don' => 'Bù',
                'don_goc_id' => $order->id,
                'ten_nguoi_nhan' => $order->ten_nguoi_nhan,
                'so_dien_thoai_nhan' => $order->so_dien_thoai_nhan,
                'dia_chi_giao' => $order->dia_chi_giao,
                'trang_thai' => 'Đã xác nhận',
                'tong_tien_hang' => 0,
                'phi_van_chuyen' => 0,
                'tong_thanh_toan' => 0,
                'ghi_chu' => "Đơn giao bù từ khiếu nại #{$complaint->id}",
            ]);

            $oldItems = DB::table('order_details')->where('order_id', $order->id)->get();
            foreach ($oldItems as $item) {
                $conCan = $item->so_luong;
                $batches = DB::table('batches')
                    ->where('product_id', $item->product_id)
                    ->where('so_luong_ton', '>', 0)
                    ->whereDate('ngay_het_han', '>=', now()->toDateString())
                    ->orderBy('ngay_het_han', 'asc')
                    ->lockForUpdate()
                    ->get();

                if ($batches->sum('so_luong_ton') < $conCan) {
                    abort(400, 'Kho không đủ hàng để tạo đơn giao bù, vui lòng chọn Hoàn tiền!');
                }

                foreach ($batches as $batch) {
                    if ($conCan <= 0) break;
                    $tru = min($batch->so_luong_ton, $conCan);
                    DB::table('batches')->where('id', $batch->id)->decrement('so_luong_ton', $tru);
                    DB::table('order_details')->insert([
                        'order_id' => $donBuId,
                        'product_id' => $item->product_id,
                        'batch_id' => $batch->id,
                        'so_luong' => $tru,
                        'don_gia' => 0,
                    ]);
                    $conCan -= $tru;
                }
            }

            DB::table('complaints')->where('id', $complaint->id)->update([
                'trang_thai' => 'Đã duyệt - Giao bù',
                'sales_id' => $request->input('sales_id', 3),
                'don_bu_id' => $donBuId,
                'thoi_gian_xu_ly' => now(),
            ]);

            return response()->json(['message' => 'Đã duyệt Giao bù và tự động trừ kho FEFO cho đơn bù!']);
        }

        DB::table('complaints')->where('id', $complaint->id)->update([
            'trang_thai' => 'Từ chối',
            'ly_do_tu_choi' => $request->input('ly_do_tu_choi', 'Minh chứng chưa đủ cơ sở'),
            'sales_id' => $request->input('sales_id', 3),
            'thoi_gian_xu_ly' => now(),
        ]);

        return response()->json(['message' => 'Đã từ chối khiếu nại kèm lý do.']);
    });
});

// 16. Kích hoạt chạy thử Scheduler 18:00 ngay lập tức để demo (UC-02 & UC-06)
// 16. Kích hoạt chạy thử Scheduler 18:00 ngay lập tức để demo (UC-02 & UC-06)
Route::post('/scheduler/run-now', function () {
    $tomorrow = now()->addDay()->toDateString();

    // Kiểm tra xem đã có đơn 'Chờ giao' nào đúng lịch ngày mai chưa
    $hasOrderTomorrow = DB::table('delivery_schedules')
        ->join('orders', 'delivery_schedules.order_id', '=', 'orders.id')
        ->where('orders.trang_thai', 'Chờ giao')
        ->whereDate('delivery_schedules.ngay_giao', $tomorrow)
        ->exists();

    if (!$hasOrderTomorrow) {
        $nextSchedule = DB::table('delivery_schedules')
            ->join('orders', 'delivery_schedules.order_id', '=', 'orders.id')
            ->where('orders.trang_thai', 'Chờ giao')
            ->orderBy('delivery_schedules.id', 'asc')
            ->select('delivery_schedules.id', 'delivery_schedules.subscription_id')
            ->first();

        if ($nextSchedule) {
            // Dời lịch của đợt đã chạy trước đó (nếu cùng gói & trùng ngày mai) để tránh lỗi uq_delivery_sub_ngay
            DB::table('delivery_schedules')
                ->where('subscription_id', $nextSchedule->subscription_id)
                ->whereDate('ngay_giao', $tomorrow)
                ->update(['ngay_giao' => DB::raw('DATE_SUB(ngay_giao, INTERVAL id DAY)')]);

            DB::table('delivery_schedules')
                ->where('id', $nextSchedule->id)
                ->update(['ngay_giao' => $tomorrow]);
        }
    }

    Artisan::call('farm:daily-tasks');

    return response()->json([
        'message' => trim(Artisan::output()),
    ]);
});