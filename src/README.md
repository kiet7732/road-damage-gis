# Legacy Source Folder

Thư mục `src/` ở root là phần prototype/legacy cũ của dự án.

## Trạng thái hiện tại

- Không phải entry runtime chính của hệ thống hiện tại
- Không dùng để mô tả kiến trúc chính trong báo cáo
- Được giữ lại tạm thời để tham chiếu hoặc phục vụ đối chiếu mã nguồn cũ

## Kiến trúc runtime chính hiện nay

Hệ thống hiện chạy theo 3 khối:

- `apps/`
- `services/`
- `packages/`

Trong đó:

- mobile app: `apps/mobile-reporter`
- web admin: `apps/web-admin`
- backend API: `services/backend-api`
- AI service: `services/ai-service`

## Lưu ý

Nếu tiếp tục dọn repo:

- không thêm feature mới vào root `src/`
- ưu tiên phát triển trong `apps/`, `services/`, `packages/`
- có thể archive/xóa dần root `src/` sau khi xác nhận không còn nhu cầu tham chiếu
