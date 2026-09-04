from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
import sys
from uuid import uuid4

BACKEND_SERVICE_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_SERVICE_DIR))

from app.config import get_settings
from app.database import get_connection, init_database
from app.modules.auth.repository import AuthRepository
from app.modules.auth.schemas import RegisterRequest
from app.modules.gis.repository import GisRepository
from app.modules.reports.repository import ReportRepository
from app.modules.reports.schemas import AiDetectionResult, BoundingBox, DamageDetection


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def assert_true(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def build_ai_result() -> AiDetectionResult:
    return AiDetectionResult(
        success=True,
        image_width=1280,
        image_height=720,
        detections_count=1,
        detections=[
            DamageDetection(
                class_id=3,
                damage_type="D40",
                class_name="Ổ gà",
                confidence=0.91,
                bbox=BoundingBox(
                    x1=120.0,
                    y1=220.0,
                    x2=860.0,
                    y2=560.0,
                ),
            )
        ],
        processing_time_ms=88.4,
        message="Phát hiện 1 hư hỏng mặt đường.",
    )


def main() -> None:
    init_database()
    settings = get_settings()

    test_suffix = uuid4().hex[:8]
    test_email = f"db-check-{test_suffix}@local.test"
    test_user_id: str | None = None
    test_report_id = f"db-check-report-{test_suffix}"
    now = datetime.now(timezone.utc).isoformat()

    with get_connection() as connection:
        auth_repository = AuthRepository(connection)
        report_repository = ReportRepository(connection)
        gis_repository = GisRepository(connection, settings)

        try:
            created_user = auth_repository.create_user(
                RegisterRequest(
                    fullName="DB Runtime Check User",
                    email=test_email,
                    phone="0912345678",
                    password="Runtime@123",
                )
            )
            test_user_id = created_user.id
            found_user = auth_repository.get_user_by_email(test_email)
            assert_true(found_user is not None, "Không tạo được user runtime test.")

            created_report = report_repository.create_report(
                report_id=test_report_id,
                user_id=test_user_id,
                image_path="reports/db-runtime-check.png",
                latitude=10.7765,
                longitude=106.7012,
                gps_accuracy=12.5,
                location_source="camera_gps",
                location_recorded_at=now,
                note="[local-runtime] Báo cáo kiểm tra CRUD database runtime.",
                ai_status="success",
                status="pending_verification",
                ai_result=build_ai_result(),
                created_at=now,
                updated_at=now,
            )
            assert_true(created_report.id == test_report_id, "Không tạo được report runtime test.")
            assert_true(created_report.status == "pending", "Report mới tạo không normalize đúng status.")

            loaded_report = report_repository.get_report(test_report_id, user_id=test_user_id)
            assert_true(loaded_report is not None, "Không đọc lại được report vừa tạo.")
            assert_true(loaded_report.location_source == "camera_gps", "GIS field location_source không lưu đúng.")

            updated_status = report_repository.update_report_status(
                test_report_id,
                status="processing",
                admin_note="Đang kiểm tra ngoài hiện trường.",
                updated_at=datetime.now(timezone.utc).isoformat(),
                include_admin_fields=True,
            )
            assert_true(updated_status is not None and updated_status.status == "processing", "Không cập nhật được status report.")

            updated_damage = report_repository.update_report_damage_type(
                test_report_id,
                corrected_damage_type="D20",
                is_ai_overridden=True,
                updated_at=datetime.now(timezone.utc).isoformat(),
                include_admin_fields=True,
            )
            assert_true(
                updated_damage is not None and updated_damage.corrected_damage_type == "D20",
                "Không cập nhật được corrected_damage_type.",
            )

            admin_list, admin_total = report_repository.list_reports(
                limit=20,
                offset=0,
                search=test_report_id,
                include_admin_fields=True,
            )
            assert_true(admin_total >= 1, "Admin list không thấy report runtime test.")
            assert_true(any(item.id == test_report_id for item in admin_list), "Report runtime test không xuất hiện trong admin list.")

            gis_result = gis_repository.search_report_features(
                bbox=(106.69, 10.77, 106.71, 10.78),
                limit=50,
            )
            assert_true(
                any(feature.id == test_report_id for feature in gis_result.features),
                "GIS search không trả về report runtime test.",
            )

            print("=== RUNTIME DB CRUD CHECK ===")
            print("Engine: SQLite")
            print(f"Database path: {settings.resolved_database_path}")
            print(f"Created user: {test_email}")
            print(f"Created report: {test_report_id}")
            print("Auth create/read: PASS")
            print("Report create/read/update: PASS")
            print("Admin list search: PASS")
            print("GIS search: PASS")
            print("Kết luận: DB runtime hiện tại đủ để phục vụ auth, reports, GIS và admin ở local/dev.")
        finally:
            connection.execute("DELETE FROM reports WHERE id = ?", (test_report_id,))
            if test_user_id:
                connection.execute("DELETE FROM refresh_tokens WHERE user_id = ?", (test_user_id,))
                connection.execute("DELETE FROM users WHERE id = ?", (test_user_id,))
            connection.commit()


if __name__ == "__main__":
    main()
