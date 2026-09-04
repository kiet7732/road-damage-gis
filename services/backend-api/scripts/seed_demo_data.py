from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import hashlib
from pathlib import Path
import secrets

from PIL import Image, ImageDraw

from app.config import get_settings
from app.database import get_connection, init_database
from scripts.data_scopes import (
    SEED_REPORT_ID_PREFIX,
    SEED_SCOPE,
    SEED_TAG,
    SEED_USER_ID_PREFIX,
)


@dataclass(frozen=True)
class DemoUser:
    key: str
    email: str
    password: str
    full_name: str
    phone: str
    role: str


@dataclass(frozen=True)
class DemoReport:
    report_id: str
    user_key: str
    image_name: str
    latitude: float
    longitude: float
    gps_accuracy: float
    note: str
    ai_status: str
    status: str
    damage_type: str
    class_name: str
    confidence: float
    created_at_offset_days: int
    location_recorded_at_offset_hours: int = 0
    corrected_damage_type: str | None = None
    is_ai_overridden: bool = False
    admin_note: str | None = None


DEMO_USERS: tuple[DemoUser, ...] = (
    DemoUser(
        key="admin",
        email="admin.demo@roadgis.local",
        password="Admin@123",
        full_name="Nguyen Van Admin",
        phone="0901000001",
        role="admin",
    ),
    DemoUser(
        key="reporter_1",
        email="reporter1.demo@roadgis.local",
        password="Reporter@123",
        full_name="Tran Thi Reporter 1",
        phone="0901000002",
        role="reporter",
    ),
    DemoUser(
        key="reporter_2",
        email="reporter2.demo@roadgis.local",
        password="Reporter@123",
        full_name="Le Van Reporter 2",
        phone="0901000003",
        role="reporter",
    ),
)


DEMO_REPORTS: tuple[DemoReport, ...] = (
    DemoReport(
        report_id=f"{SEED_REPORT_ID_PREFIX}001",
        user_key="reporter_1",
        image_name="seed-report-001.png",
        latitude=10.984680,
        longitude=106.678080,
        gps_accuracy=12.4,
        note=f"{SEED_TAG} Ổ gà lớn gần khu vực cần kiểm tra giao diện bản đồ.",
        ai_status="success",
        status="pending_verification",
        damage_type="D40",
        class_name="Ổ gà",
        confidence=0.91,
        created_at_offset_days=6,
        location_recorded_at_offset_hours=1,
    ),
    DemoReport(
        report_id=f"{SEED_REPORT_ID_PREFIX}002",
        user_key="reporter_1",
        image_name="seed-report-002.png",
        latitude=10.984992,
        longitude=106.678514,
        gps_accuracy=9.6,
        note=f"{SEED_TAG} Nứt dọc kéo dài trong cùng cụm tọa độ để test marker gần nhau.",
        ai_status="success",
        status="pending_verification",
        damage_type="D00",
        class_name="Nứt dọc",
        confidence=0.87,
        created_at_offset_days=5,
        location_recorded_at_offset_hours=2,
    ),
    DemoReport(
        report_id=f"{SEED_REPORT_ID_PREFIX}003",
        user_key="reporter_1",
        image_name="seed-report-003.png",
        latitude=10.984341,
        longitude=106.677612,
        gps_accuracy=15.1,
        note=f"{SEED_TAG} Nứt ngang gần vị trí trung tâm để kiểm tra popup chi tiết.",
        ai_status="success",
        status="in_progress",
        damage_type="D10",
        class_name="Nứt ngang",
        confidence=0.84,
        created_at_offset_days=4,
        location_recorded_at_offset_hours=1,
        admin_note="Đã chuyển đơn vị bảo trì kiểm tra thực địa.",
    ),
    DemoReport(
        report_id=f"{SEED_REPORT_ID_PREFIX}004",
        user_key="reporter_2",
        image_name="seed-report-004.png",
        latitude=10.985214,
        longitude=106.677845,
        gps_accuracy=11.2,
        note=f"{SEED_TAG} Mặt đường nứt da cá sấu ngay cạnh cụm test giao diện.",
        ai_status="success",
        status="in_progress",
        damage_type="D20",
        class_name="Nứt da cá sấu",
        confidence=0.89,
        created_at_offset_days=3,
        location_recorded_at_offset_hours=3,
        admin_note="Đang lập kế hoạch xử lý.",
    ),
    DemoReport(
        report_id=f"{SEED_REPORT_ID_PREFIX}005",
        user_key="reporter_2",
        image_name="seed-report-005.png",
        latitude=10.983918,
        longitude=106.678932,
        gps_accuracy=13.8,
        note=f"{SEED_TAG} AI nhận nhầm trong khu vực test, cán bộ đã sửa sang nứt da cá sấu.",
        ai_status="success",
        status="resolved",
        damage_type="D00",
        class_name="Nứt dọc",
        confidence=0.73,
        created_at_offset_days=2,
        location_recorded_at_offset_hours=2,
        corrected_damage_type="D20",
        is_ai_overridden=True,
        admin_note="Đã xác minh và sửa lại kết quả AI trước khi hoàn tất.",
    ),
    DemoReport(
        report_id=f"{SEED_REPORT_ID_PREFIX}006",
        user_key="reporter_2",
        image_name="seed-report-006.png",
        latitude=10.985561,
        longitude=106.678307,
        gps_accuracy=10.3,
        note=f"{SEED_TAG} Ổ gà đã được sửa xong gần khu vực test để xem trạng thái hoàn thành.",
        ai_status="manual_review_required",
        status="resolved",
        damage_type="D40",
        class_name="Ổ gà",
        confidence=0.68,
        created_at_offset_days=1,
        location_recorded_at_offset_hours=1,
        admin_note="AI lỗi lúc đầu, cán bộ kiểm tra thủ công và xác nhận đã xử lý.",
    ),
    DemoReport(
        report_id=f"{SEED_REPORT_ID_PREFIX}007",
        user_key="reporter_1",
        image_name="seed-report-007.png",
        latitude=10.983504,
        longitude=106.677401,
        gps_accuracy=8.9,
        note=f"{SEED_TAG} Vị trí trong cụm test đã được xác định phản ánh không hợp lệ.",
        ai_status="success",
        status="rejected",
        damage_type="D10",
        class_name="Nứt ngang",
        confidence=0.59,
        created_at_offset_days=2,
        location_recorded_at_offset_hours=4,
        admin_note="Ảnh không phản ánh đúng vị trí mặt đường cần xử lý.",
    ),
    DemoReport(
        report_id=f"{SEED_REPORT_ID_PREFIX}008",
        user_key="reporter_2",
        image_name="seed-report-008.png",
        latitude=10.984126,
        longitude=106.679244,
        gps_accuracy=7.4,
        note=f"{SEED_TAG} Điểm hư hỏng mới trong khu vực test để kiểm tra luồng chờ xác minh.",
        ai_status="manual_review_required",
        status="pending_verification",
        damage_type="D20",
        class_name="Nứt da cá sấu",
        confidence=0.51,
        created_at_offset_days=0,
        location_recorded_at_offset_hours=1,
        admin_note="AI chưa nhận dạng rõ, cần cán bộ xác minh thủ công.",
    ),
)


