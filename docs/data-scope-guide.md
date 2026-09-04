# Phân tách dữ liệu trong Road Damage GIS

Tài liệu này quy ước rõ 3 nhóm dữ liệu local để tránh lẫn giữa dữ liệu demo, dữ liệu smoke test và dữ liệu vận hành khi test tay.

## 1. Seed demo

Mục đích:

- tạo tài khoản và báo cáo mẫu để demo dashboard, list, map, history, detail

Quy ước:

- user id: `seed-user-*`
- report id: `seed-report-*`
- note: bắt đầu bằng `[seed-demo]`
- email demo: `*.demo@roadgis.local`
- ảnh mẫu: `seed-report-*.png`

Script:

```bash
python services/backend-api/scripts/seed_demo_data.py
npm run data:seed
```

Khi nào dùng:

- chuẩn bị dữ liệu trình bày
- reset nhanh bộ dữ liệu mẫu ổn định
- test login 2 vai trò, dashboard, history, detail và map ngay sau khi bật hệ thống

## 2. E2E smoke

Mục đích:

- kiểm tra nhanh luồng reporter/admin mà không làm bẩn DB về lâu dài

Quy ước:

- note report smoke: bắt đầu bằng `[e2e-smoke]`
- admin note smoke: bắt đầu bằng `[e2e-smoke]`

Script:

```bash
python services/backend-api/scripts/run_e2e_smoke.py
python services/backend-api/scripts/run_admin_cookie_flow_smoke.py
```

Đặc điểm:

- reporter smoke tự cleanup report trước và sau khi chạy
- admin cookie smoke chỉ cập nhật rồi restore lại dữ liệu seed mục tiêu

Cleanup tay nếu cần:

```bash
python services/backend-api/scripts/cleanup_tagged_data.py --scope smoke
```

## 3. Dữ liệu vận hành local test

Mục đích:

- dữ liệu do bạn tự đăng ký, tự gửi phản ánh, tự thao tác bằng app/web trong quá trình test thật

Quy ước:

- không gắn tag seed hay smoke
- được xem là dữ liệu cần giữ lại trong quá trình test nghiệp vụ

Lưu ý:

- script cleanup theo `smoke` sẽ không xóa nhóm dữ liệu này
- script cleanup theo `seed` chỉ dùng khi bạn chủ động reset lại bộ demo

## Nguyên tắc cleanup an toàn

- dọn `smoke` thường xuyên: an toàn
- chỉ dọn `seed` khi muốn tạo lại bộ demo từ đầu
- không dùng cleanup theo tag để xóa dữ liệu local test thông thường

## Quy ước ảnh upload trong local runtime

Thư mục upload hiện tại:

- gốc upload: `services/backend-api/uploads`
- ảnh báo cáo: `services/backend-api/uploads/reports`

Ba nhóm ảnh đang cùng nằm trong `uploads/reports`, nhưng được phân biệt như sau:

- `seed-demo`
  - tên file: `seed-report-*.png`
  - luôn đi cùng dữ liệu seed demo
- `e2e-smoke`
  - không bắt buộc có prefix riêng ở tên file
  - được nhận diện qua report trong DB có note bắt đầu bằng `[e2e-smoke]`
- `local-runtime`
  - ảnh do người dùng gửi thật trong local test
  - thường là tên UUID sinh tự động
  - không có tag `seed` hay `smoke`

## Cách kiểm kê ảnh upload

Có thể audit nhanh toàn bộ thư mục upload bằng:

```bash
python services/backend-api/scripts/audit_upload_storage.py
```

Script sẽ cho biết:

- có bao nhiêu ảnh `seed-demo`
- có bao nhiêu ảnh `e2e-smoke`
- có bao nhiêu ảnh `local-runtime`
- có file `orphan` nào đang còn trên ổ đĩa nhưng không còn report tham chiếu hay không

## Cách cleanup an toàn cho upload

### 1. Dọn dữ liệu smoke kèm ảnh smoke

```bash
python services/backend-api/scripts/cleanup_tagged_data.py --scope smoke
```

Script này sẽ:

- xóa report smoke trong DB
- xóa ảnh gắn với report smoke
- không đụng vào seed demo
- không đụng vào dữ liệu local-runtime

### 2. Dọn dữ liệu seed khi muốn reset demo

```bash
python services/backend-api/scripts/cleanup_tagged_data.py --scope seed
```

Script này sẽ:

- xóa user/report seed demo
- xóa ảnh `seed-report-*`

Chỉ dùng khi bạn thật sự muốn tạo lại bộ demo từ đầu.

### 3. Dọn file orphan trên ổ đĩa

Preview trước:

```bash
python services/backend-api/scripts/cleanup_orphan_uploads.py
```

Xóa thật:

```bash
python services/backend-api/scripts/cleanup_orphan_uploads.py --apply
```

`orphan` là file ảnh còn nằm trong `uploads/reports` nhưng không còn report nào trong DB tham chiếu đến nữa.
