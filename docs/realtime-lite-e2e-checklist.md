# Checklist E2E gần realtime cho 3 vai trò

Ngày cập nhật: 29/08/2026

Mục tiêu:
- xác nhận hệ thống đã đồng bộ gần realtime ở mức đủ dùng cho đồ án
- kiểm tra luồng chính giữa Reporter, Web Admin và Field Engineer
- phát hiện sớm tình huống dữ liệu lệch, refetch lặp, hoặc stream ngắt nhưng UI không fallback

Phạm vi:
- App người phản ánh
- Web Admin
- App kỹ sư hiện trường khi engineer runtime đã bật

Không nằm trong phạm vi checklist này:
- chat realtime
- push notification ngoài app
- realtime cho camera, login, register
- refetch toàn bộ map cho mọi event

---

## 1. Điều kiện PASS trước khi bắt đầu

Chỉ bắt đầu checklist này khi các điều kiện dưới đây đều đạt.

- [ ] Backend API đang chạy ổn định
- [ ] AI Service đang chạy ổn định
- [ ] Reporter app mở được
- [ ] Web Admin mở được
- [ ] Engineer app mở được hoặc đã xác nhận `BLOCKED`
- [ ] Seed data đã sẵn sàng
- [ ] Có tài khoản đủ 3 vai trò
- [ ] Nếu hệ thống công bố có realtime: stream SSE đã bật và client đã subscribe thành công

Tài khoản chuẩn:

- Reporter:
  - `reporter1.demo@roadgis.local / Reporter@123`
  - `reporter2.demo@roadgis.local / Reporter@123`
- Admin:
  - `admin.demo@roadgis.local / Admin@123`
- Engineer:
  - `engineer.a.demo@roadgis.local / Engineer@123`
  - `engineer.b.demo@roadgis.local / Engineer@123`

Quy tắc đánh giá:

- Nếu engineer runtime chưa bật: đánh dấu toàn bộ mục engineer là `BLOCKED`
- Nếu SSE chưa bật thật ở backend/client: đánh dấu mục realtime là `BLOCKED`, không đánh dấu `FAIL`
- Nếu dữ liệu vẫn đồng bộ nhờ refresh cũ nhưng không tự cập nhật: chỉ được tính là `PASS fallback`, không được tính là `PASS realtime`

---

## 2. Kết quả mong đợi tối thiểu của realtime-lite

- [ ] Không cần F5 ở các luồng chính trên web admin
- [ ] Reporter không cần thoát rồi vào lại app mới thấy trạng thái mới
- [ ] Engineer không cần reload thủ công mới thấy việc được giao
- [ ] Khi stream lỗi hoặc ngắt:
  - [ ] web không crash
  - [ ] mobile không crash
  - [ ] fallback cũ vẫn dùng được

---

## 3. Case E2E-RT-01 — Reporter gửi phản ánh mới, Admin thấy gần realtime

Mục tiêu:
- kiểm tra event tạo report mới
- kiểm tra dashboard, list và manual review của web admin cập nhật gần realtime

Bước test:

1. Reporter đăng nhập app
2. Reporter chụp ảnh và gửi một phản ánh mới
3. Giữ Web Admin đang mở sẵn ở:
   - Dashboard
   - Danh sách phản ánh
   - hoặc Ảnh cần kiểm tra thêm
4. Quan sát trong thời gian ngắn sau khi reporter gửi

Cần kiểm tra:

- [ ] Dashboard tăng số liệu đúng
- [ ] Danh sách phản ánh xuất hiện đúng 1 bản ghi mới
- [ ] Nếu ảnh vào manual review thì report đi đúng nhóm `Ảnh cần kiểm tra thêm`
- [ ] Không cần F5
- [ ] Không có spam request bất thường
- [ ] Không có nhấp nháy UI khó chịu

Kết quả:

- [ ] PASS realtime
- [ ] PASS fallback
- [ ] BLOCKED
- [ ] FAIL

---

## 4. Case E2E-RT-02 — Admin phân công kỹ sư, Engineer thấy việc gần realtime

Chỉ áp dụng khi engineer runtime đã bật.

Mục tiêu:
- kiểm tra event phân công kỹ sư
- kiểm tra app kỹ sư nhận việc không cần vào lại app

Bước test:

