# UAT nghiệp vụ 3 role - Reporter / Admin / Field Engineer

Ngày cập nhật: 27/08/2026

Mục tiêu:
- kiểm thử thủ công toàn bộ luồng nghiệp vụ với 3 vai trò
- xác nhận đúng luồng, đúng wording, đúng quyền
- phát hiện sớm xung đột giữa trạng thái public và trạng thái nội bộ

Phạm vi:
- App người phản ánh
- Web Admin
- App Kỹ sư hiện trường khi runtime engineer đã bật

Lưu ý quan trọng:
- Nếu engineer runtime chưa được triển khai xong ở backend/app/web, đánh dấu các mục Engineer là `BLOCKED`, không đánh dấu `FAIL`
- Reporter chỉ được thấy trạng thái public
- Admin và Engineer có thể thấy thêm trạng thái nội bộ hiện trường

---

## 1. Điều kiện trước khi kiểm thử

- [ ] Backend API đang chạy
- [ ] AI Service đang chạy
- [ ] Web Admin mở được
- [ ] App Reporter mở được
- [ ] App Engineer mở được hoặc đã xác nhận trạng thái `BLOCKED`
- [ ] Đã seed dữ liệu demo
- [ ] Có tài khoản test đủ 3 role

Tài khoản tối thiểu:

- Reporter:
  - `reporter1.demo@roadgis.local / Reporter@123`
  - `reporter2.demo@roadgis.local / Reporter@123`
- Admin:
  - `admin.demo@roadgis.local / Admin@123`
- Engineer:
  - `engineer.a.demo@roadgis.local / Engineer@123`
  - `engineer.b.demo@roadgis.local / Engineer@123`

---

## 2. UAT cho Reporter

### 2.1 Đăng nhập và phiên làm việc

- [ ] Đăng nhập thành công
- [ ] Sai mật khẩu báo lỗi rõ ràng
- [ ] Mất mạng báo lỗi rõ ràng
- [ ] Mở lại app vẫn giữ phiên hợp lệ
- [ ] Đăng xuất xong không xem được màn hình protected

### 2.2 Gửi phản ánh mới

- [ ] Chụp ảnh trực tiếp được
- [ ] Lấy GPS được
- [ ] Sang màn xác nhận phản ánh đúng
- [ ] Preview AI hiển thị được
- [ ] Nếu AI không xác định được, vẫn vào đúng luồng xác nhận
- [ ] Chỉ khi bấm `Xác nhận gửi` mới tạo report thật
- [ ] Nếu bấm `Hủy` hoặc quay lại thì không giữ ảnh tạm không cần thiết

### 2.3 Lịch sử / chi tiết / cập nhật xử lý

- [ ] Report mới xuất hiện trong lịch sử
- [ ] Mở được chi tiết phản ánh
- [ ] Bấm ảnh xem full được
- [ ] Phóng to ảnh được
- [ ] Màn `Cập nhật xử lý` chỉ hiển thị khi có thay đổi nghiệp vụ
- [ ] Wording dễ hiểu, không còn mã kỹ thuật như `D00`, `D10`, `D20`, `D40`

### 2.4 Kiểm tra quyền hiển thị

- [ ] Reporter chỉ thấy trạng thái public:
  - [ ] Chờ xác minh
  - [ ] Đang xử lý
  - [ ] Đã xử lý
  - [ ] Từ chối
- [ ] Reporter không thấy trạng thái nội bộ:
  - [ ] Đã nhận kiểm tra
  - [ ] Đang kiểm tra hiện trường
  - [ ] Đã khảo sát xong
  - [ ] Chờ duyệt khảo sát
- [ ] Reporter không thấy tên kỹ sư phụ trách

Kết quả mong đợi:
- reporter không bị rối bởi workflow nội bộ

---

## 3. UAT cho Admin

### 3.1 Đăng nhập và phân quyền

- [ ] Đăng nhập web admin thành công
- [ ] Reporter không đăng nhập được vào web admin
- [ ] Reload trang vẫn giữ phiên đúng
- [ ] Đăng xuất xong bị chặn truy cập protected page

### 3.2 Dashboard / list / detail / map

- [ ] Dashboard lên số liệu thật
- [ ] Danh sách phản ánh đúng dữ liệu
- [ ] Chi tiết phản ánh mở bình thường
- [ ] Bản đồ GIS hiển thị marker đúng vị trí
- [ ] Không có spam request bất thường
- [ ] Không có lệch dữ liệu giữa dashboard / list / detail / map

### 3.3 Manual review

- [ ] Nhóm `Ảnh cần kiểm tra thêm` mở được
- [ ] Chỉ report `manual_review_required` vào nhóm này
- [ ] Admin vẫn mở detail và xử lý bình thường

### 3.4 Điều phối kỹ sư hiện trường

Chỉ áp dụng khi engineer runtime đã bật:

- [ ] Admin thấy block `Kỹ sư hiện trường`
- [ ] Admin thấy:
  - [ ] kỹ sư phụ trách hiện tại
  - [ ] trạng thái hiện trường
  - [ ] thời điểm nhận kiểm tra
  - [ ] hạn lock
  - [ ] check-in gần nhất
  - [ ] khoảng cách
  - [ ] accuracy
- [ ] Admin phân công kỹ sư được
- [ ] Admin đổi kỹ sư được
- [ ] Admin thu hồi phụ trách được
- [ ] Admin xem timeline kỹ sư được

### 3.5 Kiểm tra quyền hiển thị

- [ ] Admin nhìn tách bạch được:
  - [ ] trạng thái public cho người dân
  - [ ] trạng thái nội bộ hiện trường
- [ ] Map admin có lớp trạng thái nội bộ riêng
- [ ] Manual review report vẫn đi được vào engineer flow nếu đúng nghiệp vụ

