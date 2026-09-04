# Repo Architecture Audit

Tài liệu này mô tả kiến trúc repo hiện tại theo code thật và đánh dấu rõ phần nào là runtime chính, phần nào là legacy/prototype cũ.

## 1. Kiến trúc runtime chính

Repo hiện tại được tổ chức theo 3 khối chính:

- `apps/`: các ứng dụng giao diện người dùng
- `services/`: các service backend và AI
- `packages/`: mã dùng chung

### Apps

- `apps/mobile-reporter`
  - Ứng dụng Expo React Native cho người phản ánh
- `apps/web-admin`
  - Ứng dụng React Web cho cán bộ quản lý

### Services

- `services/backend-api`
  - FastAPI backend xử lý xác thực, báo cáo, GIS và dữ liệu nghiệp vụ
- `services/ai-service`
  - FastAPI AI service chạy mô hình YOLO để nhận dạng hư hỏng mặt đường

### Packages

- `packages/api-client`
  - HTTP client dùng chung
- `packages/shared-constants`
  - Hằng số dùng chung như damage type, status, màu sắc/trạng thái nghiệp vụ

## 2. Kết quả rà soát thư mục root `src/`

### Kết luận

Thư mục `src/` ở root là phần prototype/legacy cũ, không còn là luồng runtime chính của hệ thống hiện tại.

### Bằng chứng chính

- Root entry hiện tại:
  - `App.js` import từ `./apps/mobile-reporter/App`
- Web admin entry độc lập:
  - `apps/web-admin/App.tsx` chỉ dùng `./src/...` bên trong chính app web-admin
- Mobile entry độc lập:
  - `apps/mobile-reporter/App.tsx` chỉ dùng `./src/...` bên trong chính app mobile-reporter

### Trạng thái của root `src/`

#### Legacy / old prototype

Các thư mục dưới đây trong root `src/` được xem là legacy/prototype cũ:

- `src/components`
- `src/constants`
- `src/data`
- `src/features`
- `src/legacy-app`
- `src/services`
- `src/types`
- `src/utils`

#### Không phát hiện dependency runtime chính

Qua rà soát entry hiện tại của repo:

- không phát hiện luồng boot chính import từ root `src/legacy-app`
- không phát hiện root `App.js` hoặc `index.js` phụ thuộc vào root `src/`

## 3. Phân loại phục vụ chỉnh sửa tiếp theo

### File/thư mục đang dùng

- `apps/mobile-reporter/**`
- `apps/web-admin/**`
- `services/backend-api/**`
- `services/ai-service/**`
- `packages/api-client/**`
- `packages/shared-constants/**`
- `README.md`
- `.env.example`

### File/thư mục legacy

- `src/**`

### File/thư mục có thể xóa/cô lập

- `src/**`

Gợi ý:

- Giữ lại tạm thời để tham chiếu nếu cần
- Đánh dấu rõ là legacy
- Không dùng để mô tả kiến trúc chính khi báo cáo

## 4. Kiến trúc nên trình bày trong báo cáo

Chỉ nên trình bày 3 khối chính:

- `apps`
- `services`
- `packages`

Và ghi chú:

> Thư mục `src/` ở root là phần prototype/legacy từ giai đoạn đầu, hiện không còn thuộc luồng runtime chính của hệ thống.
