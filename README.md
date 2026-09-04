# Road Damage GIS

Hệ thống hỗ trợ người dân phản ánh hư hỏng mặt đường bằng ứng dụng mobile, cho phép cán bộ quản lý xác minh và theo dõi trên Web Admin, đồng thời tích hợp AI nhận dạng hư hỏng và GIS để quản lý vị trí trên bản đồ.

## Thành phần chính

- `apps/mobile-reporter`: Ứng dụng mobile cho người phản ánh.
- `apps/mobile-field-engineer`: Ứng dụng mobile cho kỹ sư hiện trường.
- `apps/web-admin`: Web Admin cho cán bộ quản lý.
- `services/backend-api`: Backend API quản lý xác thực, báo cáo, GIS và dữ liệu nghiệp vụ.
- `services/ai-service`: AI Service nhận dạng hư hỏng mặt đường từ ảnh.
- `packages/api-client`: HTTP client dùng chung.
- `packages/shared-constants`: Hằng số nghiệp vụ dùng chung.
- `packages/mobile-shared`: Shared UI, map, auth helper, theme và location helper cho 2 app mobile.

## Vai trò và app tương ứng

- `Reporter` dùng `apps/mobile-reporter`
  - gửi phản ánh mới
  - xem lịch sử phản ánh
  - xem chi tiết và cập nhật xử lý công khai
- `Field Engineer` dùng `apps/mobile-field-engineer`
  - xem điểm cần kiểm tra
  - nhận kiểm tra, check-in, khảo sát, tải ảnh bổ sung
  - không dùng app reporter để thao tác nghiệp vụ kỹ sư
- `Admin / Manager / Staff / Officer` dùng `apps/web-admin`
  - xem dashboard
  - quản lý danh sách phản ánh
  - xem bản đồ GIS
  - xử lý manual review
  - theo dõi và điều phối kỹ sư khi backend workflow tương ứng sẵn sàng

## Source of truth dùng chung

Để tránh lệch logic giữa 2 app mobile và web/backend, repo hiện dùng các nguồn chuẩn sau:

- `packages/mobile-shared`
  - nguồn chuẩn cho shared mobile UI
  - chứa component nền, map wrapper, auth helper, token storage adapter, theme, location helper
- `packages/shared-constants`
  - nguồn chuẩn cho status metadata, wording engineer/admin, damage metadata và field-domain metadata
- `packages/api-client`
  - nguồn chuẩn cho HTTP client, token storage contract và API base URL resolution

Nguyên tắc dùng:

- app reporter và app kỹ sư nên dùng shared package trước, không copy component thủ công
- không thêm wording engineer/admin trực tiếp vào app reporter
- khi sửa map/component dùng chung, phải kiểm tra lại cả `mobile-reporter` và `mobile-field-engineer`

## Port chuẩn khi chạy local

Toàn bộ hệ thống hiện được chuẩn hóa theo các cổng sau:

- Frontend web: `http://localhost:8081`
- Backend API: `http://localhost:5000`
- AI service: `http://localhost:8001`

Health check:

