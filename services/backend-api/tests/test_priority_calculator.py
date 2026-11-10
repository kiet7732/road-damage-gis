import unittest

from app.modules.reports.priority_calculator import compute_priority_assessment
from app.modules.reports.schemas import (
    AdminReportResponse,
    AiDetectionResult,
    AiPreviewDetectionResult,
    BoundingBox,
    DamageDetection,
    ReporterReportResponse,
)


def _make_detection(damage_type: str, confidence: float) -> DamageDetection:
    return DamageDetection(
        damage_type=damage_type,
        class_name=damage_type,
        confidence=confidence,
        bbox=BoundingBox(x1=10, y1=10, x2=100, y2=100),
    )


class TestPriorityCalculator(unittest.TestCase):
    def test_three_labels_takes_top_two_level_1(self) -> None:
        # Có 3 nhãn D00 (65%), D10 (88%), D40 (76%) -> lấy 2 tỷ lệ cao nhất: 88% + 76% = 164% (>= 160% -> Cấp 1)
        ai_result = AiDetectionResult(
            success=True,
            detections_count=3,
            detections=[
                _make_detection("D00", 0.65),
                _make_detection("D10", 0.88),
                _make_detection("D40", 0.76),
            ],
            message="OK",
        )
        assessment = compute_priority_assessment(ai_result)
        self.assertAlmostEqual(assessment.score, 1.64, places=4)
        self.assertAlmostEqual(assessment.score_percent, 164.0, places=1)
        self.assertEqual(assessment.level_code, "level_1")
        self.assertEqual(assessment.level_number, 1)
        self.assertEqual(assessment.level_label, "Cấp 1 – Cực kỳ nghiêm trọng")
        self.assertEqual(len(assessment.top_detections), 2)
        self.assertEqual(assessment.top_detections[0].damage_type, "D10")
        self.assertEqual(assessment.top_detections[1].damage_type, "D40")

    def test_same_label_two_detections_level_2(self) -> None:
        # Hình chỉ có 1 loại nhãn D40 nhưng có 2 vị trí (72% và 64%) -> 72% + 64% = 136% (120% - <160% -> Cấp 2)
        ai_result = AiDetectionResult(
            success=True,
            detections_count=2,
            detections=[
                _make_detection("D40", 0.64),
                _make_detection("D40", 0.72),
            ],
            message="OK",
        )
        assessment = compute_priority_assessment(ai_result)
        self.assertAlmostEqual(assessment.score, 1.36, places=4)
        self.assertEqual(assessment.level_code, "level_2")
        self.assertEqual(assessment.level_label, "Cấp 2 – Nghiêm trọng")

    def test_single_detection_high_confidence_level_3(self) -> None:
        # Hình chỉ có 1 đối tượng D40 (86%) -> không có 2 thì lấy 1 -> 86% (80% - <120% -> Cấp 3)
        ai_result = AiDetectionResult(
            success=True,
            detections_count=1,
            detections=[_make_detection("D40", 0.86)],
            message="OK",
        )
        assessment = compute_priority_assessment(ai_result)
        self.assertAlmostEqual(assessment.score, 0.86, places=4)
        self.assertEqual(assessment.level_code, "level_3")
        self.assertEqual(assessment.level_label, "Cấp 3 – Cần khắc phục")
        self.assertEqual(len(assessment.top_detections), 1)

    def test_low_confidence_level_4(self) -> None:
        # 2 đối tượng sát ngưỡng lọc nhiễu 38% + 36% = 74% (< 80% -> Cấp 4)
        ai_result = AiDetectionResult(
            success=True,
            detections_count=2,
            detections=[
                _make_detection("D00", 0.38),
                _make_detection("D10", 0.36),
            ],
            message="OK",
        )
        assessment = compute_priority_assessment(ai_result)
        self.assertAlmostEqual(assessment.score, 0.74, places=4)
        self.assertEqual(assessment.level_code, "level_4")
        self.assertEqual(assessment.level_label, "Cấp 4 – Hư hỏng nhẹ")

    def test_field_priority_override(self) -> None:
        # AI chấm Cấp 4 (65%), nhưng kỹ sư khảo sát thực địa xác nhận Cấp 1
        ai_result = AiDetectionResult(
            success=True,
            detections_count=1,
            detections=[_make_detection("D40", 0.65)],
            message="OK",
        )
        assessment = compute_priority_assessment(
            ai_result,
            field_priority="Cấp 1 – Cực kỳ nghiêm trọng",
        )
        self.assertEqual(assessment.level_code, "level_4")
        self.assertEqual(assessment.effective_level_code, "level_1")
        self.assertEqual(assessment.effective_level_label, "Cấp 1 – Cực kỳ nghiêm trọng")
        self.assertTrue(assessment.is_field_verified)

    def test_schemas_auto_populate_priority_assessment(self) -> None:
        ai_result = AiDetectionResult(
            success=True,
            detections_count=2,
            detections=[
                _make_detection("D40", 0.91),
                _make_detection("D20", 0.82),
            ],
            message="OK",
        )
        preview = AiPreviewDetectionResult(**ai_result.model_dump(), preview_token="tok-1")
        self.assertIsNotNone(preview.priority_assessment)
        self.assertEqual(preview.priority_assessment.level_code, "level_1")

        report = ReporterReportResponse(
            id="rep-1",
            image_url="http://localhost/img.jpg",
            latitude=10.77,
            longitude=106.69,
            note="Test",
            ai_status="success",
            status="pending",
            ai_result=ai_result,
            created_at="2026-11-10T00:00:00Z",
            updated_at="2026-11-10T00:00:00Z",
        )
        self.assertIsNotNone(report.priority_assessment)
        self.assertEqual(report.priority_assessment.level_code, "level_1")
        self.assertAlmostEqual(report.priority_assessment.score_percent, 173.0, places=1)


if __name__ == "__main__":
    unittest.main()