def _hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        120_000,
    ).hex()

    return f"pbkdf2_sha256$120000${salt}${password_hash}"


def _iso_datetime(days_ago: int, *, hour: int = 8, minute: int = 30) -> str:
    base = datetime.now(timezone.utc) - timedelta(days=days_ago)
    normalized = base.replace(hour=hour, minute=minute, second=0, microsecond=0)
    return normalized.isoformat()


def _iso_datetime_with_offset(days_ago: int, *, hour: int = 8, minute: int = 30, offset_hours: int = 0) -> str:
    base = datetime.now(timezone.utc) - timedelta(days=days_ago)
    normalized = base.replace(hour=hour, minute=minute, second=0, microsecond=0)
    return (normalized + timedelta(hours=offset_hours)).isoformat()


def _build_ai_result_payload(report: DemoReport) -> dict:
    return {
        "success": True,
        "image_width": 1280,
        "image_height": 720,
        "detections_count": 1,
        "detections": [
            {
                "class_id": None,
                "damage_type": report.damage_type,
                "class_name": report.class_name,
                "confidence": report.confidence,
                "bbox": {
                    "x1": 180.0,
                    "y1": 210.0,
                    "x2": 980.0,
                    "y2": 560.0,
                },
            }
        ],
        "processing_time_ms": 92.4,
        "message": f"Phát hiện 1 hư hỏng mặt đường ({report.class_name}).",
    }


def _table_exists(connection, table_name: str) -> bool:
    row = connection.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
        (table_name,),
    ).fetchone()
    return row is not None


def _draw_road_background(draw: ImageDraw.ImageDraw, *, width: int, height: int, accent: tuple[int, int, int]) -> None:
    draw.rectangle((0, 0, width, height), fill=(54, 58, 64))
    draw.rectangle((0, 0, width, 90), fill=(140, 190, 220))
    draw.rectangle((0, 90, width, 180), fill=(110, 150, 95))

    lane_center = width // 2
    for top in range(220, height, 100):
        draw.rectangle((lane_center - 10, top, lane_center + 10, top + 56), fill=(245, 215, 90))

    draw.rectangle((90, 200, width - 90, height - 80), outline=accent, width=8)


