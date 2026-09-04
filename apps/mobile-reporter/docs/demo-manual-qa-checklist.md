# Checklist Manual QA trước buổi demo - Road Damage GIS

Checklist này dùng để test tay nhanh trước khi demo với hội đồng.

## 1. Chuẩn bị hệ thống

- [ ] Backend API đang chạy
- [ ] AI Service đang chạy
- [ ] Đã seed demo data
- [ ] Web Admin mở được
- [ ] Mobile App mở được
- [ ] Có tài khoản:
  - [ ] `admin.demo@roadgis.local / Admin@123`
  - [ ] `reporter1.demo@roadgis.local / Reporter@123`

## 2. Reporter gửi report mới

- [ ] Reporter đăng nhập mobile thành công
- [ ] Mở màn hình chụp ảnh
- [ ] Chụp ảnh mới từ camera
- [ ] Lấy được GPS
- [ ] Preview AI chạy được
- [ ] Gửi report thành công

## 3. Reporter kiểm tra ngay sau khi gửi

- [ ] Report xuất hiện trong History
- [ ] Mở được Detail
- [ ] Status ban đầu hiển thị đúng: `Chờ xác minh`
- [ ] Title trên mobile hiển thị hợp lý
- [ ] Type trên mobile hiển thị hợp lý

## 4. Admin sửa loại hư hỏng

- [ ] Admin đăng nhập web thành công
- [ ] Mở được Dashboard
- [ ] Tìm thấy report vừa gửi trong Report List
- [ ] Tìm thấy report trên bản đồ GIS
- [ ] Mở được trang Detail của report
- [ ] Sửa `corrected_damage_type`
- [ ] Lưu thành công
- [ ] Cập nhật status xử lý thành công

## 5. Reporter mở lại để đối chiếu

- [ ] Quay lại mobile
- [ ] Refresh lại History
- [ ] Mở đúng report vừa được admin sửa
- [ ] History hiển thị đúng `type` sau khi admin sửa
- [ ] History hiển thị đúng `title` theo loại cuối
- [ ] Detail hiển thị đúng `type` sau khi admin sửa
- [ ] Detail hiển thị đúng `title` theo loại cuối
- [ ] Detail hiển thị đúng `status` mới

## 6. Bằng chứng nên chụp trước demo

- [ ] 1 ảnh mobile khi reporter gửi report xong
- [ ] 1 ảnh web admin khi sửa type/status
- [ ] 1 ảnh mobile History sau khi admin sửa
- [ ] 1 ảnh mobile Detail sau khi admin sửa

## 7. Kết luận trước khi lên demo

- [ ] Luồng Reporter hoạt động ổn
- [ ] Luồng Admin hoạt động ổn
- [ ] Đồng bộ dữ liệu 2 vai trò hoạt động ổn
- [ ] Title / Type / Status hiển thị đúng trên mobile
- [ ] Có đủ ảnh bằng chứng nếu hội đồng hỏi
