# Demo Script 5-7 phút - Road Damage GIS

Tài liệu này là kịch bản demo ngắn, mạch lạc, tránh thao tác ngẫu hứng khi báo cáo.

## Mục tiêu demo

Chứng minh 3 ý chính:

1. Người dân có thể gửi phản ánh có ảnh + GPS
2. AI hỗ trợ nhận dạng hư hỏng ban đầu
3. Cán bộ quản lý xác minh, chỉnh sửa và cập nhật trạng thái xử lý trên GIS

## Chuẩn bị trước khi demo

- Backend API đang chạy
- AI Service đang chạy
- Đã chạy seed demo
- Dữ liệu seed dùng prefix `[seed-demo]`, dữ liệu smoke test tự động dùng prefix `[e2e-smoke]`
- Có sẵn tài khoản:
  - admin.demo@roadgis.local / Admin@123
  - reporter1.demo@roadgis.local / Reporter@123

## Case nên dùng

### Case tạo mới

- Reporter đăng nhập và gửi một báo cáo mới

### Case sửa kết quả AI

- Dùng report seed `seed-report-005`
- Đây là case AI ban đầu là `D00`, sau đó admin sửa thành `D20`

## Kịch bản trình bày

### Bước 1 - Giới thiệu hệ thống (30-45 giây)

Nói ngắn:

> Hệ thống gồm Mobile App cho người phản ánh, Web Admin cho cán bộ quản lý, Backend API và AI Service nhận dạng hư hỏng mặt đường, có tích hợp GIS để hiển thị vị trí trên bản đồ.

### Bước 2 - Reporter đăng nhập (20-30 giây)

- Mở mobile app
- Đăng nhập bằng:
  - `reporter1.demo@roadgis.local`
  - `Reporter@123`

Nói ngắn:

> Đây là vai trò người phản ánh, có thể chụp ảnh và gửi báo cáo hư hỏng mặt đường.

### Bước 3 - Reporter chụp ảnh / preview AI / gửi báo cáo (60-90 giây)

- Mở màn hình gửi phản ánh
- Chụp ảnh
- Lấy GPS
- Xem preview AI
- Nhấn gửi

Điểm cần nói:

> AI hỗ trợ nhận dạng ban đầu trước khi báo cáo được gửi lên hệ thống.

### Bước 4 - Reporter xem history/detail (30-45 giây)

- Mở history
- Mở chi tiết báo cáo vừa gửi

Điểm cần nói:

> Sau khi gửi, báo cáo xuất hiện ngay trong lịch sử và ở trạng thái chờ xác minh.

### Bước 5 - Admin đăng nhập web (20-30 giây)

- Mở web admin
- Đăng nhập bằng:
  - `admin.demo@roadgis.local`
  - `Admin@123`

Điểm cần nói:

> Đây là vai trò cán bộ quản lý, dùng để xác minh và điều phối xử lý.

### Bước 6 - Admin xem dashboard + list + map (45-60 giây)

- Mở dashboard
- Mở danh sách báo cáo
- Mở bản đồ GIS
- Chỉ đúng báo cáo vừa gửi xuất hiện trên map/list

Điểm cần nói:

> Dữ liệu phản ánh từ mobile được đồng bộ sang dashboard, danh sách và bản đồ GIS để hỗ trợ theo dõi trực quan.

### Bước 7 - Admin sửa loại hư hỏng (45-60 giây)

Có 2 cách:

- Cách A: sửa report vừa gửi
- Cách B: mở report `seed-report-005` để demo case AI nhận sai

Khuyên dùng:

- Dùng `seed-report-005` vì đây là case đã chuẩn bị sẵn để trình bày rõ “AI hỗ trợ, con người xác minh”

Điểm cần nói:

> AI không quyết định hoàn toàn. Nếu AI nhận sai, cán bộ có thể xác minh lại và sửa loại hư hỏng.

### Bước 8 - Admin cập nhật trạng thái xử lý (30-45 giây)

- Đổi trạng thái sang `Đang xử lý` hoặc `Đã sửa chữa`
- Lưu lại

Điểm cần nói:

> Sau khi xác minh, cán bộ cập nhật trạng thái xử lý để hệ thống phản ánh tiến độ thực tế.

### Bước 9 - Reporter xem lại kết quả cuối (45-60 giây)

- Quay lại mobile
- Mở history/detail
- Cho thấy:
  - status mới
  - loại lỗi cuối cùng sau xác minh

Điểm cần nói:

> Phía người phản ánh cũng nhìn thấy kết quả cuối sau khi cán bộ xác minh và cập nhật xử lý.

## Câu chốt demo

> Như vậy, hệ thống không chỉ nhận phản ánh mà còn tích hợp AI và GIS để hỗ trợ phân loại ban đầu, hiển thị vị trí trên bản đồ và đồng bộ quy trình xác minh - xử lý giữa người dân và cơ quan quản lý.

## Thời lượng tổng

- Bước 1: 0.5 phút
- Bước 2-4: 2 phút
- Bước 5-8: 2.5 phút
- Bước 9 + kết luận: 1 phút

Tổng: khoảng 6 phút