def _draw_damage_overlay(
    draw: ImageDraw.ImageDraw,
    *,
    damage_type: str,
    corrected_damage_type: str | None,
) -> None:
    effective_type = corrected_damage_type or damage_type

    if effective_type == "D40":
        draw.ellipse((360, 320, 920, 560), fill=(45, 45, 45), outline=(25, 25, 25), width=6)
        draw.ellipse((460, 360, 820, 500), fill=(82, 110, 128))
        draw.text((420, 285), "Ổ gà / pothole", fill=(255, 255, 255))
        return

    if effective_type == "D00":
        for offset in (-40, 0, 40):
            draw.line((520 + offset, 240, 560 + offset, 560), fill=(20, 20, 20), width=6)
        draw.text((380, 205), "Nứt dọc / longitudinal crack", fill=(255, 255, 255))
        return

    if effective_type == "D10":
        for offset in (-36, 0, 36):
            draw.line((300, 360 + offset, 980, 330 + offset), fill=(20, 20, 20), width=6)
        draw.text((370, 290), "Nứt ngang / transverse crack", fill=(255, 255, 255))
        return

    if effective_type == "D20":
        polygons = (
            [(360, 300), (470, 250), (560, 320), (510, 410), (390, 400)],
            [(560, 320), (690, 270), (820, 330), (760, 450), (620, 430)],
            [(430, 410), (560, 360), (650, 470), (560, 560), (420, 520)],
        )
        for polygon in polygons:
            draw.polygon(polygon, outline=(18, 18, 18), fill=(70, 70, 70))
        draw.text((360, 215), "Nứt da cá sấu / alligator crack", fill=(255, 255, 255))


