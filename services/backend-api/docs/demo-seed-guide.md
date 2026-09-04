# Demo Seed Guide

## Chạy seed dữ liệu demo

Từ thư mục `services/backend-api`:

```bash
set PYTHONPATH=D:\DATN\Code\road-damage-gis\services\backend-api
python scripts/seed_demo_data.py
```

## Tài khoản demo

### Admin

- Email: `admin.demo@roadgis.local`
- Password: `Admin@123`

### Reporter 1

- Email: `reporter1.demo@roadgis.local`
- Password: `Reporter@123`

### Reporter 2

- Email: `reporter2.demo@roadgis.local`
- Password: `Reporter@123`

## Dữ liệu được tạo

- 1 tài khoản admin
- 2 tài khoản reporter
- 6 báo cáo mẫu

Bao gồm:

- trạng thái chờ xác minh
- trạng thái đang xử lý
- trạng thái đã sửa chữa
- đủ các loại lỗi D00, D10, D20, D40
- có 1 case AI bị cán bộ sửa lại kết quả để phục vụ demo
- tất cả báo cáo đều có ảnh seed sẵn để mở list/detail/map không bị rỗng ảnh

## Mapping case demo

Xem chi tiết các báo cáo mẫu tại:

- `docs/demo-report-cases.md`
