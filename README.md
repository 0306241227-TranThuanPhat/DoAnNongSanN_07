#  SINGLE FARM — Hệ Thống Quản Trị Nông Trại & Thương Mại Điện Tử Nông Sản Sạch

Hệ thống web quản lý vận hành chuỗi cung ứng nông sản khép kín theo mô hình **Single Farm (Từ nông trại đến bàn ăn)**. Dự án giải quyết bài toán tồn kho nông sản tươi sống thông qua nguyên tắc xuất kho **FEFO (First-Expired, First-Out)**, minh bạch quy trình canh tác bằng **mã QR truy xuất nguồn gốc theo từng lô**, kết hợp kênh bán lẻ và **gói rau củ định kỳ 30 ngày**.

---

## Công Nghệ Sử Dụng

* **Backend API:** Laravel 11 (PHP 8.2+), RESTful API, Laravel Task Scheduler
* **Cơ sở dữ liệu:** SQLite / MySQL
* **Frontend Web:** React (Vite), Tailwind CSS, Axios, Lucide React Icons
* **Tích hợp & Tiện ích:** Sinh mã QR truy xuất động, giả lập cổng thanh toán VNPay / MoMo Sandbox, lưu trữ chứng từ kiểm định chất lượng (`storage:link`)

---

## Tính Năng Nổi Bật Theo Phân Hệ

### 1. Khách Hàng (Customer — UC-01, UC-02, UC-03)
* **Gian hàng & Chi tiết nông sản:** Hiển thị giá bán thực tế (tự động cập nhật giá Flash Sale nếu có lô cận hạn), tổng tồn kho khả dụng còn hạn sử dụng, chứng nhận chất lượng (VietGAP, USDA Organic...) và thông tin lô ưu tiên xuất kho.
* **Mua lẻ & Gói định kỳ 30 ngày:**
  * Hỗ trợ đặt đơn lẻ và tự động phân bổ lô hàng theo nguyên tắc **FEFO** (`ngay_het_han` gần nhất xuất trước).
  * Đăng ký gói rau củ định kỳ 1 tháng theo các thứ tùy chọn trong tuần; hệ thống tự động sinh lịch giao (`delivery_schedules`) và các đơn hàng con tương ứng.
* **Thanh toán Sandbox:** Tích hợp cổng thanh toán giả lập **VNPay** và **MoMo**, tự động ghi nhận lịch sử giao dịch vào bảng `payments`.
* **Cổng Khách Hàng & Khiếu nại 24h:** Theo dõi trạng thái đơn hàng, xác nhận nhận hàng và gửi yêu cầu khiếu nại kèm hình ảnh minh chứng trong vòng **24 giờ** kể từ lúc giao.

### 2. Nhân Viên Nông Trại (Farm Staff — UC-04, UC-05)
* **Quản lý danh mục & sản phẩm:** Thêm mới nông sản, chỉnh sửa thông tin/giá bán và chuyển trạng thái **Đang bán / Ngừng bán** (ẩn khỏi gian hàng mà vẫn bảo toàn toàn vẹn dữ liệu lịch sử lô và đơn hàng).
* **Quản lý lô thu hoạch & In tem QR:** Tạo lô thu hoạch mới, tự động sinh mã QR duy nhất cho từng lô và tải ảnh tem PNG để dán lên bao bì.
* **Nhật ký canh tác & Giấy kiểm định:** Cập nhật nhật ký chăm sóc/thu hoạch lên Timeline công khai của mã QR; tải lên phiếu xét nghiệm/giấy kiểm định chất lượng (PDF, JPG, PNG) gắn trực tiếp vào lô.
* **Ghi nhận xuất hủy / hao hụt:** Lập phiếu xuất hủy bắt buộc kèm lý do, tự động trừ tồn kho lô và cập nhật tỷ lệ hao hụt toàn trang trại.

### 3. Nhân Viên Kinh Doanh (Sales — UC-03, UC-06)
* **Xử lý lô cận hạn (Flash Sale):** Tự động cảnh báo các lô hàng có hạn sử dụng $\le 2$ ngày và kích hoạt giảm giá xả hàng 30% chỉ với 1 thao tác.
* **Duyệt khiếu nại khách hàng:** Xem minh chứng và xử lý theo 3 hướng:
  * **Hoàn tiền:** Tự động tạo giao dịch hoàn tiền trên hệ thống.
  * **Giao bù:** Tự động tạo đơn giao bù (`0đ`) và trừ tồn kho lô mới theo chuẩn FEFO.
  * **Từ chối:** Cập nhật trạng thái kèm lý do phản hồi.

### 4. Quản Trị Viên & Tự Động Hóa (Admin & Scheduler)
* **Dashboard thống kê KPI:** Giám sát tổng doanh thu, tổng đơn hàng, tổng tồn kho khả dụng và **tỷ lệ hao hụt toàn hệ thống** (mục tiêu kiểm soát $< 5\%$).
* **Đối soát & Truy vết:** Theo dõi nhật ký phiếu xuất hủy và lịch sử giao dịch thanh toán/hoàn tiền (`payments`).
* **Tác vụ tự động 18:00 (`farm:daily-tasks`):** Tự động phân bổ lô hàng FEFO cho các đơn giao định kỳ của ngày hôm sau và rà soát hạn sử dụng lô hàng.

---

##  Cấu Trúc Thư Mục

```text
DoAnNongSanN_07/
├── backend-api/                # Mã nguồn Laravel 11 API
│   ├── app/Console/Commands/   # Lệnh chạy Scheduler tự động (farm:daily-tasks)
│   ├── database/               # Migrations, Seeders & database.sqlite
│   ├── routes/api.php          # Định nghĩa toàn bộ RESTful API
│   └── storage/app/public/     # Lưu trữ tệp giấy kiểm định chất lượng
└── frontend-web/               # Mã nguồn React + Vite
    └── src/
        ├── components/         # Modal chi tiết sản phẩm, cổng thanh toán...
        └── pages/              # Trang chủ, Dashboard vận hành, Cổng khách hàng, Trang quét QR

Hướng Dẫn Cài Đặt & Chạy Dự Án
ở thư mục backend
cd thư mục dự án 
cd backend-api
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan storage:link
php artisan serve

thư mục frontend
cd frontend-web
npm install
npm run dev