def _build_demo_image(
    path: Path,
    *,
    report: DemoReport,
    label: str,
    color: tuple[int, int, int],
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    width, height = 1280, 720
    image = Image.new("RGB", (width, height), color)
    draw = ImageDraw.Draw(image)

    _draw_road_background(draw, width=width, height=height, accent=color)
    _draw_damage_overlay(
        draw,
        damage_type=report.damage_type,
        corrected_damage_type=report.corrected_damage_type,
    )

    draw.rectangle((60, 22, 1220, 92), fill=(0, 0, 0))
    draw.text((86, 44), "Road Damage GIS - Seed Demo", fill=(255, 255, 255))
    draw.text((86, 590), label, fill=(255, 255, 255))

    if report.corrected_damage_type:
        draw.rectangle((720, 118, 1180, 200), fill=(108, 40, 40))
        draw.text((750, 140), f"AI gốc: {report.damage_type}", fill=(255, 255, 255))
        draw.text((750, 168), f"Đã sửa: {report.corrected_damage_type}", fill=(255, 255, 255))
    else:
        draw.rectangle((880, 118, 1180, 174), fill=(32, 96, 56))
        draw.text((910, 138), "AI đúng để demo", fill=(255, 255, 255))

    image.save(path, format="PNG")


def _ensure_demo_images(upload_dir: Path) -> None:
    palette = {
        "D00": (52, 73, 94),
        "D10": (41, 128, 185),
        "D20": (142, 68, 173),
        "D40": (192, 57, 43),
    }

    for report in DEMO_REPORTS:
        image_path = upload_dir / report.image_name
        effective_type = report.corrected_damage_type or report.damage_type
        label = f"{report.report_id} - {effective_type} - {report.note}"
        _build_demo_image(
            image_path,
            report=report,
            label=label,
            color=palette.get(effective_type, (52, 73, 94)),
        )


def seed_demo_users() -> dict[str, str]:
    settings = get_settings()
    init_database()

    user_ids: dict[str, str] = {}

    with get_connection() as connection:
        for demo_user in DEMO_USERS:
            existing = connection.execute(
                "SELECT id FROM users WHERE lower(email) = lower(?)",
                (demo_user.email,),
            ).fetchone()

            password_hash = _hash_password(demo_user.password)
            now = datetime.now(timezone.utc).isoformat()

            if existing is None:
                user_id = f"{SEED_USER_ID_PREFIX}{demo_user.key}"
                connection.execute(
                    """
                    INSERT INTO users (
                        id,
                        full_name,
                        email,
                        phone,
                        password_hash,
                        role,
                        created_at,
                        updated_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        user_id,
                        demo_user.full_name,
                        demo_user.email,
                        demo_user.phone,
                        password_hash,
                        demo_user.role,
                        now,
                        now,
                    ),
                )
            else:
                user_id = existing["id"]
                connection.execute(
                    """
                    UPDATE users
                    SET full_name = ?,
                        phone = ?,
                        password_hash = ?,
                        role = ?,
                        updated_at = ?
                    WHERE id = ?
                    """,
                    (
                        demo_user.full_name,
                        demo_user.phone,
                        password_hash,
                        demo_user.role,
                        now,
                        user_id,
                    ),
                )

            user_ids[demo_user.key] = user_id

        demo_user_id_values = tuple(user_ids.values())
        if demo_user_id_values:
            placeholders = ", ".join("?" for _ in demo_user_id_values)
            connection.execute(
                f"DELETE FROM refresh_tokens WHERE user_id IN ({placeholders})",
                demo_user_id_values,
            )

        connection.commit()

    return user_ids


def seed_demo_reports(user_ids: dict[str, str]) -> int:
    settings = get_settings()
    upload_dir = settings.resolved_upload_dir
    _ensure_demo_images(upload_dir)

    with get_connection() as connection:
        report_ids = tuple(report.report_id for report in DEMO_REPORTS)
        if report_ids:
            placeholders = ", ".join("?" for _ in report_ids)
            if _table_exists(connection, "report_engineer_actions"):
                connection.execute(
                    f"DELETE FROM report_engineer_actions WHERE report_id IN ({placeholders})",
                    report_ids,
                )
            connection.execute(
                f"DELETE FROM reports WHERE id IN ({placeholders})",
                report_ids,
            )

        for index, report in enumerate(DEMO_REPORTS):
            created_at = _iso_datetime(report.created_at_offset_days, hour=8 + (index % 5), minute=15)
            updated_at = _iso_datetime(report.created_at_offset_days, hour=14 + (index % 4), minute=45)
            location_recorded_at = _iso_datetime_with_offset(
                report.created_at_offset_days,
                hour=8 + (index % 5),
                minute=20,
                offset_hours=report.location_recorded_at_offset_hours,
            )
            relative_image_path = f"reports/{report.image_name}"
            ai_result_payload = _build_ai_result_payload(report)

            connection.execute(
                """
                INSERT INTO reports (
                    id,
                    user_id,
                    image_path,
                    latitude,
                    longitude,
                    gps_accuracy,
                    location_source,
                    location_recorded_at,
                    note,
                    ai_status,
                    status,
                    ai_message,
                    detections_json,
                    admin_note,
                    corrected_damage_type,
                    is_ai_overridden,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    report.report_id,
                    user_ids[report.user_key],
                    relative_image_path,
                    report.latitude,
                    report.longitude,
                    report.gps_accuracy,
                    SEED_SCOPE,
                    location_recorded_at,
                    report.note,
                    report.ai_status,
                    report.status,
                    ai_result_payload["message"],
                    json.dumps(ai_result_payload, ensure_ascii=False),
                    report.admin_note,
                    report.corrected_damage_type,
                    1 if report.is_ai_overridden else 0,
                    created_at,
                    updated_at,
                ),
            )

        connection.commit()

    return len(DEMO_REPORTS)


def print_demo_credentials() -> None:
    print("=== DEMO ACCOUNTS ===")
    for demo_user in DEMO_USERS:
        print(f"[{demo_user.role}] {demo_user.email} / {demo_user.password}")


def print_seed_summary() -> None:
    status_counter: dict[str, int] = {}
    damage_counter: dict[str, int] = {}

    for report in DEMO_REPORTS:
        status_counter[report.status] = status_counter.get(report.status, 0) + 1
        effective_damage = report.corrected_damage_type or report.damage_type
        damage_counter[effective_damage] = damage_counter.get(effective_damage, 0) + 1

    print("=== SEED SUMMARY ===")
    print("Statuses:")
    for key, value in status_counter.items():
        print(f"- {key}: {value}")

    print("Damage types:")
    for key, value in damage_counter.items():
        print(f"- {key}: {value}")


def main() -> None:
    user_ids = seed_demo_users()
    report_count = seed_demo_reports(user_ids)

    print_demo_credentials()
    print_seed_summary()
    print(f"Seeded users: {len(DEMO_USERS)}")
    print(f"Seeded reports: {report_count}")
    print(f"Data scope tag: {SEED_TAG}")
    print("Cleanup smoke data only: python scripts/cleanup_tagged_data.py --scope smoke")
    print("Demo seed completed successfully.")


if __name__ == "__main__":
    main()