- Backend API: [http://localhost:5000/health](http://localhost:5000/health)
- AI service: [http://localhost:8001/health](http://localhost:8001/health)

Readiness check:

- Backend API: [http://localhost:5000/ready](http://localhost:5000/ready)
- AI service: [http://localhost:8001/ready](http://localhost:8001/ready)

## Cấu trúc repo hiện tại

Repo hiện được tổ chức theo 3 khối chính:

- `apps/`
  - `mobile-reporter`
  - `mobile-field-engineer`
  - `web-admin`
- `services/`
  - `backend-api`
  - `ai-service`
- `packages/`
  - `api-client`
  - `mobile-shared`
  - `shared-constants`

Chi tiết ý nghĩa từng khối:

- `apps/`
  - chứa entrypoint và màn hình theo từng role/giao diện người dùng
- `services/`
  - chứa backend runtime và AI runtime
- `packages/`
  - chứa logic hoặc tài nguyên dùng chung, không gắn chặt vào một app đơn lẻ

## Ghi chú về thư mục legacy

- Thư mục `src/` ở root là phần prototype/legacy cũ.
- Luồng runtime chính hiện tại không còn dùng root `src/` để boot ứng dụng.
- Khi trình bày kiến trúc, chỉ nên mô tả 3 khối chính:
  - `apps`
  - `services`
  - `packages`

Chi tiết rà soát xem tại:

- `docs/repo-architecture-audit.md`

## Quy trình khởi động local toàn hệ thống

### Bước 1 - chuẩn bị môi trường một lần

Tại thư mục root repo, chạy:

```bash
npm run setup:local
```

Script này sẽ:

- tạo file `.env` từ [\.env.example](D:/DATN/Code/road-damage-gis/.env.example) nếu chưa có
- cài `node_modules` ở root nếu chưa có
- tạo `.venv` cho:
  - [services/backend-api](D:/DATN/Code/road-damage-gis/services/backend-api)
  - [services/ai-service](D:/DATN/Code/road-damage-gis/services/ai-service)
- cài dependencies Python cho 2 service

### Bước 2 - bật toàn bộ hệ thống

Sau khi setup xong, chỉ cần chạy:

```bash
npm run dev:all
```

Luồng này sẽ:

- tự mở Backend API ở cổng `5000` nếu chưa chạy
- tự mở AI Service ở cổng `8001` nếu chưa chạy
- chạy frontend web ở cổng `8081`

### Nếu muốn chạy từng phần riêng

```bash
npm run dev:backend
npm run dev:ai
npm run dev:web
```

Web admin chạy riêng bằng:

```bash
npm run dev:web-admin
```

Mặc định:

- `npm run dev:web` mở Expo web runtime ở cổng `8081`
- runtime này dùng cho `mobile-reporter` hoặc `mobile-field-engineer` tùy `EXPO_PUBLIC_APP_TARGET`
- `npm run dev:web-admin` mở web quản lý riêng ở cổng `5173`

## Cách chạy đúng theo từng app mobile

Từ 2026-08-29, runtime mobile được chuẩn hóa theo `EXPO_PUBLIC_APP_TARGET`.

Quy ước:

- `reporter`: app người phản ánh
- `engineer`: app kỹ sư hiện trường

### App mặc định khi chỉ chạy `npm start`

```bash
npm start
```

- mở app `reporter`
- chỉ nên dùng khi bạn cố ý test app người phản ánh hoặc cần hành vi mặc định

### Chạy app người phản ánh rõ ràng

```bash
npm run start:reporter
```

Hoặc theo platform:

```bash
npm run web:reporter
npm run android:reporter
npm run ios:reporter
```

### Chạy app kỹ sư hiện trường rõ ràng

```bash
npm run start:engineer
```

Hoặc theo platform:

```bash
npm run web:engineer
npm run android:engineer
npm run ios:engineer
```

### Chạy web admin

```bash
npm run dev:web-admin
```

Sau khi mở:

- web admin: [http://localhost:5173](http://localhost:5173)
- mobile web reporter hoặc engineer: [http://localhost:8081](http://localhost:8081)

### Rule dùng khi dev/test/demo

- test luồng người dân: luôn dùng script `reporter`
- test luồng kỹ sư hiện trường: luôn dùng script `engineer`
- test luồng quản lý: luôn dùng `npm run dev:web-admin`
- không nên tự nhớ và tự set tay `EXPO_PUBLIC_APP_TARGET` nếu không cần
- khi chụp màn hình, quay demo hoặc làm smoke test, nên ghi rõ đang dùng script nào

### Bộ lệnh nên dùng theo từng tình huống

- Dev app người phản ánh:

```bash
npm run start:reporter
```

- Dev app kỹ sư hiện trường:

```bash
npm run start:engineer
```

- Test web mobile nhanh cho reporter:

```bash
npm run web:reporter
```

- Test web mobile nhanh cho engineer:

```bash
npm run web:engineer
```

- Dev web quản lý:

```bash
npm run dev:web-admin
```

- Bật backend + AI trước khi test app:

```bash
npm run dev:backend
npm run dev:ai
```

### Runtime fallback

`App.js` hiện normalize các giá trị:

- `engineer`
- `field_engineer`
- `mobile-field-engineer`

thành app kỹ sư.

Nếu biến `EXPO_PUBLIC_APP_TARGET` bị thiếu hoặc sai giá trị, hệ thống sẽ fallback về `reporter` để tránh mở nhầm app không xác định.

### Thứ tự đúng để kiểm tra

1. Mở [http://localhost:5000/health](http://localhost:5000/health) để kiểm tra backend
2. Mở [http://localhost:8001/health](http://localhost:8001/health) để kiểm tra AI
3. Mở [http://localhost:5173](http://localhost:5173) nếu cần vào web admin
4. Mở [http://localhost:8081](http://localhost:8081) nếu cần vào mobile web reporter/engineer
5. Chạy readiness check tổng hệ thống:

```bash
npm run check:ready
```

### Phân biệt health và readiness

- `health`: service đang chạy
- `ready`: service đã sẵn sàng dùng thật

Hiện tại:

- Backend `/ready` kiểm tra:
  - kết nối database
  - bảng bắt buộc đã có
  - thư mục upload sẵn sàng
- AI `/ready` kiểm tra:
  - file model tồn tại
  - model load thành công
- `npm run check:ready` kiểm tra thêm:
  - frontend Expo web đang mở ở `8081`
  - web admin có thể được kiểm tra riêng ở `5173`
  - `EXPO_PUBLIC_API_URL` và `VITE_API_URL` có trùng `BACKEND_API_URL` không
  - backend và AI có trả readiness thành công không

## Tài liệu nào nên đọc trước

Nếu mới vào dự án, thứ tự nên đọc là:

1. README này
2. [docs/seed-demo-guide.md](D:/DATN/Code/road-damage-gis/docs/seed-demo-guide.md)
3. [docs/uat-three-role-checklist.md](D:/DATN/Code/road-damage-gis/docs/uat-three-role-checklist.md)
4. [docs/mobile-field-engineer-migration-audit-2026-08-29.md](D:/DATN/Code/road-damage-gis/docs/mobile-field-engineer-migration-audit-2026-08-29.md)
5. [docs/mobile-field-engineer-cross-dependency-audit-2026-08-29.md](D:/DATN/Code/road-damage-gis/docs/mobile-field-engineer-cross-dependency-audit-2026-08-29.md)

## Trạng thái hoàn thiện hiện tại

Tài liệu này giúp phân biệt rõ phần nào đã đủ để demo/báo cáo và phần nào mới ở mức prototype kỹ thuật.

### Đã đủ để demo

- Luồng mobile: đăng nhập, chụp ảnh, xem preview AI, xác nhận gửi báo cáo, xem lịch sử, xem chi tiết.
- Luồng web admin: đăng nhập, dashboard, danh sách báo cáo, chi tiết báo cáo, cập nhật trạng thái, chỉnh sửa loại hư hỏng.
- Tích hợp AI service qua API để nhận dạng ảnh mặt đường.
- Hiển thị bản đồ GIS trên mobile/web với dữ liệu phản ánh từ backend.

### Chưa production-ready hoàn toàn

#### 1) `preview_token` cache hiện là in-memory

- Cơ chế tái sử dụng kết quả preview AI hiện đang lưu trong bộ nhớ tiến trình backend.
- Cách này phù hợp cho local demo, máy đơn, một process.
- Chưa phù hợp production thật vì khi restart service, scale nhiều worker hoặc chạy nhiều instance thì cache sẽ không còn đồng bộ.
- Hướng nâng cấp production: chuyển sang Redis hoặc một persistent store có TTL.

#### 2) “PostGIS mode” hiện là nhánh truy vấn tương thích

- Hệ thống hiện đã có nhánh logic/truy vấn chuẩn bị cho PostGIS ở tầng GIS.
- Tuy nhiên runtime database hiện tại vẫn chưa được wiring sang PostgreSQL/PostGIS thật.
- Nói đúng phạm vi kỹ thuật: đây là `PostGIS-ready query path`, chưa phải triển khai PostGIS production hoàn chỉnh.
- Hướng nâng cấp production: thay tầng connection/runtime DB sang PostgreSQL/PostGIS, migration schema không gian, index GIST và kiểm thử spatial query trên dữ liệu thật.

#### 3) E2E với dữ liệu sống chưa được xác nhận đầy đủ

- Trong quá trình rà soát kỹ thuật, local runtime DB có thể đang rỗng nên chưa xác nhận được trọn vẹn E2E bằng dữ liệu sống.
- Điều này có nghĩa là compile, mapping dữ liệu và logic luồng đã được kiểm tra, nhưng chưa nên tuyên bố đã kiểm thử production thực tế với bộ dữ liệu vận hành thật.
- Khi báo cáo nên nói rõ: hệ thống đã hoàn thiện luồng chức năng và tích hợp kỹ thuật, còn bước xác nhận E2E với dữ liệu vận hành thật phụ thuộc dữ liệu seed/test thực tế.

## Cách trình bày đúng khi demo hoặc viết báo cáo

Bạn có thể mô tả ngắn gọn theo hướng sau:

> Hệ thống hiện đã hoàn thiện mức demo tích hợp đầy đủ Mobile - Backend - AI - Web Admin - GIS. Một số phần như cache `preview_token` hiện dùng in-memory, nhánh PostGIS mới ở mức tương thích truy vấn, và E2E với dữ liệu sống vẫn cần được xác nhận thêm khi có database thực tế đầy đủ. Vì vậy đây là sản phẩm hoàn chỉnh để báo cáo kỹ thuật và demo, đồng thời vẫn còn một số hạng mục nâng cấp trước khi đưa lên production thật.

## Ghi chú triển khai tiếp theo

- Bổ sung DB PostgreSQL/PostGIS thật.
- Seed dữ liệu thật cho user/admin/report.
- Kiểm thử E2E với dữ liệu sống.
- Chuyển preview cache sang Redis.
- Thiết lập logging, monitoring và backup phù hợp môi trường production.

## Database runtime hiện tại

Local/dev runtime hiện được chốt là SQLite tại:

- [services/backend-api/data/road_damage_gis.db](D:/DATN/Code/road-damage-gis/services/backend-api/data/road_damage_gis.db)

Phạm vi hiện tại:

- đủ để chạy auth
- đủ để tạo/xem/cập nhật report
- đủ để phục vụ dashboard admin và GIS query mức local/dev

Nếu cần audit nhanh DB runtime:

```bash
python services/backend-api/scripts/audit_runtime_db.py
```

## Seed dữ liệu nghiệp vụ local

Để có sẵn dữ liệu test thật cho login, dashboard, map, history và detail:

```bash
npm run data:seed
```

Chi tiết bộ seed:

- [docs/seed-demo-guide.md](D:/DATN/Code/road-damage-gis/docs/seed-demo-guide.md)
