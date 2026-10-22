# TÀI LIỆU VẬN HÀNH: QUY TRÌNH CẮT CHUYỂN HỆ THỐNG (CUTOVER RUNBOOK) & KẾ HOẠCH ROLLBACK DỰ PHÒNG
**Mã Ticket:** `RDG-PG-08`  
**Hệ thống:** Road Damage GIS - Quản lý Nhận dạng & Khảo sát Hư hỏng Mặt đường  
**Mục tiêu:** Chuyển đổi cơ sở dữ liệu chính từ SQLite sang PostgreSQL 16 + PostGIS 3.4 với thời gian gián đoạn ghi tối thiểu (< 3 phút) và phương án Rollback khẩn cấp (< 3 phút SLA).

---

## 1. Tổng quan Kiến trúc Chuyển đổi (Cutover Architecture)

Hệ thống được thiết kế theo mô hình **Dual-Backend trong suốt** thông qua tầng trừu tượng `Database Abstraction Layer` tại `app/database.py`:
- **Trạng thái Tiền di chuyển:** Backend API chạy trên tệp nhúng SQLite (`./data/road_damage_gis.db`).
- **Trạng thái Đích:** Backend API kết nối tới PostgreSQL 16 + PostGIS 3.4 qua `psycopg_pool` (Connection Pooling 5 - 20 kết nối).
- **Cơ chế An toàn (Safe Guard):**
  - **Read-Only Maintenance Window:** Tạm thời khóa các thao tác ghi (`POST`, `PUT`, `PATCH`, `DELETE`) trả về HTTP 503 (`MAINTENANCE_MODE`), trong khi các thao tác đọc (`GET`) của Web Admin và Mobile vẫn hoạt động bình thường.
  - **Pre-migration Snapshot:** Tự động tạo bản sao lưu vật lý tệp SQLite trước khi chạy ETL.
  - **Checksum Đối soát Toàn vẹn:** Kiểm tra số lượng bản ghi và toạ độ $WGS84$ giữa hai cơ sở dữ liệu trước khi tráo đổi cấu hình.

```
[Web Admin / Mobile App]
          │
          ▼
   [FastAPI Backend]
          │
    (READ_ONLY_MODE) ──► GET: 200 OK | POST/PUT: 503 Maintenance
          │
 ┌────────┴────────┐
 │ (Trước Cutover) │ (Sau Cutover)
 ▼                 ▼
[SQLite DB]   [PostgreSQL 16 + PostGIS]
(Snapshot)    (MVCC + GiST Indexing)
```

---

## 2. Danh mục Kiểm tra Tiền Cắt Chuyển (Pre-flight Checklist)

Trước khi tiến hành cắt chuyển trên môi trường vận hành thực tế, Quản trị viên hệ thống (DevOps/Admin) phải hoàn thành danh mục sau:

- [ ] **Docker PostGIS đang chạy:** Container `rdg-postgis` trên cổng `5432` ở trạng thái `healthy`.
  ```powershell
  docker compose -f docker-compose.postgis.yml ps
  ```
- [ ] **Dung lượng đĩa khả dụng:** Ổ đĩa máy chủ còn trống ít nhất $2\text{GB}$ để lưu trữ snapshot SQLite và bảng dữ liệu PostGIS.
- [ ] **Kết nối mạng & Firewall:** Cổng `5432` mở cho Backend API nội bộ.
- [ ] **Đã thông báo cho đội ngũ:** Báo trước cho kỹ sư hiện trường và quản trị viên về khung giờ bảo trì ngắn ($3$ phút).

---

## 3. Quy trình Cắt Chuyển Từng Bước (Step-by-Step Cutover)

### Cách 1: Chạy Tự Động Hóa 1 Lệnh (Khuyến nghị)
Sử dụng script tự động hóa toàn bộ 6 bước:

```powershell
# Chạy script PowerShell tại thư mục gốc dự án:
.\scripts\cutover-to-postgis.ps1

# Hoặc chạy trực tiếp bằng Python:
python services/backend-api/scripts/cutover_to_postgis.py
```

### Cách 2: Thực hiện Thủ Công Theo Từng Bước (Manual Execution)

