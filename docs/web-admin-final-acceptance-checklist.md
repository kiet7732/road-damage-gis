# Checklist nghiệm thu cuối cùng cho Web Admin

Ngày cập nhật: 23/08/2026

Mục tiêu:
Xác nhận giao diện quản lý Web Admin đang vận hành ổn định với dữ liệu thật từ backend trước khi demo hoặc bàn giao.

Phạm vi:
- Chỉ áp dụng cho vai trò quản lý/cán bộ trên Web Admin
- Không bao gồm app người phản ánh

Tài khoản kiểm tra:
- Admin: `admin.demo@roadgis.local`
- Mật khẩu: `Admin@123`

Điều kiện trước khi kiểm tra:
- Backend API đang chạy ổn định
- AI Service đang chạy ổn định
- Web Admin mở đúng cổng riêng
- Đã seed dữ liệu hoặc đã có dữ liệu thật để kiểm tra

---

## 1. Đăng nhập / phiên làm việc

- [ ] Mở đúng giao diện Web Admin
- [ ] Đăng nhập bằng tài khoản quản lý thành công
- [ ] Người dùng thường không vào được Web Admin
- [ ] Reload trang vẫn giữ đúng phiên đăng nhập
- [ ] Đăng xuất xong không truy cập lại được trang protected khi chưa đăng nhập

Kết quả mong đợi:
- Chỉ tài khoản quản lý mới vào được web admin
- Phiên đăng nhập hoạt động đúng sau reload
- Không có lỗi điều hướng sai vai trò

---

## 2. Dashboard thống kê

- [ ] Dashboard tải được dữ liệu thật từ backend
- [ ] Tổng số phản ánh hiển thị đúng
- [ ] Số lượng theo trạng thái hiển thị đúng:
  - [ ] Chờ xác minh
  - [ ] Đang xử lý
  - [ ] Đã xử lý
  - [ ] Từ chối (nếu có)
- [ ] Reload trang không làm lệch số liệu
- [ ] Không có hiện tượng gọi API lặp vô hạn

Đối chiếu:
- API: `/api/admin/dashboard`
- So sánh nhanh với danh sách phản ánh nếu cần

---

## 3. Danh sách phản ánh

- [ ] Màn hình danh sách tải được dữ liệu thật
- [ ] Hiển thị đúng:
  - [ ] Ảnh
  - [ ] Tiêu đề phản ánh
  - [ ] Loại hư hỏng
  - [ ] Tọa độ
  - [ ] Trạng thái
  - [ ] Thời gian
- [ ] Không có bản ghi bị trùng bất thường
- [ ] Phân trang hoạt động đúng
- [ ] Lọc theo trạng thái hoạt động đúng
- [ ] Lọc theo loại hư hỏng hoạt động đúng
- [ ] Tìm kiếm hoạt động đúng

Kết quả mong đợi:
- Dữ liệu list khớp với backend
- Không lệch so với detail và map

---

## 4. Chi tiết phản ánh

- [ ] Mở được chi tiết từ danh sách
- [ ] Mở được chi tiết từ bản đồ
- [ ] Thông tin chi tiết hiển thị đúng:
  - [ ] Ảnh
  - [ ] Tọa độ GPS
  - [ ] Ghi chú
  - [ ] Kết quả AI
  - [ ] Trạng thái
  - [ ] Thời gian tạo / cập nhật
- [ ] Nếu là report manual review thì detail vẫn mở bình thường

Kết quả mong đợi:
- Detail là nguồn kiểm tra chuẩn cho từng phản ánh
- Không thiếu ảnh, thiếu GPS hoặc sai trạng thái

---

## 5. Bản đồ GIS quản lý

- [ ] Marker hiển thị đúng trên bản đồ
- [ ] Marker nằm đúng vị trí thực, không đảo lat/lng
- [ ] Click marker mở đúng popup hoặc panel
- [ ] Popup/panel hiển thị đúng:
  - [ ] Loại hư hỏng
  - [ ] Trạng thái
  - [ ] Thời gian
  - [ ] Ảnh (nếu có)