1. Admin mở detail của report cần xử lý
2. Admin phân công cho `engineer.a.demo@roadgis.local`
3. Giữ app kỹ sư đang mở ở màn danh sách công việc
4. Quan sát danh sách trong thời gian ngắn

Cần kiểm tra:

- [ ] Công việc mới xuất hiện đúng cho kỹ sư được phân công
- [ ] Kỹ sư khác không thấy nhầm việc
- [ ] Không cần kill app hoặc đăng nhập lại
- [ ] Nếu stream lỗi, kéo refresh vẫn thấy được việc

Kết quả:

- [ ] PASS realtime
- [ ] PASS fallback
- [ ] BLOCKED
- [ ] FAIL

---

## 5. Case E2E-RT-03 — Engineer cập nhật khảo sát, Admin thấy gần realtime

Chỉ áp dụng khi engineer runtime đã bật.

Mục tiêu:
- kiểm tra event kỹ sư check-in / survey
- kiểm tra web admin thấy thay đổi nội bộ mà không cần F5

Bước test:

1. Engineer mở công việc được giao
2. Engineer check-in hiện trường
3. Engineer cập nhật khảo sát
4. Giữ Web Admin đang mở sẵn:
   - detail đúng report
   - danh sách phản ánh
   - nếu có timeline kỹ sư thì mở timeline

Cần kiểm tra:

- [ ] Admin thấy trạng thái hiện trường đổi đúng
- [ ] Timeline kỹ sư cập nhật đúng
- [ ] Detail đúng report cập nhật mà không cần reload toàn trang
- [ ] Không có request lặp vô hạn

Kết quả:

- [ ] PASS realtime
- [ ] PASS fallback
- [ ] BLOCKED
- [ ] FAIL

---

## 6. Case E2E-RT-04 — Admin đổi trạng thái, Reporter thấy gần realtime

Mục tiêu:
- kiểm tra event `report_status_updated`
- kiểm tra reporter thấy thay đổi đúng ở history/detail/cập nhật xử lý

Bước test:

1. Admin mở report vừa tạo hoặc report đang xử lý
2. Admin đổi một trong các trạng thái:
   - Chờ xác minh -> Đang xử lý
   - Đang xử lý -> Đã xử lý
   - hoặc Từ chối
3. Giữ app reporter đang mở ở:
   - Lịch sử phản ánh
   - Chi tiết phản ánh
   - Cập nhật xử lý

Cần kiểm tra:

- [ ] Reporter thấy badge trạng thái mới
- [ ] Màn `Cập nhật xử lý` chỉ hiển thị thay đổi nghiệp vụ thật
- [ ] Không cần vào lại app mới thấy
- [ ] Không lộ trạng thái nội bộ kỹ sư cho reporter

Kết quả:

- [ ] PASS realtime
- [ ] PASS fallback
- [ ] BLOCKED
- [ ] FAIL

---

## 7. Case E2E-RT-05 — Admin sửa loại hư hỏng, Reporter thấy kết quả cuối

Mục tiêu:
- kiểm tra event `report_damage_type_updated`
- xác nhận reporter luôn thấy loại hư hỏng cuối, không quay về nhãn AI cũ

Bước test:

1. Admin mở detail report
2. Admin đổi loại hư hỏng
3. Giữ app reporter đang mở history hoặc detail đúng report đó

Cần kiểm tra:

- [ ] Reporter thấy đúng loại hư hỏng cuối
- [ ] Tiêu đề phản ánh đi theo kết quả cuối
- [ ] Không mismatch giữa title và loại hư hỏng

Kết quả:

- [ ] PASS realtime
- [ ] PASS fallback
- [ ] BLOCKED
- [ ] FAIL

---

## 8. Case E2E-RT-06 — Luồng manual review đi đúng nhóm

Mục tiêu:
- kiểm tra event `report_manual_review_required`
- xác nhận cả reporter và admin đều thấy đúng nhóm cần kiểm tra thêm

Bước test:

1. Reporter chụp ảnh khó nhận diện
2. Reporter gửi phản ánh
3. Giữ app reporter mở ở lịch sử hoặc nhóm `Ảnh cần kiểm tra thêm`
4. Giữ web admin mở ở nhóm `Ảnh cần kiểm tra thêm`

Cần kiểm tra:

