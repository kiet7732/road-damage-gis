"""
Seed 50 road damage reports in Binh Duong province using real YOLOv12 images.
Distributed among 9 Citizen Reporter accounts.
"""

from __future__ import annotations

import json
import os
import random
import shutil
import sqlite3
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from PIL import Image

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Ensure backend-api path is in sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.modules.auth.security import hash_password

TRAIN_IMAGES_DIR = Path(r"G:\DILL G\AI LLM\road-damage-vn-ntk.v2i.yolov12\train\images")
TRAIN_LABELS_DIR = Path(r"G:\DILL G\AI LLM\road-damage-vn-ntk.v2i.yolov12\train\labels")
UPLOADS_DIR = BACKEND_DIR / "uploads" / "reports"
DB_PATH = BACKEND_DIR / "data" / "road_damage_gis.db"

# Class mapping from data.yaml
CLASS_NAMES = {
    0: ("D00", "Nứt dọc"),
    1: ("D10", "Nứt ngang"),
    2: ("D20", "Nứt da cá sấu"),
    3: ("D40", "Ổ gà"),
}

# 9 Citizen Reporters
REPORTERS = [
    {
        "id": "seed-user-reporter_1",
        "full_name": "Trần Thị Lan",
        "email": "reporter1.demo@roadgis.local",
        "phone": "0901000002",
        "password": "Reporter@123",
        "count": 6,
    },
    {
        "id": "seed-user-reporter_2",
        "full_name": "Lê Văn Minh",
        "email": "reporter2.demo@roadgis.local",
        "phone": "0901000003",
        "password": "Reporter@123",
        "count": 6,
    },
    {
        "id": "seed-user-reporter_3",
        "full_name": "Nguyễn Văn Hùng",
        "email": "reporter3.demo@roadgis.local",
        "phone": "0901000004",
        "password": "Reporter@123",
        "count": 6,
    },
    {
        "id": "seed-user-reporter_4",
        "full_name": "Phạm Thị Mai",
        "email": "reporter4.demo@roadgis.local",
        "phone": "0901000005",
        "password": "Reporter@123",
        "count": 6,
    },
    {
        "id": "seed-user-reporter_5",
        "full_name": "Võ Hoàng Long",
        "email": "reporter5.demo@roadgis.local",
        "phone": "0901000006",
        "password": "Reporter@123",
        "count": 6,
    },
    {
        "id": "seed-user-reporter_6",
        "full_name": "Đặng Thu Thảo",
        "email": "reporter6.demo@roadgis.local",
        "phone": "0901000007",
        "password": "Reporter@123",
        "count": 5,
    },
    {
        "id": "seed-user-reporter_7",
        "full_name": "Bùi Thanh Tùng",
        "email": "reporter7.demo@roadgis.local",
        "phone": "0901000008",
        "password": "Reporter@123",
        "count": 5,
    },
    {
        "id": "seed-user-reporter_8",
        "full_name": "Đỗ Hoài Nam",
        "email": "reporter8.demo@roadgis.local",
        "phone": "0901000009",
        "password": "Reporter@123",
        "count": 5,
    },
    {
        "id": "seed-user-reporter_9",
        "full_name": "Trương Ngọc Ánh",
        "email": "reporter9.demo@roadgis.local",
        "phone": "0901000010",
        "password": "Reporter@123",
        "count": 5,
    },
]

