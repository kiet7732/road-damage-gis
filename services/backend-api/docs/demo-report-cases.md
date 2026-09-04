# Demo Report Cases

Tài liệu này mô tả các báo cáo seed dùng riêng cho lúc demo để dễ mở đúng case.

## Case 1 - AI nhận đúng

- Report ID: `seed-report-001`
- Trạng thái: `pending_verification`
- Damage type AI: `D40`
- Nhãn hiển thị: `Ổ gà`
- Mục đích demo:
  - reporter đã gửi báo cáo
  - AI nhận đúng lỗi
  - admin mở detail xem được ảnh và kết quả AI

## Case 2 - AI nhận đúng với nứt dọc

- Report ID: `seed-report-002`
- Trạng thái: `pending_verification`
- Damage type AI: `D00`
- Nhãn hiển thị: `Nứt dọc`

## Case 3 - Đang xử lý

- Report ID: `seed-report-003`
- Trạng thái: `in_progress`
- Damage type AI: `D10`
- Nhãn hiển thị: `Nứt ngang`

## Case 4 - Đang xử lý với nứt da cá sấu

- Report ID: `seed-report-004`
- Trạng thái: `in_progress`
- Damage type AI: `D20`
- Nhãn hiển thị: `Nứt da cá sấu`

## Case 5 - AI nhận sai, admin sửa lại

- Report ID: `seed-report-005`
- Trạng thái: `resolved`
- AI ban đầu: `D00`
- Kết quả cuối sau xác minh: `D20`
- `is_ai_overridden = true`
- Mục đích demo:
  - chứng minh AI chỉ hỗ trợ ban đầu
  - cán bộ có thể xác minh và sửa lại loại hư hỏng
  - mobile/admin phải hiển thị theo kết quả cuối

## Case 6 - AI lỗi, xử lý thủ công

- Report ID: `seed-report-006`
- Trạng thái: `resolved`
- `ai_status = manual_review_required`
- Damage type hiển thị: `D40`
- Mục đích demo:
  - chứng minh khi AI lỗi, báo cáo vẫn tồn tại
  - admin vẫn có thể xử lý bằng quy trình thủ công
