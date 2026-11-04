import json
import unittest
from uuid import uuid4

from app.database import get_connection, init_database
from app.modules.reports.repository import ReportRepository
from app.modules.reports.schemas import AiDetectionResult


class AiDamageFlowIsolationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_database()

    def setUp(self):
        self.connection = get_connection()
        self.repository = ReportRepository(self.connection)
        self.created_report_ids = []

    def tearDown(self):
        if self.created_report_ids:
            self.connection.execute("PRAGMA foreign_keys = OFF")
            placeholders = ", ".join(["?"] * len(self.created_report_ids))
            self.connection.execute(
                f"DELETE FROM report_engineer_actions WHERE report_id IN ({placeholders})",
                self.created_report_ids,
            )
            self.connection.execute(
                f"DELETE FROM reports WHERE id IN ({placeholders})",
                self.created_report_ids,
            )
            self.connection.execute("PRAGMA foreign_keys = ON")
            self.connection.commit()
        self.connection.close()

    def test_01_damage_detected_report_lifecycle(self):
        """Báo cáo có phát hiện hư hỏng: hiển thị trong manual-review và khả dụng cho kỹ sư."""
        report_id = f"test-dmg-{uuid4().hex[:8]}"
        self.created_report_ids.append(report_id)

        ai_result = AiDetectionResult(
            success=True,
            detections_count=1,
            detections=[{
                "class_id": 3,
                "damage_type": "D40",
                "class_name": "Ổ gà",
                "confidence": 0.91,
                "bbox": {"x1": 20.0, "y1": 20.0, "x2": 60.0, "y2": 60.0}
            }],
            message="AI phát hiện 1 ổ gà."
        )

        report = self.repository.create_report(
            report_id=report_id,
            user_id="citizen-01",
            image_path="test/pothole.jpg",
            latitude=10.762622,
            longitude=106.660172,
            gps_accuracy=3.0,
            location_source="camera_exif",
            location_recorded_at="2026-10-27T12:00:00Z",
            note="Ổ gà lớn trên đường",
            ai_status="success",
            status="pending",
            ai_result=ai_result,
            admin_approved_for_survey=1,
            created_at="2099-01-01T12:00:00Z",
            updated_at="2099-01-01T12:00:00Z",
        )

        self.assertEqual(report.ai_status, "success")

        # Admin: has_damage_detected=True (phục vụ /reports/manual-review)
        items_dmg, _ = self.repository.list_reports(has_damage_detected=True, limit=100)
        self.assertIn(report_id, [r.id for r in items_dmg])

        # Admin: has_damage_detected=False không được chứa report này
        items_no_dmg, _ = self.repository.list_reports(has_damage_detected=False, limit=100)
        self.assertNotIn(report_id, [r.id for r in items_no_dmg])

        # Kỹ sư: Khả dụng ngay
        eng_reports, _ = self.repository.list_engineer_reports(scope="available", engineer_id="eng-01", limit=100)
        self.assertIn(report_id, [r.id for r in eng_reports])

        # Kỹ sư: Xem được chi tiết
        eng_detail = self.repository.get_engineer_report(report_id, engineer_id="eng-01")
        self.assertIsNotNone(eng_detail)

    def test_02_no_damage_detected_isolation_and_approval(self):
        """Báo cáo KHÔNG phát hiện hư hỏng: ẩn hoàn toàn với kỹ sư cho tới khi Quản lý duyệt."""
        report_id = f"test-nodmg-{uuid4().hex[:8]}"
        self.created_report_ids.append(report_id)

        ai_result = AiDetectionResult(
            success=True,
            detections_count=0,
            detections=[],
            message="Không tìm thấy điểm hư hỏng."
        )

        report = self.repository.create_report(
            report_id=report_id,
            user_id="citizen-02",
            image_path="test/clean.jpg",
            latitude=10.762622,
            longitude=106.660172,
            gps_accuracy=4.0,
            location_source="camera_exif",
            location_recorded_at="2026-10-27T12:00:00Z",
            note="Mặt đường người dân gửi kiểm tra",
            ai_status="no_damage_detected",
            status="pending",
            ai_result=ai_result,
            admin_approved_for_survey=0,
            created_at="2099-01-01T12:00:00Z",
            updated_at="2099-01-01T12:00:00Z",
        )

        self.assertEqual(report.ai_status, "no_damage_detected")

        # Admin: has_damage_detected=False (phục vụ /statistics)
        items_no_dmg, _ = self.repository.list_reports(has_damage_detected=False, limit=100)
        self.assertIn(report_id, [r.id for r in items_no_dmg])

        # Admin: has_damage_detected=True không được chứa report này
        items_dmg, _ = self.repository.list_reports(has_damage_detected=True, limit=100)
        self.assertNotIn(report_id, [r.id for r in items_dmg])

        # Kỹ sư: Bị ẩn khỏi danh sách khả dụng
        eng_reports, _ = self.repository.list_engineer_reports(scope="available", engineer_id="eng-01", limit=100)
        self.assertNotIn(report_id, [r.id for r in eng_reports])

        # Kỹ sư: Không xem được chi tiết (trả về None)
        eng_detail = self.repository.get_engineer_report(report_id, engineer_id="eng-01")
        self.assertIsNone(eng_detail)

        # Kỹ sư: Bị ẩn khỏi radar GIS lân cận
        nearby = self.repository.list_nearby_reports(latitude=10.762622, longitude=106.660172, radius_meters=500.0)
        self.assertNotIn(report_id, [item.id for item in nearby])

        # Kỹ sư: Bị từ chối claim
        claim_attempt = self.repository.claim_engineer_report(report_id, engineer_id="eng-01", updated_at="2099-01-01T12:05:00Z")
        self.assertIsNone(claim_attempt)

        # HÀNH ĐỘNG: Admin phê duyệt cho kiểm tra
        approved = self.repository.approve_for_survey(
            report_id,
            actor_id="admin-master",
            admin_note="Đã xác nhận cho kiểm tra",
            updated_at="2099-01-01T12:10:00Z"
        )
        self.assertIsNotNone(approved)
        self.assertTrue(approved.admin_approved_for_survey)
        self.assertEqual(approved.field_status, "available_for_inspection")

        # Sau khi duyệt: Kỹ sư nhìn thấy trong danh sách khả dụng
        eng_reports_after, _ = self.repository.list_engineer_reports(scope="available", engineer_id="eng-01", limit=100)
        self.assertIn(report_id, [r.id for r in eng_reports_after])

        # Sau khi duyệt: Kỹ sư xem được chi tiết
        eng_detail_after = self.repository.get_engineer_report(report_id, engineer_id="eng-01")
        self.assertIsNotNone(eng_detail_after)

        # Sau khi duyệt: Kỹ sư thấy trên radar GIS
        nearby_after = self.repository.list_nearby_reports(latitude=10.762622, longitude=106.660172, radius_meters=500.0)
        self.assertIn(report_id, [item.id for item in nearby_after])

        # Sau khi duyệt: Kỹ sư claim thành công
        claim_after = self.repository.claim_engineer_report(report_id, engineer_id="eng-01", updated_at="2099-01-01T12:15:00Z")
        self.assertIsNotNone(claim_after)


if __name__ == "__main__":
    unittest.main()
