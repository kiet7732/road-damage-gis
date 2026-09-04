# Road Damage GIS - Backend API

Backend API dùng FastAPI để nhận phản ánh từ Mobile App, lưu ảnh/GPS/ghi chú, gọi AI Service và lưu kết quả nhận dạng ban đầu.

## Chạy service

```bash
cd D:\DATN\Code\road-damage-gis\services\backend-api
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy ..\..\.env.example ..\..\.env
uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload
```

Backend mặc định được chuẩn hóa để chạy tại `http://localhost:5000` và API prefix là `/api`.

## Lưu trữ ảnh phản ánh

Ảnh phản ánh hiện được lưu thật tại local filesystem:

- thư mục gốc upload: `services/backend-api/uploads`
- thư mục ảnh báo cáo: `services/backend-api/uploads/reports`

Quy ước lưu trữ:

- database chỉ lưu `image_path` dạng tương đối, ví dụ: `reports/abc-123.png`
- backend tự sinh `image_url` public từ `BACKEND_PUBLIC_BASE_URL + BACKEND_UPLOAD_URL_PREFIX`
- mặc định `image_url` sẽ có dạng:
  - `http://localhost:5000/uploads/reports/<ten-file>`

Backend phục vụ ảnh tĩnh qua static mount:

- URL prefix mặc định: `/uploads`
- có thể đổi bằng biến môi trường `BACKEND_UPLOAD_URL_PREFIX`

Điều này giúp:

- mobile và web chỉ cần render theo `image_url` backend trả về
- seed data dùng cùng một cơ chế hiển thị ảnh như dữ liệu upload thật
- không cần để frontend tự đoán origin hoặc tự ghép đường dẫn ảnh

## Health và readiness

- Health: `GET http://localhost:5000/health`
- Readiness: `GET http://localhost:5000/ready`

`/ready` dùng để xác nhận:

- backend đã kết nối được database
- bảng bắt buộc đã được khởi tạo
- thư mục upload đã sẵn sàng

## Database runtime local/dev

Database runtime hiện tại được chốt là:

- Engine: SQLite
- Mục đích: local/dev và demo kỹ thuật
- File mặc định: `services/backend-api/data/road_damage_gis.db`

Schema chính đang phục vụ:

- `users`: xác thực và phân quyền
- `refresh_tokens`: refresh token rotation / revoke
- `reports`: báo cáo hiện trường, GIS fields, AI result và dữ liệu admin

Lưu ý về AI result:

- Hệ thống hiện **không dùng bảng riêng `ai_result`**
- Kết quả AI đang được lưu trực tiếp trong cột:
  - `reports.detections_json`
  - `reports.ai_message`
  - `reports.corrected_damage_type`
  - `reports.is_ai_overridden`

GIS fields hiện dùng trong runtime:

- `latitude`
- `longitude`
- `gps_accuracy`
- `location_source`
- `location_recorded_at`

Kiểm tra nhanh schema runtime:

```bash
python scripts/audit_runtime_db.py
```

Script này sẽ:

- chạy `init_database()` để migrate cột/index còn thiếu
- in ra snapshot schema/runtime hiện tại
- xác nhận rõ engine, table, index, GIS fields và cách lưu AI result

Kiểm tra CRUD runtime thật:

```bash
python scripts/verify_runtime_db_crud.py
```

Script này sẽ:

- tạo tạm 1 user runtime test
- tạo 1 report runtime test
- đọc lại report
- cập nhật status và corrected damage type
- kiểm tra report có đi qua admin list và GIS search không
- cleanup dữ liệu test sau khi chạy

## API gửi phản ánh

```http
POST /api/reports
Content-Type: multipart/form-data
```

Form-data:

```text
image=<file ảnh>
latitude=10.762622
longitude=106.660172
note=Ổ gà lớn gần giao lộ
```

## Fallback khi AI lỗi

Nếu AI Service sập hoặc timeout, Backend vẫn tạo báo cáo với:

```json
{
  "ai_status": "manual_review_required",
  "status": "pending_verification",
  "ai_result": {
    "success": false,
    "detections_count": 0,
    "detections": [],
    "processing_time_ms": null,
    "message": "AI lỗi hoặc không khả dụng, cần kiểm tra thủ công."
  }
}
```

