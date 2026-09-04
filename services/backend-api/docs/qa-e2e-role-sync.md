# QA E2E - Đồng bộ 2 vai trò

Tài liệu này mô tả mục tiêu kiểm tra của Ticket QA-E2E-03.

## Ghi chú quan trọng về chế độ auth test

Hệ thống hiện tách rõ 2 kiểu smoke test theo đúng kiến trúc auth thực tế:

- `scripts/run_e2e_smoke.py`
  - dùng cho Mobile / Reporter
  - xác thực bằng Bearer Token
- `scripts/run_admin_cookie_flow_smoke.py`
  - dùng cho Web Admin
  - xác thực bằng HttpOnly Cookie / cookie jar

Không dùng kết quả của script bearer để kết luận rằng web admin cookie flow đã được test đầy đủ.

## Mục tiêu

Xác nhận luồng đồng bộ dữ liệu giữa:

- Reporter gửi báo cáo
- Admin xử lý báo cáo
- Reporter xem lại kết quả cuối

## Điều cần xác nhận

### 1. Reporter gửi báo cáo thành công

- báo cáo được tạo mới
- status trả về ban đầu là `pending`
- báo cáo xuất hiện trong history
- detail mở được

### 2. Admin nhìn thấy đúng báo cáo đó

- có trong dashboard
- có trong report list
- có trên bản đồ GIS
- mở detail được

### 3. Admin sửa loại hư hỏng

- cập nhật `corrected_damage_type`
- dữ liệu detail phía admin phản ánh đúng

### 4. Admin cập nhật trạng thái xử lý

- trạng thái mới được lưu
- dashboard/list/map không lệch dữ liệu

### 5. Reporter xem lại kết quả cuối

- reporter detail thấy `status` mới
- reporter history thấy `status` mới
- reporter detail thấy `corrected_damage_type` mới

## Ghi chú về title/type ở mobile

Phần `title` và `type` của reporter mobile là dữ liệu được map ở tầng client.

Sau khi đã sửa Ticket `FIX-MOBILE-01`, mobile sẽ:

- ưu tiên `corrected_damage_type`
- sau đó mới fallback về detection AI ban đầu

Do đó khi admin đổi loại lỗi, mobile phải hiển thị:

- `type` theo `corrected_damage_type`
- `title` theo label cuối cùng tương ứng với `corrected_damage_type`

Ví dụ:

- nếu admin sửa sang `D20`
- mobile kỳ vọng hiển thị:
  - `type = D20`
  - `title = Nứt da cá sấu - <ghi chú báo cáo>`

## Cách kiểm tra nhanh

### Reporter / Mobile bearer flow

```bash
python scripts/run_e2e_smoke.py
```

### Web Admin cookie flow

```bash
python scripts/run_admin_cookie_flow_smoke.py
```

## Nhãn dữ liệu test tự động

- Report seed demo dùng prefix: `[seed-demo]`
- Report smoke test tự động dùng prefix: `[e2e-smoke]`

Nhờ đó có thể:

- phân biệt rõ dữ liệu demo và dữ liệu kiểm thử tự động
- cleanup report smoke theo prefix mà không ảnh hưởng report seed
- rà soát nhanh trên DB, history hoặc report list nếu cần

Kết quả PASS cần có:

- Reporter bearer flow: PASS
- Admin cookie flow: PASS