- [ ] Dữ liệu marker khớp với list và detail
- [ ] Bộ lọc trên map hoạt động đúng
- [ ] Viewport stats hoạt động đúng nếu đang bật
- [ ] Fit map / hiển thị toàn bộ kết quả hoạt động đúng

Kết quả mong đợi:
- Map, list, detail cùng tham chiếu đúng một report
- Không lệch vị trí hoặc lệch thông tin

---

## 6. Nhóm “Ảnh cần kiểm tra thêm”

- [ ] Mở được màn hình/nhóm “Ảnh cần kiểm tra thêm”
- [ ] Chỉ các report có `ai_status = manual_review_required` mới vào nhóm này
- [ ] Report manual review vẫn có thể mở detail bình thường
- [ ] Ảnh manual review không bị lẫn với nhóm phản ánh thường
- [ ] Quản lý vẫn cập nhật trạng thái được cho report manual review

Kết quả mong đợi:
- Web admin phân biệt rõ report AI nhận diện thành công và report cần kiểm tra thủ công

---

## 7. Cập nhật trạng thái phản ánh

- [ ] Đổi được trạng thái từ:
  - [ ] Chờ xác minh → Đang xử lý
  - [ ] Đang xử lý → Đã xử lý
  - [ ] Chờ xác minh / Đang xử lý → Từ chối
- [ ] Sau cập nhật, detail phản ánh đúng ngay
- [ ] Sau cập nhật, list phản ánh đúng ngay
- [ ] Sau cập nhật, map phản ánh đúng ngay
- [ ] Không cần reload cứng vẫn thấy dữ liệu mới
- [ ] Không submit lặp nhiều lần khi đang loading

Kết quả mong đợi:
- Trạng thái mới đồng bộ giữa dashboard, list, detail, map

---

## 8. Chỉnh sửa loại hư hỏng

- [ ] Quản lý sửa được loại hư hỏng khi AI nhận sai
- [ ] Lưu thành công loại hư hỏng mới
- [ ] Detail hiển thị loại hư hỏng mới
- [ ] List hiển thị loại hư hỏng mới
- [ ] Map hiển thị loại hư hỏng mới nếu có dùng dữ liệu này
- [ ] Không bị lệch giữa AI gốc và kết quả cuối cùng

Kết quả mong đợi:
- Nguồn sự thật cuối cùng là kết quả sau xác minh của quản lý

---

## 9. Ổn định sau reload / điều hướng / đăng xuất

- [ ] Reload dashboard không lỗi
- [ ] Reload list không lỗi
- [ ] Reload detail không lỗi
- [ ] Reload map không lỗi
- [ ] Chuyển qua lại giữa các màn hình không mất state bất thường
- [ ] Đăng xuất xong không truy cập được API protected từ giao diện

---

## 10. Quan sát lỗi kỹ thuật / request bất thường

- [ ] Không có spam request lặp liên tục
- [ ] Không có lỗi “Không thể kết nối máy chủ” khi backend vẫn trả 200
- [ ] Không có loop gọi dashboard/list/map ngoài ý muốn
- [ ] Không có mismatch dữ liệu giữa các màn hình

Nếu phát hiện lỗi, ghi lại:
- Màn hình:
- Hành động vừa thực hiện:
- API liên quan:
- Kết quả thực tế:
- Kết quả mong đợi:

---

## Kết luận nghiệm thu

- [ ] Đạt: Web Admin sẵn sàng để demo bằng dữ liệu thật
- [ ] Cần sửa thêm trước demo

Ghi chú cuối:
- Nếu toàn bộ các mục quan trọng ở trên đều đạt, có thể dùng checklist này làm bước nghiệm thu cuối trước buổi demo.