Kết quả mong đợi:
- admin điều phối được mà không làm rối luồng quản lý hiện có

---

## 4. UAT cho Field Engineer

Chỉ áp dụng khi engineer runtime đã bật.

### 4.1 Đăng nhập và điều hướng

- [ ] Đăng nhập app kỹ sư thành công
- [ ] Wording thể hiện rõ vai trò `Kỹ sư hiện trường`
- [ ] Điều hướng chính rõ:
  - [ ] Trang chủ
  - [ ] Bản đồ
  - [ ] Công việc
  - [ ] Tài khoản

### 4.2 Map công việc

- [ ] Xem được điểm có thể nhận
- [ ] Xem được điểm được giao
- [ ] Xem được điểm đang kiểm tra
- [ ] Marker phân biệt được trạng thái nội bộ
- [ ] Bấm marker mở được sheet tóm tắt
- [ ] CTA chính rõ ràng:
  - [ ] Nhận kiểm tra
  - [ ] Đi đến vị trí
  - [ ] Check-in hiện trường
  - [ ] Xem chi tiết

### 4.3 Luồng nhận kiểm tra

- [ ] Kỹ sư nhận kiểm tra thành công khi điểm còn trống
- [ ] Kỹ sư khác không nhận tiếp được cùng điểm
- [ ] Điểm vẫn còn hiển thị trên map nhưng ở trạng thái đang được kiểm tra nội bộ
- [ ] Lock 1 giờ hoạt động đúng

### 4.4 Check-in hiện trường

- [ ] App hiển thị khoảng cách tới điểm
- [ ] App hiển thị accuracy GPS
- [ ] Check-in hợp lệ khi đủ gần
- [ ] Check-in cảnh báo nếu ở ngưỡng trung gian
- [ ] Không cho check-in nếu quá xa hoặc accuracy quá kém

### 4.5 Khảo sát hiện trường

- [ ] Lưu nháp được
- [ ] Gửi khảo sát được
- [ ] Tải ảnh bổ sung được
- [ ] Cập nhật được:
  - [ ] loại hư hỏng xác minh
  - [ ] mức độ
  - [ ] ưu tiên
  - [ ] ghi chú hiện trường

Kết quả mong đợi:
- kỹ sư thao tác ngoài hiện trường nhanh, rõ, không cần đi qua app reporter

---

## 5. UAT liên thông 3 role

### 5.1 Reporter -> Admin

- [ ] Reporter gửi phản ánh mới
- [ ] Admin thấy đúng report ở web
- [ ] Admin mở được detail và map

### 5.2 Admin -> Reporter

- [ ] Admin đổi trạng thái
- [ ] Reporter thấy đúng trạng thái mới
- [ ] Reporter thấy đúng loại hư hỏng cuối sau xác minh

### 5.3 Admin -> Engineer

- [ ] Admin phân công kỹ sư xong
- [ ] Engineer thấy việc được giao
- [ ] Engineer mở được chi tiết đúng report

### 5.4 Engineer -> Admin

- [ ] Engineer nhận kiểm tra xong admin thấy ngay
- [ ] Engineer check-in xong admin thấy evidence
- [ ] Engineer gửi khảo sát xong admin thấy timeline / detail cập nhật

### 5.5 Engineer -> Reporter

- [ ] Các thao tác nhận kiểm tra / check-in / khảo sát không làm reporter thấy trạng thái nội bộ
- [ ] Reporter chỉ đổi khi admin duyệt hoặc cập nhật trạng thái public phù hợp

---

## 6. UAT xung đột và ngoại lệ

- [ ] Hai kỹ sư cùng mở một điểm:
  - [ ] chỉ 1 người nhận được
  - [ ] người còn lại nhận thông báo rõ ràng
- [ ] Hết 1 giờ mà chưa check-in/chưa lưu khảo sát:
  - [ ] lock tự nhả
- [ ] Đã check-in hoặc đã lưu khảo sát:
  - [ ] lock không bị nhả sai
- [ ] Mất mạng giữa lúc thao tác:
  - [ ] có thông báo lỗi rõ
  - [ ] không ghi dữ liệu nửa chừng sai trạng thái
- [ ] Reload web admin:
  - [ ] không mất trạng thái nội bộ

---

## 7. UAT wording và hiển thị

- [ ] Reporter wording rõ, thân thiện
- [ ] Admin wording đúng nghiệp vụ quản lý
- [ ] Engineer wording đúng nghiệp vụ hiện trường
- [ ] Không lẫn cụm từ giữa 3 role
- [ ] Không còn thuật ngữ kỹ thuật khó hiểu cho người dùng cuối

Các nhãn cần kiểm tra kỹ:
- [ ] Nhận kiểm tra
- [ ] Hủy nhận kiểm tra
- [ ] Đang kiểm tra hiện trường
- [ ] Đã khảo sát xong
- [ ] Chờ duyệt khảo sát
- [ ] Phân công kỹ sư
- [ ] Thu hồi phụ trách
- [ ] Check-in hiện trường
- [ ] Khoảng cách tới vị trí hư hỏng
- [ ] Check-in hợp lệ
- [ ] Check-in có cảnh báo

---

## 8. Kết luận UAT

- [ ] Reporter: PASS
- [ ] Admin: PASS
- [ ] Engineer: PASS
- [ ] Liên thông 3 role: PASS
- [ ] Không có lỗi nghiêm trọng chặn demo / bàn giao

Ghi chú lỗi còn lại:

- Màn hình / role:
- Bước tái hiện:
- Kết quả thực tế:
- Kết quả mong đợi:
- Mức độ:
  - [ ] Critical
  - [ ] Major
  - [ ] Minor

