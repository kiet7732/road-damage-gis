# Spatial statistics plan for administrative boundaries

Mục tiêu:

- Đếm số lượng hư hỏng theo ranh giới hành chính (phường/xã, quận/huyện, tỉnh/thành).
- Phục vụ dashboard GIS và ưu tiên xử lý theo khu vực.

Đầu vào dữ liệu:

- Bảng `reports` có cột hình học `geom geometry(Point, 4326)`.
- Bảng ranh giới hành chính `admin_boundaries`:
  - `id`
  - `name`
  - `level`
  - `parent_id`
  - `geom geometry(MultiPolygon, 4326)`

Luồng xử lý đề xuất:

1. Chuẩn hóa toàn bộ báo cáo sang `geom`.
2. Dùng `ST_Intersects(reports.geom, admin_boundaries.geom)` để gán điểm hư hỏng vào khu vực.
3. Gom nhóm theo `admin_boundaries.id`, `name`, `level`.
4. Có thể lọc thêm theo:
   - thời gian gửi
   - trạng thái xử lý
   - loại hư hỏng
5. Trả về kết quả dạng:
   - GeoJSON polygon + thuộc tính `report_count`
   - hoặc bảng thống kê thuần để feed dashboard.

API dự kiến:

- `GET /api/admin/gis/statistics/by-boundary?level=ward&period_days=30&status=pending`

Chỉ số nên trả:

- `total_reports`
- `pending_reports`
- `processing_reports`
- `repaired_reports`
- `damage_type_breakdown`

Tối ưu hiệu năng:

- GIST index cho `reports.geom`
- GIST index cho `admin_boundaries.geom`
- Materialized view nếu dashboard truy cập thường xuyên
- Cache theo `level + period + status + damage_type`
