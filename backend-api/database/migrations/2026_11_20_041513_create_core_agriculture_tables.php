<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Xóa bảng users mặc định của Laravel để tạo lại đúng chuẩn từ điển dữ liệu
        Schema::dropIfExists('users');

        // NHÓM 1: NGƯỜI DÙNG VÀ PHÂN QUYỀN
        Schema::create('roles', function (Blueprint $table) {
            $table->tinyIncrements('id');
            $table->string('ma_vai_tro', 20)->unique('uq_roles_ma');
            $table->string('ten_vai_tro', 50);
            $table->string('mo_ta', 255)->nullable();
        });

        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->unsignedTinyInteger('role_id');
            $table->string('ho_ten', 100);
            $table->string('email', 150)->unique('uq_users_email');
            $table->string('so_dien_thoai', 15)->nullable()->unique('uq_users_so_dien_thoai');
            $table->string('mat_khau', 255);
            $table->unsignedInteger('diem_tich_luy')->default(0);
            $table->string('trang_thai', 15)->default('Hoạt động');
            $table->timestamp('ngay_tao')->useCurrent();
            $table->timestamp('ngay_cap_nhat')->nullable()->useCurrentOnUpdate();

            $table->foreign('role_id')->references('id')->on('roles')->restrictOnDelete();
        });

        Schema::create('addresses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->string('ten_nguoi_nhan', 100);
            $table->string('so_dien_thoai', 15);
            $table->string('dia_chi_chi_tiet', 255);
            $table->string('phuong_xa', 100)->nullable();
            $table->string('quan_huyen', 100);
            $table->string('tinh_thanh', 100);
            $table->decimal('vi_do', 9, 6)->nullable();
            $table->decimal('kinh_do', 9, 6)->nullable();
            $table->boolean('la_mac_dinh')->default(false);
            $table->timestamp('ngay_tao')->useCurrent();
            $table->timestamp('ngay_cap_nhat')->nullable()->useCurrentOnUpdate();
        });

        // NHÓM 2: SẢN PHẨM VÀ CHỨNG NHẬN
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('ten_danh_muc', 100)->unique();
            $table->string('slug', 120)->unique();
            $table->text('mo_ta')->nullable();
            $table->timestamp('ngay_tao')->useCurrent();
            $table->timestamp('ngay_cap_nhat')->nullable()->useCurrentOnUpdate();
        });

        Schema::create('certifications', function (Blueprint $table) {
            $table->tinyIncrements('id');
            $table->string('ma_chung_nhan', 20)->unique();
            $table->string('ten_chung_nhan', 50);
            $table->string('mo_ta', 255)->nullable();
        });

        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained('categories')->restrictOnDelete();
            $table->string('ma_sku', 30)->unique('uq_products_ma_sku');
            $table->string('ten_san_pham', 150)->index('idx_products_ten');
            $table->string('slug', 170)->unique('uq_products_slug');
            $table->text('mo_ta')->nullable();
            $table->string('hinh_anh_dai_dien', 500)->nullable();
            $table->decimal('gia_ban_co_ban', 12, 0)->index('idx_products_gia');
            $table->string('don_vi_tinh', 20)->default('kg');
            $table->string('trang_thai', 15)->default('Đang bán');
            $table->timestamp('ngay_tao')->useCurrent();
            $table->timestamp('ngay_cap_nhat')->nullable()->useCurrentOnUpdate();
        });

        Schema::create('product_certifications', function (Blueprint $table) {
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->unsignedTinyInteger('certification_id');
            $table->primary(['product_id', 'certification_id']);
            $table->foreign('certification_id')->references('id')->on('certifications')->restrictOnDelete();
        });

        // NHÓM 3: LÔ HÀNG VÀ TRUY XUẤT NGUỒN GỐC
        Schema::create('batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->string('ma_lo', 30)->unique('uq_batches_ma_lo');
            $table->foreignId('farm_staff_id')->constrained('users')->restrictOnDelete();
            $table->date('ngay_gieo_hat')->nullable();
            $table->date('ngay_thu_hoach')->nullable();
            $table->date('ngay_het_han')->nullable()->index('idx_batches_ngay_het_han');
            $table->decimal('so_luong_nhap', 10, 2)->default(0);
            $table->decimal('so_luong_ton', 10, 2)->default(0);
            $table->decimal('so_luong_hao_hut', 10, 2)->default(0);
            $table->decimal('gia_xa_hang', 12, 0)->nullable();
            $table->string('qr_code', 255)->nullable()->unique('uq_batches_qr_code');
            $table->string('trang_thai', 20)->default('Đang canh tác');
            $table->timestamp('ngay_tao')->useCurrent();
            $table->timestamp('ngay_cap_nhat')->nullable()->useCurrentOnUpdate();

            $table->index(['product_id', 'ngay_het_han', 'ngay_thu_hoach'], 'idx_batches_fefo');
        });

        Schema::create('batch_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('batch_id')->constrained('batches')->restrictOnDelete();
            $table->unsignedTinyInteger('certification_id')->nullable();
            $table->string('ten_giay_to', 150);
            $table->string('so_giay_to', 80)->nullable();
            $table->string('file_url', 500);
            $table->date('ngay_cap')->nullable();
            $table->foreignId('farm_staff_id')->constrained('users')->restrictOnDelete();
            $table->timestamp('ngay_tao')->useCurrent();

            $table->foreign('certification_id')->references('id')->on('certifications')->restrictOnDelete();
        });

        Schema::create('farming_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('batch_id')->constrained('batches')->restrictOnDelete();
            $table->foreignId('farm_staff_id')->constrained('users')->restrictOnDelete();
            $table->string('hanh_dong', 30);
            $table->dateTime('thoi_gian');
            $table->text('ghi_chu')->nullable();
            $table->string('hinh_anh_minh_chung', 500);
            $table->boolean('da_cong_bo')->default(false);
            $table->timestamp('ngay_tao')->useCurrent();
            $table->timestamp('ngay_cap_nhat')->nullable()->useCurrentOnUpdate();

            $table->index(['batch_id', 'thoi_gian'], 'idx_farming_logs_batch_thoigian');
        });

        Schema::create('waste_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('batch_id')->constrained('batches')->restrictOnDelete();
            $table->string('loai_phieu', 15)->default('Xuất hủy');
            $table->foreignId('phieu_goc_id')->nullable()->constrained('waste_records')->restrictOnDelete();
            $table->decimal('so_luong', 10, 2);
            $table->string('ly_do', 255);
            $table->string('hinh_anh_minh_chung', 500)->nullable();
            $table->foreignId('nguoi_lap_id')->constrained('users')->restrictOnDelete();
            $table->timestamp('ngay_tao')->useCurrent()->index('idx_waste_records_ngaytao');
        });

        Schema::create('expiry_alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('batch_id')->constrained('batches')->restrictOnDelete();
            $table->string('trang_thai', 15)->default('Đang mở');
            $table->unsignedBigInteger('batch_dang_mo')
                  ->storedAs("IF(trang_thai='Đang mở', batch_id, NULL)")
                  ->nullable()
                  ->unique('uq_expiry_alerts_open');
            $table->foreignId('sales_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->decimal('gia_xa_hang_ap_dung', 12, 0)->nullable();
            $table->boolean('da_chuyen_admin')->default(false);
            $table->dateTime('thoi_gian_xu_ly')->nullable();
            $table->timestamp('ngay_tao')->useCurrent();
            $table->timestamp('ngay_cap_nhat')->nullable()->useCurrentOnUpdate();

            $table->index(['trang_thai', 'ngay_tao'], 'idx_expiry_alerts_trangthai_ngaytao');
        });

        // NHÓM 4 & 5: ĐƠN HÀNG, THANH TOÁN, GÓI ĐỊNH KỲ
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('ma_don_hang', 30)->unique('uq_orders_ma_don_hang');
            $table->foreignId('user_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->string('loai_don', 10)->default('Thường');
            $table->foreignId('don_goc_id')->nullable()->constrained('orders')->restrictOnDelete();
            $table->string('ten_nguoi_nhan', 100);
            $table->string('so_dien_thoai_nhan', 15);
            $table->string('dia_chi_giao', 500);
            $table->string('khung_gio_nhan', 30)->nullable();
            $table->boolean('la_hoa_toc')->default(false);
            $table->string('trang_thai', 20)->default('Chờ duyệt');
            $table->decimal('tong_tien_hang', 12, 0)->default(0);
            $table->decimal('phi_van_chuyen', 12, 0)->default(0);
            $table->unsignedInteger('diem_su_dung')->default(0);
            $table->decimal('giam_gia_diem', 12, 0)->default(0);
            $table->decimal('tong_thanh_toan', 12, 0)->default(0);
            $table->dateTime('thoi_gian_giao')->nullable();
            $table->string('ghi_chu', 255)->nullable();
            $table->timestamp('ngay_tao')->useCurrent();
            $table->timestamp('ngay_cap_nhat')->nullable()->useCurrentOnUpdate();

            $table->index(['trang_thai', 'ngay_tao'], 'idx_orders_trangthai_ngaytao');
        });

        Schema::create('order_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->restrictOnDelete();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->foreignId('batch_id')->nullable()->constrained('batches')->restrictOnDelete();
            $table->decimal('so_luong', 10, 2);
            $table->decimal('don_gia', 12, 0);

            $table->unique(['order_id', 'product_id', 'batch_id'], 'uq_order_details_dong');
        });

        Schema::create('subscription_plans', function (Blueprint $table) {
            $table->id();
            $table->string('ten_goi', 150);
            $table->text('mo_ta')->nullable();
            $table->string('hinh_anh', 500)->nullable();
            $table->decimal('gia_moi_lan_giao', 12, 0);
            $table->string('trang_thai', 15)->default('Đang mở bán');
            $table->timestamp('ngay_tao')->useCurrent();
            $table->timestamp('ngay_cap_nhat')->nullable()->useCurrentOnUpdate();
        });

        Schema::create('subscription_plan_items', function (Blueprint $table) {
            $table->foreignId('plan_id')->constrained('subscription_plans')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->decimal('so_luong', 10, 2);
            $table->primary(['plan_id', 'product_id']);
        });

        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('plan_id')->constrained('subscription_plans')->restrictOnDelete();
            $table->foreignId('address_id')->constrained('addresses')->restrictOnDelete();
            $table->string('khung_gio_nhan', 30);
            $table->date('ngay_bat_dau');
            $table->date('ngay_ket_thuc');
            $table->decimal('tong_tien', 12, 0);
            $table->string('trang_thai', 20)->default('Chờ thanh toán');
            $table->timestamp('ngay_tao')->useCurrent();
            $table->timestamp('ngay_cap_nhat')->nullable()->useCurrentOnUpdate();

            $table->index(['trang_thai', 'ngay_ket_thuc'], 'idx_subscriptions_trangthai_ketthuc');
        });

        Schema::create('delivery_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subscription_id')->constrained('subscriptions')->restrictOnDelete();
            $table->foreignId('order_id')->nullable()->unique('uq_delivery_order')->constrained('orders')->restrictOnDelete();
            $table->date('ngay_giao')->index('idx_delivery_ngay_giao');
            $table->timestamp('ngay_tao')->useCurrent();

            $table->unique(['subscription_id', 'ngay_giao'], 'uq_delivery_sub_ngay');
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->nullable()->constrained('orders')->restrictOnDelete();
            $table->foreignId('subscription_id')->nullable()->constrained('subscriptions')->restrictOnDelete();
            $table->string('loai_giao_dich', 10)->default('Thanh toán');
            $table->string('phuong_thuc', 10);
            $table->decimal('so_tien', 12, 0);
            $table->string('trang_thai', 15)->default('Chờ thanh toán');
            $table->string('ma_giao_dich_cong', 100)->nullable()->unique('uq_payments_ma_giao_dich');
            $table->dateTime('han_thanh_toan')->nullable();
            $table->dateTime('thoi_gian_thanh_toan')->nullable();
            $table->string('ghi_chu', 255)->nullable();
            $table->timestamp('ngay_tao')->useCurrent();

            $table->index(['trang_thai', 'han_thanh_toan'], 'idx_payments_trangthai_han');
        });

        Schema::create('loyalty_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('order_id')->nullable()->constrained('orders')->restrictOnDelete();
            $table->integer('so_diem');
            $table->string('ghi_chu', 255)->nullable();
            $table->timestamp('ngay_tao')->useCurrent();

            $table->index(['user_id', 'ngay_tao'], 'idx_loyalty_user_ngaytao');
        });

        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->unsignedTinyInteger('so_sao');
            $table->text('binh_luan')->nullable();
            $table->timestamp('ngay_tao')->useCurrent();

            $table->unique(['user_id', 'product_id'], 'uq_reviews_user_product');
        });

        // NHÓM 6: KHIẾU NẠI VÀ ĐỔI TRẢ
        Schema::create('complaints', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->unique('uq_complaints_order')->constrained('orders')->restrictOnDelete();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->string('ly_do', 255);
            $table->text('mo_ta')->nullable();
            $table->string('trang_thai', 30)->default('Chờ xử lý');
            $table->string('ly_do_tu_choi', 255)->nullable();
            $table->foreignId('sales_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->foreignId('don_bu_id')->nullable()->constrained('orders')->restrictOnDelete();
            $table->dateTime('thoi_gian_xu_ly')->nullable();
            $table->timestamp('ngay_tao')->useCurrent();
            $table->timestamp('ngay_cap_nhat')->nullable()->useCurrentOnUpdate();

            $table->index(['trang_thai', 'ngay_tao'], 'idx_complaints_trangthai_ngaytao');
        });

        Schema::create('complaint_items', function (Blueprint $table) {
            $table->foreignId('complaint_id')->constrained('complaints')->cascadeOnDelete();
            $table->foreignId('order_detail_id')->constrained('order_details')->restrictOnDelete();
            $table->primary(['complaint_id', 'order_detail_id']);
        });

        Schema::create('complaint_media', function (Blueprint $table) {
            $table->id();
            $table->foreignId('complaint_id')->constrained('complaints')->cascadeOnDelete();
            $table->string('loai_tep', 10);
            $table->string('file_url', 500);
            $table->unsignedInteger('dung_luong_kb')->nullable();
            $table->timestamp('ngay_tao')->useCurrent();
        });

        // NHÓM 7: CẤU HÌNH VÀ NHẬT KÝ HỆ THỐNG
        Schema::create('system_settings', function (Blueprint $table) {
            $table->string('khoa', 60)->primary();
            $table->string('gia_tri', 255);
            $table->string('mo_ta', 255)->nullable();
            $table->foreignId('nguoi_cap_nhat_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('ngay_cap_nhat')->nullable()->useCurrentOnUpdate();
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->string('bang_tac_dong', 60);
            $table->string('ban_ghi_id', 60);
            $table->string('hanh_dong', 10);
            $table->json('du_lieu_cu')->nullable();
            $table->json('du_lieu_moi')->nullable();
            $table->string('dia_chi_ip', 45)->nullable();
            $table->timestamp('ngay_tao')->useCurrent()->index();

            $table->index(['bang_tac_dong', 'ban_ghi_id'], 'idx_audit_doi_tuong');
        });
    }

    public function down(): void
    {
        $tables = [
            'audit_logs', 'system_settings', 'complaint_media', 'complaint_items',
            'complaints', 'reviews', 'loyalty_transactions', 'payments',
            'delivery_schedules', 'subscriptions', 'subscription_plan_items',
            'subscription_plans', 'order_details', 'orders', 'expiry_alerts',
            'waste_records', 'farming_logs', 'batch_documents', 'batches',
            'product_certifications', 'products', 'certifications', 'categories',
            'addresses', 'users', 'roles'
        ];
        foreach ($tables as $table) {
            Schema::dropIfExists($table);
        }
    }
};