- [ ] Reporter thấy report trong nhóm `Ảnh cần kiểm tra thêm`
- [ ] Web admin thấy đúng report đó
- [ ] Admin vẫn mở detail và xử lý bình thường
- [ ] Report không bị lẫn vào nhóm không liên quan

Kết quả:

- [ ] PASS realtime
- [ ] PASS fallback
- [ ] BLOCKED
- [ ] FAIL

---

## 9. Case E2E-RT-07 — Stream ngắt nhưng hệ thống không vỡ

Mục tiêu:
- xác nhận realtime chỉ là lớp bổ sung
- stream lỗi không làm crash app/web

Bước test:

1. Ngắt backend stream hoặc làm token hết hạn
2. Giữ web admin / reporter / engineer đang mở
3. Thực hiện lại một thao tác đọc dữ liệu

Cần kiểm tra:

- [ ] Web admin không crash
- [ ] Reporter app không crash
- [ ] Engineer app không crash
- [ ] Pull-to-refresh / focus reload vẫn dùng được
- [ ] Nếu stream lỗi có thông báo phù hợp hoặc im lặng an toàn

Kết quả:

- [ ] PASS realtime
- [ ] PASS fallback
- [ ] BLOCKED
- [ ] FAIL

---

## 10. Bằng chứng cần lưu sau mỗi vòng test

- [ ] Ảnh chụp reporter trước và sau khi trạng thái đổi
- [ ] Ảnh chụp web admin dashboard/list/detail/manual review
- [ ] Ảnh chụp engineer app nếu có trong phạm vi
- [ ] Log backend nếu có phát event
- [ ] Log web nếu có subscribe stream
- [ ] Ghi rõ thời điểm bắt đầu và thời điểm UI cập nhật

Mẫu ghi thời gian:

- `Thao tác gây event`: `hh:mm:ss`
- `UI bên nhận cập nhật`: `hh:mm:ss`
- `Độ trễ quan sát được`: `... giây`

---

## 11. Script và tài liệu tái sử dụng nên chạy kèm

Các script hiện có nên dùng lại trước hoặc sau checklist này:

- `D:/DATN/Code/road-damage-gis/services/backend-api/scripts/run_e2e_smoke.py`
- `D:/DATN/Code/road-damage-gis/services/backend-api/scripts/run_mobile_to_admin_list_e2e.py`
- `D:/DATN/Code/road-damage-gis/services/backend-api/scripts/run_mobile_to_admin_map_e2e.py`
- `D:/DATN/Code/road-damage-gis/services/backend-api/scripts/run_admin_status_to_mobile_e2e.py`
- `D:/DATN/Code/road-damage-gis/services/backend-api/scripts/run_manual_review_e2e.py`
- `D:/DATN/Code/road-damage-gis/services/backend-api/scripts/run_cross_role_e2e_smoke.py`
- `D:/DATN/Code/road-damage-gis/services/backend-api/scripts/run_engineer_admin_assignment_e2e.py`
- `D:/DATN/Code/road-damage-gis/services/backend-api/scripts/run_engineer_self_claim_e2e.py`
- `D:/DATN/Code/road-damage-gis/services/backend-api/scripts/run_manual_review_engineer_e2e.py`

Lưu ý:
- các script trên chủ yếu chứng minh nghiệp vụ và tính đúng dữ liệu
- checklist này dùng để xác nhận thêm yếu tố `gần realtime`
- nếu script pass nhưng UI không tự cập nhật, chỉ được tính là `PASS fallback`

---

## 12. Quy tắc chốt nghiệm thu RT-FIX-11

### PASS

- các luồng chính không cần F5
- reporter, admin, engineer thấy đúng thay đổi liên quan trong thời gian ngắn
- không có lệch dữ liệu giữa 3 vai trò
- stream ngắt không làm vỡ hệ thống

### PASS có điều kiện

- nghiệp vụ đúng
- fallback cũ vẫn ổn
- nhưng stream chưa bật thật hoặc chưa phủ đủ client

Khi đó phải ghi rõ:

- `Đồng bộ dữ liệu: PASS`
- `Gần realtime: BLOCKED` hoặc `PARTIAL`

### FAIL

- report mới tạo nhưng màn đích không cập nhật
- sai vai trò vẫn nhận event
- request bị spam hoặc lặp bất thường
- map web giật/chớp nặng hơn sau khi cắm realtime
- reporter thấy trạng thái nội bộ không nên thấy