# 50 Detailed Locations in Binh Duong
LOCATIONS = [
    # --- TP. Thủ Dầu Một (16 điểm) ---
    {"road": "Đại lộ Bình Dương", "ward": "Phú Hòa", "district": "Thủ Dầu Một", "lat": 10.9812, "lon": 106.6710, "num": "230"},
    {"road": "Đường Phú Lợi", "ward": "Phú Lợi", "district": "Thủ Dầu Một", "lat": 10.9856, "lon": 106.6834, "num": "88"},
    {"road": "Đường Lê Hồng Phong", "ward": "Phú Hòa", "district": "Thủ Dầu Một", "lat": 10.9741, "lon": 106.6805, "num": "45"},
    {"road": "Đường Cách Mạng Tháng 8", "ward": "Phú Cường", "district": "Thủ Dầu Một", "lat": 10.9765, "lon": 106.6542, "num": "112"},
    {"road": "Đường Yersin", "ward": "Hiệp Thành", "district": "Thủ Dầu Một", "lat": 10.9823, "lon": 106.6621, "num": "65"},
    {"road": "Đường Huỳnh Văn Lũy", "ward": "Phú Mỹ", "district": "Thủ Dầu Một", "lat": 10.9934, "lon": 106.6755, "num": "205"},
    {"road": "Đường Thích Quảng Đức", "ward": "Phú Cường", "district": "Thủ Dầu Một", "lat": 10.9715, "lon": 106.6612, "num": "18"},
    {"road": "Đường 30 Tháng 4", "ward": "Chánh Nghĩa", "district": "Thủ Dầu Một", "lat": 10.9698, "lon": 106.6685, "num": "94"},
    {"road": "Đường Bác sĩ Yersin", "ward": "Phú Cường", "district": "Thủ Dầu Một", "lat": 10.9792, "lon": 106.6580, "num": "34"},
    {"road": "Đường Nguyễn Du", "ward": "Phú Cường", "district": "Thủ Dầu Một", "lat": 10.9750, "lon": 106.6521, "num": "12"},
    {"road": "Đường Phan Bội Châu", "ward": "Phú Cường", "district": "Thủ Dầu Một", "lat": 10.9778, "lon": 106.6558, "num": "56"},
    {"road": "Đường Ngô Quyền", "ward": "Phú Cường", "district": "Thủ Dầu Một", "lat": 10.9789, "lon": 106.6534, "num": "82"},
    {"road": "Đường Hoàng Văn Thụ", "ward": "Chánh Nghĩa", "district": "Thủ Dầu Một", "lat": 10.9672, "lon": 106.6641, "num": "29"},
    {"road": "Đường Trần Văn Ơn", "ward": "Phú Hòa", "district": "Thủ Dầu Một", "lat": 10.9830, "lon": 106.6789, "num": "150"},
    {"road": "Đường D1", "ward": "Phú Hòa", "district": "Thủ Dầu Một", "lat": 10.9805, "lon": 106.6762, "num": "38"},
    {"road": "Đường Định Hòa 02", "ward": "Định Hòa", "district": "Thủ Dầu Một", "lat": 11.0145, "lon": 106.6620, "num": "104"},

    # --- TP. Thuận An (12 điểm) ---
    {"road": "Quốc lộ 13", "ward": "Lái Thiêu", "district": "Thuận An", "lat": 10.9125, "lon": 106.6987, "num": "15"},
    {"road": "Đường ĐT743", "ward": "An Phú", "district": "Thuận An", "lat": 10.9412, "lon": 106.7155, "num": "450"},
    {"road": "Đường ĐT743B", "ward": "Bình Hòa", "district": "Thuận An", "lat": 10.9256, "lon": 106.7120, "num": "128"},
    {"road": "Đường Nguyễn Văn Tiết", "ward": "Lái Thiêu", "district": "Thuận An", "lat": 10.9189, "lon": 106.6995, "num": "75"},
    {"road": "Đường Phan Đình Phùng", "ward": "Lái Thiêu", "district": "Thuận An", "lat": 10.9152, "lon": 106.6934, "num": "42"},
    {"road": "Đường Cách Mạng Tháng 8", "ward": "An Thạnh", "district": "Thuận An", "lat": 10.9320, "lon": 106.6890, "num": "310"},
    {"road": "Đường An Phú 04", "ward": "An Phú", "district": "Thuận An", "lat": 10.9485, "lon": 106.7210, "num": "19"},
    {"road": "Đường Thuận Giao 16", "ward": "Thuận Giao", "district": "Thuận An", "lat": 10.9521, "lon": 106.7089, "num": "84"},
    {"road": "Đường Bùi Hữu Nghĩa", "ward": "Bình Hòa", "district": "Thuận An", "lat": 10.9210, "lon": 106.7055, "num": "62"},
    {"road": "Đường Vĩnh Phú 41", "ward": "Vĩnh Phú", "district": "Thuận An", "lat": 10.8985, "lon": 106.6942, "num": "28"},
    {"road": "Đường Bình Hòa 24", "ward": "Bình Hòa", "district": "Thuận An", "lat": 10.9288, "lon": 106.7180, "num": "55"},
    {"road": "Đường Gia Long", "ward": "Lái Thiêu", "district": "Thuận An", "lat": 10.9110, "lon": 106.6912, "num": "33"},

    # --- TP. Dĩ An (12 điểm) ---
    {"road": "Đường ĐT743", "ward": "Dĩ An", "district": "Dĩ An", "lat": 10.9034, "lon": 106.7621, "num": "120"},
    {"road": "Đường Nguyễn An Ninh", "ward": "Dĩ An", "district": "Dĩ An", "lat": 10.8980, "lon": 106.7695, "num": "67"},
    {"road": "Đường Trần Hưng Đạo", "ward": "Đông Hòa", "district": "Dĩ An", "lat": 10.8925, "lon": 106.7740, "num": "145"},
    {"road": "Đường Lý Thường Kiệt", "ward": "Dĩ An", "district": "Dĩ An", "lat": 10.9012, "lon": 106.7650, "num": "89"},
    {"road": "Quốc lộ 1K", "ward": "Đông Hòa", "district": "Dĩ An", "lat": 10.8875, "lon": 106.7812, "num": "210"},
    {"road": "Đường Thống Nhất", "ward": "Đông Hòa", "district": "Dĩ An", "lat": 10.8910, "lon": 106.7790, "num": "52"},
    {"road": "Đường Hai Bà Trưng", "ward": "Dĩ An", "district": "Dĩ An", "lat": 10.8995, "lon": 106.7680, "num": "114"},
    {"road": "Đường Cô Bắc", "ward": "Dĩ An", "district": "Dĩ An", "lat": 10.9020, "lon": 106.7665, "num": "24"},
    {"road": "Đường Nguyễn Thị Minh Khai", "ward": "Tân Đông Hiệp", "district": "Dĩ An", "lat": 10.9150, "lon": 106.7580, "num": "180"},
    {"road": "Đường Trương Văn Vĩnh", "ward": "Tân Đông Hiệp", "district": "Dĩ An", "lat": 10.9180, "lon": 106.7545, "num": "76"},
    {"road": "Đường Chiêu Liêu", "ward": "Tân Đông Hiệp", "district": "Dĩ An", "lat": 10.9220, "lon": 106.7490, "num": "95"},
    {"road": "Đường Bùi Thị Xuân", "ward": "Tân Bình", "district": "Dĩ An", "lat": 10.9280, "lon": 106.7430, "num": "135"},

    # --- TX. Bến Cát (5 điểm) ---
    {"road": "Quốc lộ 13", "ward": "Mỹ Phước", "district": "Bến Cát", "lat": 11.1350, "lon": 106.6120, "num": "520"},
    {"road": "Đường ĐT744", "ward": "An Tây", "district": "Bến Cát", "lat": 11.1480, "lon": 106.5920, "num": "85"},
    {"road": "Đường 30 Tháng 4", "ward": "Mỹ Phước", "district": "Bến Cát", "lat": 11.1390, "lon": 106.6080, "num": "110"},
    {"road": "Đường D11", "ward": "Thới Hòa", "district": "Bến Cát", "lat": 11.1210, "lon": 106.6250, "num": "45"},
    {"road": "Đường NE8", "ward": "Thới Hòa", "district": "Bến Cát", "lat": 11.1180, "lon": 106.6290, "num": "92"},

    # --- TP. Tân Uyên (5 điểm) ---
    {"road": "Đường ĐT746", "ward": "Uyên Hưng", "district": "Tân Uyên", "lat": 11.0650, "lon": 106.7720, "num": "240"},
    {"road": "Đường ĐT747", "ward": "Thái Hòa", "district": "Tân Uyên", "lat": 11.0320, "lon": 106.7510, "num": "165"},
    {"road": "Đường ĐT747B", "ward": "Tân Phước Khánh", "district": "Tân Uyên", "lat": 11.0180, "lon": 106.7380, "num": "98"},
    {"road": "Đường ĐT742", "ward": "Phú Chánh", "district": "Tân Uyên", "lat": 11.0480, "lon": 106.7150, "num": "72"},
    {"road": "Đường Tân Phước Khánh 07", "ward": "Tân Phước Khánh", "district": "Tân Uyên", "lat": 11.0220, "lon": 106.7410, "num": "31"},
]


