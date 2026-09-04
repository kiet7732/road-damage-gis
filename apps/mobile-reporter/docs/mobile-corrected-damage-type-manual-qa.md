# Manual QA - Mobile render corrected damage type sau khi admin chỉnh sửa

Tài liệu này dùng để xác nhận UI mobile thực sự render đúng `type` và `title` sau khi cán bộ quản lý đã sửa `corrected_damage_type`.

## Mục tiêu

Không chỉ suy luận từ backend hoặc mapping data, mà phải nhìn thấy trực tiếp trên UI mobile:

- màn hình Lịch sử phản ánh
- màn hình Chi tiết phản ánh

## Điều kiện trước khi test

- Backend API đang chạy
- Đã seed demo data
- Web Admin login được
- Mobile App login được bằng reporter
- Report seed dùng để test: `seed-report-005`

## Dữ liệu chuẩn để đối chiếu

Report `seed-report-005` là case AI gốc nhận một loại lỗi, sau đó admin có thể sửa lại để kiểm tra luồng:

- ví dụ đổi sang `D20`
- label kỳ vọng trên mobile: `Nứt da cá sấu`

## Các vị trí UI cần kiểm tra

### 1. History Screen

Mỗi item đã có:

- `title`
- dòng `Loại hư hỏng: <type> - <label>`

`testID` hỗ trợ:

- `history-report-title-<reportId>`
- `history-report-type-<reportId>`

### 2. Report Detail Screen

Màn hình chi tiết đã có:

- badge `Loại hư hỏng cuối: <type> - <label>`
- `title`

`testID` hỗ trợ:

- `report-detail-type`
- `report-detail-title`

## Kịch bản kiểm tra thủ công

### Bước 1 - Mở Web Admin

- đăng nhập admin
- mở report `seed-report-005`

### Bước 2 - Chỉnh loại hư hỏng

Ví dụ đổi:

- từ loại cũ sang `D20`

Lưu lại.

### Bước 3 - Mở Mobile App bằng reporter tương ứng

- vào tab `Lịch sử`
- tìm `seed-report-005`

### Bước 4 - Kiểm tra History Screen

Xác nhận:

- `type` hiển thị đúng: `D20`
- label hiển thị đúng: `Nứt da cá sấu`
- `title` phải phản ánh loại cuối, ví dụ bắt đầu bằng:
  - `Nứt da cá sấu - ...`

### Bước 5 - Mở Report Detail Screen

Xác nhận:

- badge `Loại hư hỏng cuối` hiển thị:
  - `D20 - Nứt da cá sấu`
- `title` cũng hiển thị theo loại cuối:
  - `Nứt da cá sấu - ...`

## Bằng chứng cần lưu

Chụp ít nhất 2 ảnh:

- 1 ảnh màn hình History
- 1 ảnh màn hình Detail

Khuyến nghị đặt tên:

- `mobile-history-corrected-type.png`
- `mobile-detail-corrected-type.png`

## Checklist nghiệm thu

- [ ] Admin đã sửa `corrected_damage_type`
- [ ] History hiển thị đúng `type`
- [ ] History hiển thị đúng `title`
- [ ] Detail hiển thị đúng `type`
- [ ] Detail hiển thị đúng `title`
- [ ] Có ảnh chụp màn hình làm bằng chứng

## Ghi chú

Nếu History hoặc Detail vẫn hiện theo AI gốc thay vì loại đã sửa, cần kiểm tra lại:

- API `/reports/history`
- API `/reports/:id`
- mapping `buildReportTitle()` và `getEffectiveDamageType()`
- refresh lại màn hình sau khi admin vừa cập nhật