## Kiểm tra tích hợp Backend -> AI Service

Khi muốn xác nhận backend đang gọi AI service thật và lưu được kết quả AI vào report, dùng:

```bash
python scripts/run_ai_integration_smoke.py
```

Script này sẽ kiểm tra:

- backend còn chạy
- AI service đã `ready`
- reporter login được
- preview AI gọi được
- `POST /api/reports` gọi AI service thật
- kết quả AI được lưu vào database và đọc lại được qua report detail

## Seed dữ liệu demo

Có thể tạo nhanh dữ liệu demo bằng script:

```bash
cd D:\DATN\Code\road-damage-gis\services\backend-api
set PYTHONPATH=D:\DATN\Code\road-damage-gis\services\backend-api
python scripts/seed_demo_data.py
```

Hoặc từ root repo:

```bash
npm run data:seed
```

Xem chi tiết tài khoản demo tại:

- [docs/seed-demo-guide.md](D:/DATN/Code/road-damage-gis/docs/seed-demo-guide.md)
- [docs/data-scope-guide.md](D:/DATN/Code/road-damage-gis/docs/data-scope-guide.md)

## Quản lý ảnh upload và cleanup local

Để kiểm kê ảnh upload hiện có:

```bash
python scripts/audit_upload_storage.py
```

Để dọn file ảnh orphan (ảnh còn trên ổ đĩa nhưng không còn report tham chiếu):

```bash
python scripts/cleanup_orphan_uploads.py
python scripts/cleanup_orphan_uploads.py --apply
```

Quy ước chi tiết về ảnh `seed-demo`, `e2e-smoke` và `local-runtime` xem tại:

- [docs/data-scope-guide.md](D:/DATN/Code/road-damage-gis/docs/data-scope-guide.md)

## Smoke test auth theo đúng kiến trúc thực tế

Hệ thống hiện có 2 script smoke test auth riêng:

- `python scripts/run_e2e_smoke.py`
  - dùng cho Mobile / Reporter
  - xác thực bằng Bearer Token
- `python scripts/run_admin_cookie_flow_smoke.py`
  - dùng cho Web Admin
  - xác thực bằng HttpOnly Cookie / cookie jar

Lưu ý:

- Không dùng script bearer để kết luận web admin cookie flow đã được test đầy đủ.
- Hai script này được tách riêng để phản ánh đúng kiến trúc auth thực tế của hệ thống.
- Dữ liệu smoke được gắn tag riêng và có thể cleanup an toàn bằng:

```bash
python scripts/cleanup_tagged_data.py --scope smoke
```

## Quy ước dữ liệu local

Hệ thống local hiện phân biệt rõ 3 nhóm dữ liệu:

- `seed-demo`: dữ liệu mẫu phục vụ demo
- `e2e-smoke`: dữ liệu sinh ra bởi smoke test, có thể dọn an toàn
- `local-runtime`: dữ liệu bạn thao tác thật khi test app/web

Xem chi tiết tại:

- [docs/data-scope-guide.md](D:/DATN/Code/road-damage-gis/docs/data-scope-guide.md)

## Ghi chú phạm vi hiện tại

### Preview token cache

- Cơ chế `preview_token` hiện dùng cache in-memory trong tiến trình backend.
- Phù hợp local demo và một service instance.
- Chưa phải giải pháp production-ready nếu scale nhiều worker/instance hoặc restart service.

### PostGIS mode

- Module GIS hiện có nhánh truy vấn tương thích PostGIS.
- Tuy nhiên runtime database hiện tại vẫn chưa wiring sang PostgreSQL/PostGIS thật, nên chưa thể xem là production PostGIS hoàn chỉnh.
- Cách mô tả đúng: đã chuẩn bị `PostGIS-ready query path`, chưa hoàn tất hạ tầng DB không gian thực tế.

### Xác nhận E2E dữ liệu sống

- Nếu database runtime đang rỗng thì chưa thể kết luận đã xác nhận E2E đầy đủ bằng dữ liệu sống.
- Nên phân biệt rõ giữa:
  - đã kiểm tra compile, schema, mapping và logic API
  - với việc đã chạy xác nhận thực tế trên bộ dữ liệu vận hành thật