def seed_database():
    print("=== SEEDING 50 BINH DUONG REPORTS WITH REAL YOLO IMAGES ===")
    
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Ensure 9 Citizen Reporters exist
    print("1. Checking & creating 9 Citizen Reporter accounts...")
    now_iso = datetime.now(timezone.utc).isoformat()
    for rep in REPORTERS:
        cursor.execute("SELECT id FROM users WHERE lower(email) = lower(?)", (rep["email"],))
        existing = cursor.fetchone()
        pwd_hash = hash_password(rep["password"])
        if existing:
            cursor.execute(
                "UPDATE users SET full_name = ?, phone = ?, password_hash = ?, role = 'reporter', updated_at = ? WHERE id = ?",
                (rep["full_name"], rep["phone"], pwd_hash, now_iso, rep["id"]),
            )
            print(f"   Updated user {rep['email']}")
        else:
            cursor.execute(
                """
                INSERT INTO users (id, full_name, email, phone, password_hash, role, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 'reporter', ?, ?)
                """,
                (rep["id"], rep["full_name"], rep["email"], rep["phone"], pwd_hash, now_iso, now_iso),
            )
            print(f"   Created user {rep['email']}")
    conn.commit()

    # 2. Collect eligible images from G: drive
    print(f"2. Scanning images in {TRAIN_IMAGES_DIR}...")
    if not TRAIN_IMAGES_DIR.exists() or not TRAIN_LABELS_DIR.exists():
        raise FileNotFoundError("YOLO dataset path not found on G: drive!")

    image_files = list(TRAIN_IMAGES_DIR.glob("*.jpg")) + list(TRAIN_IMAGES_DIR.glob("*.png"))
    print(f"   Found {len(image_files)} images total.")

    valid_pairs = []
    for img_p in image_files:
        label_p = TRAIN_LABELS_DIR / f"{img_p.stem}.txt"
        if label_p.exists() and label_p.stat().st_size > 0:
            valid_pairs.append((img_p, label_p))

    print(f"   Found {len(valid_pairs)} images with valid non-empty labels.")
    if len(valid_pairs) < 50:
        raise ValueError(f"Need at least 50 images with labels, but only found {len(valid_pairs)}!")

    # Deterministic sample of 50 images to avoid duplicates
    random.seed(20260927)
    selected_pairs = random.sample(valid_pairs, 50)
    print(f"   Selected 50 distinct images.")

    # 3. Prepare distribution of 50 reports to 9 reporters
    assigned_reporters = []
    for rep in REPORTERS:
        assigned_reporters.extend([rep["id"]] * rep["count"])
    assert len(assigned_reporters) == 50

    # Status distribution: 20 pending, 15 processing, 10 repaired, 5 rejected
    statuses = (
        ["pending"] * 20 +
        ["processing"] * 15 +
        ["repaired"] * 10 +
        ["rejected"] * 5
    )
    # Shuffle statuses so each district gets diverse statuses
    random.seed(42)
    random.shuffle(statuses)

    # 4. Insert 50 reports
    print("3. Generating and inserting 50 reports into database...")
    created_count = 0

    for idx, (img_path, label_path) in enumerate(selected_pairs, 1):
        report_id = f"seed-bd-{idx:03d}"
        dest_filename = f"seed_bd_{idx:03d}.jpg"
        dest_path = UPLOADS_DIR / dest_filename
        
        # Copy image to uploads
        shutil.copy2(img_path, dest_path)
        
        # Read image dimensions
        with Image.open(dest_path) as im:
            img_w, img_h = im.size

        # Parse labels
        detections = []
        primary_damage_type = "D40"
        primary_class_name = "Ổ gà"

        with open(label_path, "r", encoding="utf-8") as f:
            lines = f.readlines()

        for l in lines:
            parts = l.strip().split()
            if len(parts) >= 5:
                cls_id = int(parts[0])
                xc = float(parts[1])
                yc = float(parts[2])
                w = float(parts[3])
                h = float(parts[4])

                x1 = round(max(0.0, (xc - w / 2) * img_w), 1)
                y1 = round(max(0.0, (yc - h / 2) * img_h), 1)
                x2 = round(min(float(img_w), (xc + w / 2) * img_w), 1)
                y2 = round(min(float(img_h), (yc + h / 2) * img_h), 1)

                dtype, cname = CLASS_NAMES.get(cls_id, ("D40", "Ổ gà"))
                conf = round(random.uniform(0.74, 0.96), 2)
                
                detections.append({
                    "class_id": cls_id,
                    "damage_type": dtype,
                    "class_name": cname,
                    "confidence": conf,
                    "bbox": {
                        "x1": x1,
                        "y1": y1,
                        "x2": x2,
                        "y2": y2,
                    }
                })

        if detections:
            primary_damage_type = detections[0]["damage_type"]
            primary_class_name = detections[0]["class_name"]

        detections_payload = {
            "success": True,
            "image_width": img_w,
            "image_height": img_h,
            "detections_count": len(detections),
            "detections": detections,
            "processing_time_ms": round(random.uniform(70.0, 140.0), 2),
            "message": f"Phát hiện {len(detections)} vùng hư hỏng ({primary_class_name})." if detections else "Không phát hiện hư hỏng mặt đường."
        }

        loc = LOCATIONS[idx - 1]
        user_id = assigned_reporters[idx - 1]
        status = statuses[idx - 1]

        # Timestamps over past 14 days
        days_ago = random.randint(1, 14)
        hour = random.randint(7, 18)
        minute = random.randint(0, 59)
        created_dt = datetime.now(timezone.utc) - timedelta(days=days_ago, hours=18 - hour, minutes=minute)
        created_at = created_dt.isoformat()
        updated_at = (created_dt + timedelta(hours=random.randint(1, 6))).isoformat()
        location_recorded_at = (created_dt - timedelta(seconds=random.randint(10, 60))).isoformat()

        # Specific attributes based on status
        assigned_engineer_id = None
        claimed_by_engineer_id = None
        claimed_at = None
        claim_status = None
        field_status = None
        survey_started_at = None
        survey_completed_at = None
        field_verified_damage_type = None
        field_severity = None
        field_priority = None
        field_note = None
        admin_note = None

        if status == "processing":
            assigned_engineer_id = "seed-user-engineer_a" if idx % 2 == 0 else "seed-user-engineer_b"
            claimed_by_engineer_id = assigned_engineer_id
            claimed_at = (created_dt + timedelta(hours=1)).isoformat()
            claim_status = "claimed"
            field_status = "in_progress" if idx % 3 != 0 else "surveyed"
            if field_status == "surveyed":
                survey_started_at = (created_dt + timedelta(hours=2)).isoformat()
                survey_completed_at = (created_dt + timedelta(hours=3)).isoformat()
                field_verified_damage_type = primary_damage_type
                field_severity = "high" if primary_damage_type == "D40" else "medium"
                field_priority = "high"
                field_note = f"Đã có mặt tại hiện trường đường {loc['road']}. Hư hỏng đúng mô tả AI ({primary_damage_type})."
        elif status == "repaired":
            assigned_engineer_id = "seed-user-engineer_a"
            claimed_by_engineer_id = "seed-user-engineer_a"
            claimed_at = (created_dt + timedelta(hours=1)).isoformat()
            claim_status = "completed"
            field_status = "completed"
            survey_completed_at = (created_dt + timedelta(hours=24)).isoformat()
            field_verified_damage_type = primary_damage_type
            field_severity = "high"
            field_priority = "urgent"
            field_note = "Đơn vị duy tu đã thi công trải thảm nhựa nóng hoàn tất. Nghiệm thu đạt chuẩn."
            admin_note = "Đã xác nhận biên bản hoàn thành thi công."
        elif status == "rejected":
            admin_note = "Ảnh chụp mờ hoặc điểm hư hỏng thuộc đất dự án tư nhân, không thuộc quản lý giao thông đô thị."

        note_sample = f"Phát hiện {primary_class_name.lower()} xuất hiện tại số {loc['num']} {loc['road']}, cần kiểm tra xử lý."
        formatted_address = f"Số {loc['num']} {loc['road']}, Phường {loc['ward']}, {loc['district']}, Tỉnh Bình Dương"

        # Check existing report
        cursor.execute("SELECT id FROM reports WHERE id = ?", (report_id,))
        exists = cursor.fetchone()

        fields = (
            report_id,
            user_id,
            f"reports/{dest_filename}",
            loc["lat"],
            loc["lon"],
            random.uniform(4.0, 9.5),
            "camera_gps",
            location_recorded_at,
            note_sample,
            "success",
            status,
            detections_payload["message"],
            json.dumps(detections_payload, ensure_ascii=False),
            admin_note,
            None,
            0,
            created_at,
            updated_at,
            assigned_engineer_id,
            claimed_by_engineer_id,
            claimed_at,
            claim_status,
            field_status,
            survey_started_at,
            survey_completed_at,
            field_verified_damage_type,
            field_severity,
            field_priority,
            field_note,
            loc["road"],
            loc["ward"],
            loc["district"],
            "Bình Dương",
            formatted_address,
        )

        if exists:
            cursor.execute(
                """
                UPDATE reports SET
                    user_id = ?, image_path = ?, latitude = ?, longitude = ?, gps_accuracy = ?,
                    location_source = ?, location_recorded_at = ?, note = ?, ai_status = ?,
                    status = ?, ai_message = ?, detections_json = ?, admin_note = ?,
                    corrected_damage_type = ?, is_ai_overridden = ?, created_at = ?, updated_at = ?,
                    assigned_engineer_id = ?, claimed_by_engineer_id = ?, claimed_at = ?,
                    claim_status = ?, field_status = ?, survey_started_at = ?, survey_completed_at = ?,
                    field_verified_damage_type = ?, field_severity = ?, field_priority = ?,
                    field_note = ?, road_name = ?, ward = ?, district = ?, province = ?, formatted_address = ?
                WHERE id = ?
                """,
                fields[1:] + (report_id,),
            )
        else:
            cursor.execute(
                """
                INSERT INTO reports (
                    id, user_id, image_path, latitude, longitude, gps_accuracy,
                    location_source, location_recorded_at, note, ai_status,
                    status, ai_message, detections_json, admin_note,
                    corrected_damage_type, is_ai_overridden, created_at, updated_at,
                    assigned_engineer_id, claimed_by_engineer_id, claimed_at,
                    claim_status, field_status, survey_started_at, survey_completed_at,
                    field_verified_damage_type, field_severity, field_priority,
                    field_note, road_name, ward, district, province, formatted_address
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                fields,
            )
        created_count += 1

    conn.commit()
    conn.close()

    print(f"\nSUCCESS! Inserted/Updated {created_count} reports in Binh Duong.")
    print("District Breakdown:")
    for d in ["Thủ Dầu Một", "Thuận An", "Dĩ An", "Bến Cát", "Tân Uyên"]:
        count = sum(1 for l in LOCATIONS if l["district"] == d)
        print(f"  - {d}: {count} reports")

    print("\nReporter Breakdown:")
    for rep in REPORTERS:
        print(f"  - [{rep['id']}] {rep['full_name']} ({rep['email']}): {rep['count']} reports")


if __name__ == "__main__":
    seed_database()
