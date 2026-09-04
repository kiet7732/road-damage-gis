# Demo data + checklist bàn giao cuối

Ngày cập nhật: 27/08/2026

Mục tiêu:
- chốt bộ tài khoản mẫu
- chốt luồng demo mẫu
- có checklist pass/fail cuối trước khi demo hoặc bàn giao

Phạm vi:
- dùng cho team dev, test, demo nội bộ và bàn giao

---

## 1. Bộ tài khoản mẫu

### Bắt buộc cho bản hiện tại

- Admin:
  - Email: `admin.demo@roadgis.local`
  - Mật khẩu: `Admin@123`

- Reporter 1:
  - Email: `reporter1.demo@roadgis.local`
  - Mật khẩu: `Reporter@123`

- Reporter 2:
  - Email: `reporter2.demo@roadgis.local`
  - Mật khẩu: `Reporter@123`

### Bắt buộc khi bật engineer runtime

- Engineer A:
  - Email: `engineer.a.demo@roadgis.local`
  - Mật khẩu: `Engineer@123`

- Engineer B:
  - Email: `engineer.b.demo@roadgis.local`
  - Mật khẩu: `Engineer@123`

Ghi chú:
- nếu runtime engineer chưa có, không đưa 2 tài khoản này vào buổi demo chính thức

---

## 2. Bộ dữ liệu demo nên có

### Reporter / Admin

- [ ] Có ít nhất 1 report chờ xác minh
- [ ] Có ít nhất 1 report đang xử lý
- [ ] Có ít nhất 1 report đã xử lý
- [ ] Có ít nhất 1 report bị từ chối
- [ ] Có ít nhất 1 report manual review
- [ ] Có ít nhất 1 report AI bị admin sửa loại hư hỏng

### Engineer

Chỉ áp dụng khi bật engineer runtime:

- [ ] Có ít nhất 1 điểm có thể nhận kiểm tra
- [ ] Có ít nhất 1 điểm đã được phân công
- [ ] Có ít nhất 1 điểm đang kiểm tra hiện trường
- [ ] Có ít nhất 1 điểm đã khảo sát xong
- [ ] Có ít nhất 1 case 2 kỹ sư tranh cùng 1 điểm để demo cơ chế chặn

---

## 3. Bộ case demo nên ưu tiên

### Case A - Luồng chuẩn Reporter -> Admin

Mục tiêu:
- chứng minh người dân gửi phản ánh được
- admin thấy và xử lý được

Bước:

1. Reporter đăng nhập
2. Reporter chụp ảnh, lấy GPS, gửi phản ánh
3. Reporter mở history / detail
4. Admin đăng nhập web
5. Admin thấy report ở dashboard / list / map
6. Admin mở detail, sửa loại hư hỏng nếu cần, cập nhật trạng thái
7. Reporter mở lại để xem kết quả cuối

### Case B - Luồng manual review

Mục tiêu:
- chứng minh AI không xác định được vẫn không làm gãy nghiệp vụ

Bước:

1. Reporter gửi ảnh khó nhận diện
2. Report đi vào nhóm `Ảnh cần kiểm tra thêm`
3. Admin thấy đúng nhóm
4. Admin vẫn mở detail và xử lý được

### Case C - Luồng Engineer self-claim

Chỉ demo khi engineer runtime đã sẵn sàng.

Mục tiêu:
- chứng minh kỹ sư tự nhận kiểm tra được

Bước:

1. Engineer mở map công việc
2. Chọn một điểm trống
3. Bấm `Nhận kiểm tra`
4. Check-in gần hiện trường
5. Lưu hoặc gửi khảo sát
6. Admin mở lại web để xem timeline / evidence

### Case D - Luồng Admin phân công Engineer

Chỉ demo khi engineer runtime đã sẵn sàng.

Mục tiêu:
- chứng minh quản lý điều phối được kỹ sư

Bước:

1. Admin mở chi tiết phản ánh
2. Phân công kỹ sư
3. Engineer mở app và thấy việc được giao
4. Engineer check-in và khảo sát
5. Admin xem lại kết quả

---

## 4. Kịch bản demo đề xuất

### Kịch bản tối thiểu an toàn

