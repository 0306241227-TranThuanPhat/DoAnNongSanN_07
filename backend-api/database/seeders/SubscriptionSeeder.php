<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SubscriptionSeeder extends Seeder
{
    public function run(): void
    {
        if (DB::table('subscription_plans')->count() > 0) {
            return;
        }

        DB::table('subscription_plans')->insert([
            [
                'id' => 1,
                'ten_goi' => 'Gói Rau Sạch Gia Đình (Tiêu chuẩn)',
                'mo_ta' => 'Cung cấp rau ăn lá và củ quả tươi thu hoạch trong ngày, đủ dùng cho gia đình 3-4 người mỗi đợt giao.',
                'hinh_anh' => 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600',
                'gia_moi_lan_giao' => 110000,
                'trang_thai' => 'Đang mở bán',
            ],
            [
                'id' => 2,
                'ten_goi' => 'Gói Eat Clean & Hạt Dinh Dưỡng',
                'mo_ta' => 'Kết hợp rau thủy canh VietGAP và hạt Macca Đắk Lắk chuẩn hữu cơ cho thực đơn lành mạnh.',
                'hinh_anh' => 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600',
                'gia_moi_lan_giao' => 215000,
                'trang_thai' => 'Đang mở bán',
            ],
        ]);

        DB::table('subscription_plan_items')->insert([
            ['plan_id' => 1, 'product_id' => 1, 'so_luong' => 2], // 2 túi Cải bó xôi
            ['plan_id' => 1, 'product_id' => 2, 'so_luong' => 1], // 1 túi Cà chua bi
            ['plan_id' => 2, 'product_id' => 1, 'so_luong' => 2], // 2 túi Cải bó xôi
            ['plan_id' => 2, 'product_id' => 3, 'so_luong' => 1], // 1 túi Hạt Macca
        ]);
    }
}