#### Bước 1: Khóa ghi tạm thời (Read-Only Mode)
Chuyển biến môi trường trong `services/backend-api/.env`:
```dotenv
READ_ONLY_MODE=true
```
Khởi động lại nhẹ hoặc nạp lại cấu hình để backend kích hoạt middleware chặn ghi.

#### Bước 2: Tạo bản sao lưu Snapshot tệp SQLite
```powershell
cp ./services/backend-api/data/road_damage_gis.db ./services/backend-api/data/backup_pre_migration.db
```

#### Bước 3: Chạy Pipeline ETL và Đối soát Checksum Toàn vẹn
```powershell
cd services/backend-api
python scripts/migrate_sqlite_to_postgis.py --verify-checksum
```
*Điều kiện tiên quyết:* Toàn bộ 5 bảng dữ liệu (`users`, `reports`, `refresh_tokens`, `report_engineer_actions`, `geocoding_cache`) phải báo `KHỚP 100%`.

#### Bước 4: Chuyển đổi Biến Môi trường sang PostgreSQL + PostGIS
Cập nhật file `services/backend-api/.env`:
```dotenv
GIS_BACKEND=postgis
DATABASE_URL=postgresql://rdg_admin:rdg_secret_postgis_2026@127.0.0.1:5432/road_damage_gis
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_USER=rdg_admin
POSTGRES_PASSWORD=rdg_secret_postgis_2026
POSTGRES_DB=road_damage_gis
```

#### Bước 5: Kiểm tra Sẵn sàng & Chạy Smoke Tests
1. Gọi kiểm tra endpoint readiness:
   ```powershell
   curl http://localhost:5000/ready
   # Kỳ vọng: {"status":"ready","ready":true,...}
   ```
2. Thực hiện 1 request truy vấn bản đồ, 1 request tạo báo cáo và 1 request check-in hiện trường.

#### Bước 6: Hoàn tất & Mở lại Toàn bộ Quyền Ghi
Cập nhật file `services/backend-api/.env`:
```dotenv
READ_ONLY_MODE=false
```
Hệ thống chính thức vận hành trên PostgreSQL 16 + PostGIS 3.4.

---

## 4. Kế Hoạch Rollback Khẩn Cấp (SLA < 3 Phút)

### Điều kiện Kích hoạt Rollback:
- PostGIS gặp sự cố kết nối phần cứng / crash container không thể phục hồi trong $15$ phút.
- Gặp lỗi nghiêm trọng không tương thích dữ liệu làm gián đoạn nghiệp vụ kỹ sư hiện trường.

### Cách 1: Chạy Rollback Tự Động (Thời gian thực thi < 5 giây)
```powershell
# Chạy script PowerShell tại thư mục gốc dự án:
.\scripts\rollback-to-sqlite.ps1

# Hoặc chạy qua Python:
python services/backend-api/scripts/rollback_to_sqlite.py
```

### Cách 2: Thực hiện Rollback Thủ Công
1. Đổi lại cấu hình trong `.env`:
   ```dotenv
   GIS_BACKEND=sqlite
   READ_ONLY_MODE=false
   ```
2. Khôi phục lại tệp SQLite từ snapshot:
   ```powershell
   cp ./services/backend-api/data/backup_pre_migration.db ./services/backend-api/data/road_damage_gis.db
   ```
3. Kiểm tra lại endpoint `/ready`:
   ```powershell
   curl http://localhost:5000/ready
   ```

---

## 5. Tiêu chí Chấp nhận (Gherkin Acceptance Criteria)

```gherkin
Scenario: Thực hiện quy trình Rollback thành công
  Given hệ thống gặp sự cố sau khi chuyển sang PostGIS
  When thực hiện các bước trong Kế hoạch Rollback
  Then hệ thống Backend API trở lại hoạt động bình thường với SQLite trong dưới 3 phút
  And không có dữ liệu lịch sử nào trước thời điểm cutover bị mất
```

- **Thời gian Rollback:** Đo lường thực tế đạt **$< 5\text{ giây}$** (cam kết SLA $< 180\text{ giây}$).
- **Bảo toàn dữ liệu:** $100\%$ bản ghi lịch sử trước cutover nguyên vẹn trên tệp snapshot `backup_pre_migration.db`.