Áp dụng khi engineer runtime chưa hoàn thành.

- [ ] Demo Reporter -> Admin
- [ ] Demo Manual review
- [ ] Không demo Engineer

### Kịch bản đầy đủ

Áp dụng khi engineer runtime đã pass UAT.

- [ ] Demo Reporter -> Admin
- [ ] Demo Manual review
- [ ] Demo Engineer self-claim
- [ ] Demo Admin assign engineer

---

## 5. Checklist pass/fail cuối trước demo

### Hạ tầng

- [ ] Backend API chạy ổn
- [ ] AI Service chạy ổn
- [ ] App Reporter chạy ổn
- [ ] Web Admin chạy ổn
- [ ] App Engineer chạy ổn hoặc đã loại khỏi phạm vi demo

### Dữ liệu

- [ ] Seed data đúng
- [ ] Có đủ case demo
- [ ] Ảnh hiển thị được
- [ ] GPS hiển thị được
- [ ] Không có dữ liệu rác dễ gây hiểu nhầm trong lúc demo

### Reporter

- [ ] Đăng nhập được
- [ ] Gửi phản ánh được
- [ ] History / detail đúng
- [ ] Wording dễ hiểu

### Admin

- [ ] Dashboard đúng
- [ ] List đúng
- [ ] Detail đúng
- [ ] Map đúng
- [ ] Manual review đúng

### Engineer

Chỉ áp dụng khi có trong phạm vi demo:

- [ ] Đăng nhập được
- [ ] Nhận kiểm tra được
- [ ] Check-in được
- [ ] Khảo sát được
- [ ] Admin thấy đồng bộ lại đúng

### Đồng bộ

- [ ] Reporter <-> Admin đồng bộ đúng
- [ ] Admin <-> Engineer đồng bộ đúng
- [ ] Reporter không thấy trạng thái nội bộ
- [ ] Nếu đang nghiệm thu gần realtime, chạy thêm:
  - [ ] `D:/DATN/Code/road-damage-gis/docs/realtime-lite-e2e-checklist.md`

---

## 6. Checklist bàn giao nội bộ / cho người nhận

### Tài liệu

- [ ] Có README chạy hệ thống
- [ ] Có hướng dẫn seed dữ liệu
- [ ] Có checklist UAT
- [ ] Có checklist nghiệm thu web admin
- [ ] Có mô tả phạm vi feature engineer

### Tài khoản

- [ ] Bàn giao danh sách tài khoản demo
- [ ] Bàn giao lưu ý vai trò từng tài khoản
- [ ] Bàn giao chính sách đổi mật khẩu nếu cần

### Giới hạn cần nói rõ

- [ ] Feature nào đã production-ready
- [ ] Feature nào đang mức demo/local-runtime
- [ ] Engineer runtime đã xong hay chưa
- [ ] Những điểm chưa nên cam kết realtime 100% nếu chưa test E2E đầy đủ

### Bằng chứng nên chuẩn bị

- [ ] Ảnh chụp luồng reporter
- [ ] Ảnh chụp web admin
- [ ] Ảnh chụp manual review
- [ ] Ảnh chụp engineer flow nếu có
- [ ] Log/script smoke hoặc E2E gần nhất

---

## 7. Quy tắc chốt PASS / FAIL

### PASS

- các luồng trong phạm vi demo đều chạy được
- không có lỗi critical
- wording và quyền hiển thị đúng vai trò
- dữ liệu đồng bộ đúng ở các màn chính

### FAIL

- không gửi được phản ánh
- admin không thấy report mới
- map / list / detail lệch dữ liệu
- reporter thấy trạng thái nội bộ
- engineer claim/check-in/survey sai nghiệp vụ
- có lỗi chặn demo mà không có phương án né hợp lý

---

## 8. Khuyến nghị chốt buổi demo / bàn giao

- Nếu engineer runtime chưa xong:
  - chốt phạm vi bàn giao hiện tại là Reporter + Admin + Manual review
  - engineer để ở roadmap mở rộng có spec và QA scripts sẵn

- Nếu engineer runtime đã xong:
  - chốt bàn giao đủ 3 role
  - chạy lại checklist UAT 3 role và full regression trước giờ demo
