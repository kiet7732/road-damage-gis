# Seed dữ liệu nghiệp vụ local

Tài liệu này mô tả bộ dữ liệu seed dùng để test hệ thống thật ở local, không phải mock UI.

## Mục tiêu của bộ seed

Sau khi seed xong, hệ thống phải có sẵn:

- 1 tài khoản admin
- 2 tài khoản reporter
- 8 phản ánh mẫu
- đủ loại hư hỏng:
  - D00
  - D10
  - D20
  - D40
- đủ trạng thái nghiệp vụ chính:
  - `pending_verification`
  - `in_progress`
  - `resolved`
  - `rejected`

## Tài khoản seed

### Admin

- Email: `admin.demo@roadgis.local`
- Mật khẩu: `Admin@123`

### Reporter 1

- Email: `reporter1.demo@roadgis.local`
- Mật khẩu: `Reporter@123`

### Reporter 2

- Email: `reporter2.demo@roadgis.local`
- Mật khẩu: `Reporter@123`

## Cách chạy seed

```bash
python services/backend-api/scripts/seed_demo_data.py
```

Hoặc từ root repo:

```bash
npm run data:seed
```

## Kỳ vọng sau khi seed

### Web Admin

- đăng nhập được bằng tài khoản admin
- dashboard có số liệu
- danh sách báo cáo không trống
- bản đồ GIS có marker
- có ít nhất 1 case AI bị sửa bởi cán bộ

### Mobile Reporter

- đăng nhập được bằng reporter 1 hoặc reporter 2
- history không trống
- detail xem được đủ dữ liệu
- có report ở nhiều trạng thái khác nhau để kiểm tra luồng cập nhật

## Các case nổi bật trong seed

- `seed-report-005`
  - AI gốc là `D00`
  - cán bộ đã sửa thành `D20`
  - dùng để test corrected damage type

- `seed-report-006`
  - `ai_status = manual_review_required`
  - dùng để test fallback khi AI không khả dụng

- `seed-report-007`
  - trạng thái `rejected`
  - dùng để test bộ lọc/tổng hợp trạng thái bị từ chối

- `seed-report-008`
  - trạng thái `pending_verification`
  - AI chưa rõ, cần xác minh thủ công

## Ghi chú

- Bộ seed này là dữ liệu `seed-demo`
- Có thể chạy lại nhiều lần, script sẽ cập nhật ổn định theo `seed-report-*`
- Không dùng bộ seed này để thay thế dữ liệu vận hành local do bạn tự thao tác
