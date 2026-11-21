<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. 4 Vai trò hệ thống
        DB::table('roles')->insert([
            ['id' => 1, 'ma_vai_tro' => 'customer', 'ten_vai_tro' => 'Khách hàng', 'mo_ta' => 'Mua hàng, đặt gói định kỳ, khiếu nại'],
            ['id' => 2, 'ma_vai_tro' => 'farm_staff', 'ten_vai_tro' => 'Nhân viên nông trại', 'mo_ta' => 'Cập nhật nhật ký, sinh QR, xuất hủy'],
            ['id' => 3, 'ma_vai_tro' => 'sales', 'ten_vai_tro' => 'Nhân viên bán hàng', 'mo_ta' => 'Duyệt đơn FEFO, xử lý khiếu nại, xả hàng'],
            ['id' => 4, 'ma_vai_tro' => 'admin', 'ten_vai_tro' => 'Quản trị viên', 'mo_ta' => 'Toàn quyền quản trị và thống kê'],
        ]);

        // 2. Tài khoản mẫu cho 4 vai trò (Mật khẩu chung: 123456)
        $pw = Hash::make('123456');
        DB::table('users')->insert([
            ['id' => 1, 'role_id' => 4, 'ho_ten' => 'Trần Thuận Phát (Admin)', 'email' => 'admin@nongsansach.vn', 'so_dien_thoai' => '0901000001', 'mat_khau' => $pw, 'diem_tich_luy' => 0],
            ['id' => 2, 'role_id' => 2, 'ho_ten' => 'Trần Văn Hậu (Farm Staff)', 'email' => 'farm@nongsansach.vn', 'so_dien_thoai' => '0901000002', 'mat_khau' => $pw, 'diem_tich_luy' => 0],
            ['id' => 3, 'role_id' => 3, 'ho_ten' => 'Nguyễn Hoàng Phúc (Sales)', 'email' => 'sales@nongsansach.vn', 'so_dien_thoai' => '0901000003', 'mat_khau' => $pw, 'diem_tich_luy' => 0],
            ['id' => 4, 'role_id' => 1, 'ho_ten' => 'Lương Gia Bảo (Khách hàng)', 'email' => 'khach@gmail.com', 'so_dien_thoai' => '0901000004', 'mat_khau' => $pw, 'diem_tich_luy' => 150],
        ]);

        // 3. Danh mục & Chứng nhận
        DB::table('categories')->insert([
            ['id' => 1, 'ten_danh_muc' => 'Rau ăn lá hữu cơ', 'slug' => 'rau-an-la-huu-co', 'mo_ta' => 'Thu hoạch trong ngày tại nông trại'],
            ['id' => 2, 'ten_danh_muc' => 'Củ quả & Đặc sản', 'slug' => 'cu-qua-dac-san', 'mo_ta' => 'Nông sản sạch đạt chuẩn kiểm định'],
        ]);

        DB::table('certifications')->insert([
            ['id' => 1, 'ma_chung_nhan' => 'VIETGAP', 'ten_chung_nhan' => 'VietGAP', 'mo_ta' => 'Thực hành sản xuất nông nghiệp tốt Việt Nam'],
            ['id' => 2, 'ma_chung_nhan' => 'USDA', 'ten_chung_nhan' => 'USDA Organic', 'mo_ta' => 'Chứng nhận hữu cơ Bộ Nông nghiệp Hoa Kỳ'],
        ]);

        // 4. Sản phẩm
        DB::table('products')->insert([
            [
                'id' => 1, 'category_id' => 1, 'ma_sku' => 'RAU-001',
                'ten_san_pham' => 'Cải Bó Xôi Hữu Cơ Đà Lạt', 'slug' => 'cai-bo-xoi-huu-co',
                'mo_ta' => 'Canh tác nhà kính khép kín, không thuốc bảo vệ thực vật.',
                'hinh_anh_dai_dien' => 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600',
                'gia_ban_co_ban' => 35000, 'don_vi_tinh' => '500g', 'trang_thai' => 'Đang bán'
            ],
            [
                'id' => 2, 'category_id' => 2, 'ma_sku' => 'CUQ-002',
                'ten_san_pham' => 'Cà Chua Bi Đỏ Thủy Canh', 'slug' => 'ca-chua-bi-do-thuy-canh',
                'mo_ta' => 'Ngọt thanh tự nhiên, hái chín cây mỗi sáng.',
                'hinh_anh_dai_dien' => 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600',
                'gia_ban_co_ban' => 42000, 'don_vi_tinh' => '500g', 'trang_thai' => 'Đang bán'
            ],
            [
                'id' => 3, 'category_id' => 2, 'ma_sku' => 'DAC-003',
                'ten_san_pham' => 'Hạt Macca Đắk Lắk Sấy Nứt Vỏ', 'slug' => 'hat-macca-dak-lak',
                'mo_ta' => 'Thu hoạch tại vườn Đắk Lắk, sấy lạnh giữ nguyên dinh dưỡng.',
                'hinh_anh_dai_dien' => 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=600',
                'gia_ban_co_ban' => 145000, 'don_vi_tinh' => '500g', 'trang_thai' => 'Đang bán'
            ],
        ]);

        DB::table('product_certifications')->insert([
            ['product_id' => 1, 'certification_id' => 1],
            ['product_id' => 2, 'certification_id' => 1],
            ['product_id' => 3, 'certification_id' => 2],
        ]);

        // 5. Lô hàng (2 lô cho Cải Bó Xôi để test FEFO + 1 lô Macca)
        DB::table('batches')->insert([
            [
                'id' => 1, 'product_id' => 1, 'ma_lo' => 'LO-CBX-01', 'farm_staff_id' => 2,
                'ngay_gieo_hat' => now()->subDays(28)->toDateString(),
                'ngay_thu_hoach' => now()->subDays(1)->toDateString(),
                'ngay_het_han' => now()->addDays(2)->toDateString(), // Cận hạn (ưu tiên xuất FEFO trước)
                'so_luong_nhap' => 50, 'so_luong_ton' => 15, 'so_luong_hao_hut' => 2,
                'gia_xa_hang' => 25000, 'qr_code' => 'lot-rau-2026', 'trang_thai' => 'Đã thu hoạch'
            ],
            [
                'id' => 2, 'product_id' => 1, 'ma_lo' => 'LO-CBX-02', 'farm_staff_id' => 2,
                'ngay_gieo_hat' => now()->subDays(25)->toDateString(),
                'ngay_thu_hoach' => now()->toDateString(),
                'ngay_het_han' => now()->addDays(5)->toDateString(), // Hạn xa hơn (xuất sau)
                'so_luong_nhap' => 60, 'so_luong_ton' => 60, 'so_luong_hao_hut' => 0,
                'gia_xa_hang' => null, 'qr_code' => 'lot-rau-moi-2026', 'trang_thai' => 'Đã thu hoạch'
            ],
            [
                'id' => 3, 'product_id' => 3, 'ma_lo' => 'LO-MAC-01', 'farm_staff_id' => 2,
                'ngay_gieo_hat' => now()->subMonths(6)->toDateString(),
                'ngay_thu_hoach' => now()->subDays(5)->toDateString(),
                'ngay_het_han' => now()->addMonths(6)->toDateString(),
                'so_luong_nhap' => 100, 'so_luong_ton' => 85, 'so_luong_hao_hut' => 0,
                'gia_xa_hang' => null, 'qr_code' => 'lot-macca-2026', 'trang_thai' => 'Đã thu hoạch'
            ],
        ]);

        // 6. Nhật ký canh tác & Giấy kiểm định cho lô QR mẫu
        DB::table('farming_logs')->insert([
            [
                'batch_id' => 1, 'farm_staff_id' => 2, 'hanh_dong' => 'Gieo hạt giống F1',
                'thoi_gian' => now()->subDays(28),
                'ghi_chu' => 'Gieo hạt trên giá thể xơ dừa đã xử lý vi sinh tại nhà kính Khu A2.',
                'hinh_anh_minh_chung' => 'https://images.unsplash.com/photo-1591857177580-dc82b9ac4e1e?w=600',
                'da_cong_bo' => true
            ],
            [
                'batch_id' => 1, 'farm_staff_id' => 2, 'hanh_dong' => 'Bón phân hữu cơ vi sinh',
                'thoi_gian' => now()->subDays(14),
                'ghi_chu' => 'Bổ sung phân trùn quế ủ hoai, tưới nhỏ giọt tự động 2 lần/ngày.',
                'hinh_anh_minh_chung' => 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=600',
                'da_cong_bo' => true
            ],
            [
                'batch_id' => 1, 'farm_staff_id' => 2, 'hanh_dong' => 'Thu hoạch & Đóng gói tem QR',
                'thoi_gian' => now()->subDays(1),
                'ghi_chu' => 'Thu hoạch lúc 5h30 sáng, làm mát sơ bộ ở 8°C và dán tem truy xuất.',
                'hinh_anh_minh_chung' => 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600',
                'da_cong_bo' => true
            ],
        ]);

        DB::table('batch_documents')->insert([
            [
                'batch_id' => 1, 'certification_id' => 1,
                'ten_giay_to' => 'Phiếu kiểm nghiệm dư lượng thuốc BVTV & Nitrat',
                'so_giay_to' => 'KN-2026-089',
                'file_url' => 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600',
                'ngay_cap' => now()->subDays(2)->toDateString(), 'farm_staff_id' => 2
            ]
        ]);

        // 7. Cấu hình hệ thống mặc định (Bảng system_settings)
        DB::table('system_settings')->insert([
            ['khoa' => 'nguong_canh_bao_can_han', 'gia_tri' => '2', 'mo_ta' => 'Số ngày trước hạn sử dụng để cảnh báo Sales', 'nguoi_cap_nhat_id' => 1],
            ['khoa' => 'gio_chot_don_dinh_ky', 'gia_tri' => '18:00', 'mo_ta' => 'Giờ Scheduler chốt đơn định kỳ ngày kế tiếp', 'nguoi_cap_nhat_id' => 1],
            ['khoa' => 'thoi_han_khieu_nai_gio', 'gia_tri' => '24', 'mo_ta' => 'Thời hạn cho phép khiếu nại sau khi giao (giờ)', 'nguoi_cap_nhat_id' => 1],
            ['khoa' => 'thoi_han_xu_ly_thieu_hang_phut', 'gia_tri' => '30', 'mo_ta' => 'Thời hạn Sales xử lý đơn thiếu hàng (phút)', 'nguoi_cap_nhat_id' => 1],
        ]);
    }
}