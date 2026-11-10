from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field

from app.modules.reports.repository_constants import DAMAGE_LABELS


PriorityLevelCode = Literal["level_1", "level_2", "level_3", "level_4", "unrated"]


class PriorityTopDetection(BaseModel):
    damage_type: str
    damage_label: str
    class_name: str | None = None
    confidence: float = Field(ge=0.0, le=1.0)
    confidence_percent: float = Field(ge=0.0, le=100.0)


class PriorityAssessment(BaseModel):
    score: float = Field(default=0.0, ge=0.0)
    score_percent: float = Field(default=0.0, ge=0.0)
    level_code: PriorityLevelCode = "unrated"
    level_number: int | None = None
    level_label: str = "Chưa xác định mức ưu tiên"
    short_label: str = "Chưa xếp cấp"
    threshold_text: str = "Chưa có dữ liệu suy luận AI"
    formula_text: str = "Chưa phát hiện nhãn hư hỏng trong khung hình"
    technical_description: str = (
        "Hệ thống chưa ghi nhận nhãn hư hỏng từ mô hình thị giác máy tính; chờ thẩm định thủ công."
    )
    citizen_summary: str = (
        "Phản ánh đã được tiếp nhận và chuyển đến bộ phận chuyên môn để kiểm tra, phân loại."
    )
    color: str = "#64748B"
    background_color: str = "#F1F5F9"
    border_color: str = "#CBD5E1"
    top_detections: list[PriorityTopDetection] = Field(default_factory=list)
    total_detections_count: int = 0
    distinct_damage_types: list[str] = Field(default_factory=list)
    effective_level_code: PriorityLevelCode = "unrated"
    effective_level_number: int | None = None
    effective_level_label: str = "Chưa xác định mức ưu tiên"
    effective_short_label: str = "Chưa xếp cấp"
    is_field_verified: bool = False


PRIORITY_LEVEL_METADATA: dict[str, dict[str, Any]] = {
    "level_1": {
        "level_code": "level_1",
        "level_number": 1,
        "level_label": "Cấp 1 – Cực kỳ nghiêm trọng",
        "short_label": "Cấp 1",
        "threshold_text": "S_priority ≥ 1.6 (≥ 160%)",
        "technical_description": (
            "Đại diện cho các trường hợp hệ thống phát hiện đồng thời từ hai nhãn hư hỏng trở lên "
            "với độ tin cậy vượt trội (thường trên 80% – 90%). Điển hình là các tổ hợp phá hoại kết cấu "
            "phức tạp như ổ gà (D40) xuất hiện song hành cùng nứt lưới mai rùa (D20), trong đó các "
            "bounding box chiếm tỷ lệ diện tích lớn và rõ nét trên khung hình, phản ánh vùng mặt đường "
            "bị hư hại nghiêm trọng cần phát lệnh cảnh báo tức thời."
        ),
        "citizen_summary": (
            "Hệ thống AI ghi nhận tổ hợp hư hỏng ở mức Cấp 1 – Cực kỳ nghiêm trọng. "
            "Báo cáo được ưu tiên đẩy lên đầu danh sách khảo sát và xử lý khẩn cấp."
        ),
        "color": "#BE123C",
        "background_color": "#FFF1F2",
        "border_color": "#FDA4AF",
    },
    "level_2": {
        "level_code": "level_2",
        "level_number": 2,
        "level_label": "Cấp 2 – Nghiêm trọng",
        "short_label": "Cấp 2",
        "threshold_text": "1.2 ≤ S_priority < 1.6 (120% – < 160%)",
        "technical_description": (
            "Phản ánh trạng thái đa tổn thương với độ tin cậy ở mức khá-cao (ví dụ hai vết nứt cùng đạt "
            "ngưỡng 60% – 75%), hoặc trường hợp một hư hại chính được mô hình nhận diện cực kỳ chuẩn xác "
            "(85% – 95%) kèm theo một dấu hiệu hư hại thứ cấp (40% – 65%). Đây là những vị trí mặt đường "
            "đã suy giảm chất lượng rõ rệt và có xu hướng lan rộng nhanh chóng nếu không được can thiệp sớm."
        ),
        "citizen_summary": (
            "Hệ thống AI ghi nhận mức độ hư hỏng Cấp 2 – Nghiêm trọng. "
            "Vị trí này sẽ được ưu tiên phân công kỹ sư hiện trường kiểm tra sớm."
        ),
        "color": "#C2410C",
        "background_color": "#FFF7ED",
        "border_color": "#FDBA74",
    },
    "level_3": {
        "level_code": "level_3",
        "level_number": 3,
        "level_label": "Cấp 3 – Cần khắc phục",
        "short_label": "Cấp 3",
        "threshold_text": "0.8 ≤ S_priority < 1.2 (80% – < 120%)",
        "technical_description": (
            "Tương ứng với hai kịch bản phát hiện của mô hình: hoặc hệ thống ghi nhận duy nhất một nhãn "
            "hư hại đơn lẻ nhưng có độ tin cậy rất cao (80% – 95%), hoặc ghi nhận hai hư hỏng cục bộ có "
            "độ tin cậy ở mức trung bình gộp lại (khoảng 40% – 55%). Các điểm này đại diện cho những "
            "khuyết tật mặt đường mới phát sinh, cần đưa vào lộ trình khắc phục theo kế hoạch định kỳ."
        ),
        "citizen_summary": (
            "Hệ thống AI ghi nhận hư hỏng ở mức Cấp 3 – Cần khắc phục. "
            "Điểm phản ánh đã được đưa vào danh sách kiểm tra và bảo trì định kỳ."
        ),
        "color": "#B45309",
        "background_color": "#FFFBEB",
        "border_color": "#FCD34D",
    },
    "level_4": {
        "level_code": "level_4",
        "level_number": 4,
        "level_label": "Cấp 4 – Hư hỏng nhẹ",
        "short_label": "Cấp 4",
        "threshold_text": "S_priority < 0.8 (< 80%)",
        "technical_description": (
            "Xác định các phát hiện đơn lẻ có độ tin cậy chỉ ở mức trung bình-thấp (50% – 79%) hoặc "
            "trường hợp gồm hai đối tượng nhưng cả hai đều nằm sát ngưỡng lọc nhiễu tối thiểu của thuật toán "
            "(khoảng 35% – 40%). Mức độ này đóng vai trò cảnh báo sớm các dấu hiệu rạn nứt nhỏ ban đầu và "
            "phục vụ công tác giám sát, lưu trữ dữ liệu để đối chiếu tốc độ thoái hóa mặt đường trong các "
            "đợt tuần tra kế tiếp."
        ),
        "citizen_summary": (
            "Hệ thống AI ghi nhận dấu hiệu hư hỏng ở mức Cấp 4 – Hư hỏng nhẹ. "
            "Dữ liệu đã được lưu trữ phục vụ giám sát và theo dõi chất lượng mặt đường."
        ),
        "color": "#0F766E",
        "background_color": "#F0FDFA",
        "border_color": "#99F6E4",
    },
}

FIELD_PRIORITY_ALIASES: dict[str, PriorityLevelCode] = {
    "level_1": "level_1",
    "cap_1": "level_1",
    "cấp 1": "level_1",
    "cấp 1 – cực kỳ nghiêm trọng": "level_1",
    "cấp 1 - cực kỳ nghiêm trọng": "level_1",
    "cực kỳ nghiêm trọng": "level_1",
    "urgent": "level_1",
    "khẩn": "level_1",
    "khẩn cấp": "level_1",
    "level_2": "level_2",
    "cap_2": "level_2",
    "cấp 2": "level_2",
    "cấp 2 – nghiêm trọng": "level_2",
    "cấp 2 - nghiêm trọng": "level_2",
    "nghiêm trọng": "level_2",
    "high": "level_2",
    "cao": "level_2",
    "level_3": "level_3",
    "cap_3": "level_3",
    "cấp 3": "level_3",
    "cấp 3 – cần khắc phục": "level_3",
    "cấp 3 - cần khắc phục": "level_3",
    "cần khắc phục": "level_3",
    "medium": "level_3",
    "trung bình": "level_3",
    "level_4": "level_4",
    "cap_4": "level_4",
    "cấp 4": "level_4",
    "cấp 4 – hư hỏng nhẹ": "level_4",
    "cấp 4 - hư hỏng nhẹ": "level_4",
    "hư hỏng nhẹ": "level_4",
    "low": "level_4",
    "thấp": "level_4",
}


def resolve_field_priority_level_code(field_priority: str | None) -> PriorityLevelCode | None:
    if not field_priority:
        return None
    normalized = field_priority.strip().lower()
    if normalized in FIELD_PRIORITY_ALIASES:
        return FIELD_PRIORITY_ALIASES[normalized]
    for prefix, code in (
        ("cấp 1", "level_1"),
        ("cấp 2", "level_2"),
        ("cấp 3", "level_3"),
        ("cấp 4", "level_4"),
    ):
        if normalized.startswith(prefix):
            return code
    return None


def classify_priority_score(score: float, total_detections: int) -> PriorityLevelCode:
    if total_detections <= 0 or score <= 0.0:
        return "unrated"
    if score >= 1.6:
        return "level_1"
    if score >= 1.2:
        return "level_2"
    if score >= 0.8:
        return "level_3"
    return "level_4"


def compute_priority_assessment(
    ai_result: Any,
    *,
    field_priority: str | None = None,
) -> PriorityAssessment:
    raw_detections: list[Any] = []
    if ai_result is not None:
        if isinstance(ai_result, dict):
            raw_detections = ai_result.get("detections") or []
        elif hasattr(ai_result, "detections"):
            raw_detections = getattr(ai_result, "detections") or []

    parsed_detections: list[PriorityTopDetection] = []
    distinct_types: list[str] = []

    for det in raw_detections:
        if isinstance(det, dict):
            d_type = str(det.get("damage_type") or "D40").strip().upper()
            c_name = det.get("class_name")
            conf = float(det.get("confidence") or 0.0)
        else:
            d_type = str(getattr(det, "damage_type", "D40") or "D40").strip().upper()
            c_name = getattr(det, "class_name", None)
            conf = float(getattr(det, "confidence", 0.0) or 0.0)

        if conf <= 0.0:
            continue

        conf_clamped = max(0.0, min(1.0, conf))
        if d_type not in distinct_types:
            distinct_types.append(d_type)

        parsed_detections.append(
            PriorityTopDetection(
                damage_type=d_type,
                damage_label=DAMAGE_LABELS.get(d_type, "Hư hỏng mặt đường"),
                class_name=c_name,
                confidence=round(conf_clamped, 4),
                confidence_percent=round(conf_clamped * 100.0, 1),
            )
        )

    parsed_detections.sort(key=lambda item: item.confidence, reverse=True)
    total_count = len(parsed_detections)
    top_2 = parsed_detections[:2]

    score = round(sum(item.confidence for item in top_2), 4)
    score_percent = round(score * 100.0, 1)
    level_code = classify_priority_score(score, total_count)

    field_level_code = resolve_field_priority_level_code(field_priority)
    is_field_verified = field_level_code is not None
    effective_code: PriorityLevelCode = field_level_code if field_level_code is not None else level_code

    if level_code == "unrated":
        eff_meta = PRIORITY_LEVEL_METADATA.get(effective_code)
        return PriorityAssessment(
            score=0.0,
            score_percent=0.0,
            level_code="unrated",
            level_number=None,
            level_label="Chưa xác định mức ưu tiên AI",
            short_label="Chưa xếp cấp",
            threshold_text="Chưa phát hiện đối tượng hư hỏng (S_priority = 0%)",
            formula_text="Không có nhãn hư hỏng nào được phát hiện trong khung hình",
            top_detections=[],
            total_detections_count=0,
            distinct_damage_types=[],
            effective_level_code=effective_code,
            effective_level_number=eff_meta["level_number"] if eff_meta else None,
            effective_level_label=eff_meta["level_label"] if eff_meta else "Chưa xác định mức ưu tiên",
            effective_short_label=eff_meta["short_label"] if eff_meta else "Chưa xếp cấp",
            is_field_verified=is_field_verified,
            color=eff_meta["color"] if eff_meta else "#64748B",
            background_color=eff_meta["background_color"] if eff_meta else "#F1F5F9",
            border_color=eff_meta["border_color"] if eff_meta else "#CBD5E1",
        )

    meta = PRIORITY_LEVEL_METADATA[level_code]
    eff_meta = PRIORITY_LEVEL_METADATA.get(effective_code, meta)

    if len(top_2) == 2:
        d1, d2 = top_2[0], top_2[1]
        formula_text = (
            f"S_priority = {d1.confidence_percent}% ({d1.damage_type}) + "
            f"{d2.confidence_percent}% ({d2.damage_type}) = {score_percent}% "
            f"(Tổng 2 tỷ lệ cao nhất trong {total_count} phát hiện)"
        )
    else:
        d1 = top_2[0]
        formula_text = (
            f"S_priority = {d1.confidence_percent}% ({d1.damage_type}) "
            f"(Phát hiện đơn lẻ 1 đối tượng trong khung hình)"
        )

    return PriorityAssessment(
        score=score,
        score_percent=score_percent,
        level_code=level_code,
        level_number=meta["level_number"],
        level_label=meta["level_label"],
        short_label=meta["short_label"],
        threshold_text=meta["threshold_text"],
        formula_text=formula_text,
        technical_description=meta["technical_description"],
        citizen_summary=meta["citizen_summary"],
        color=eff_meta["color"],
        background_color=eff_meta["background_color"],
        border_color=eff_meta["border_color"],
        top_detections=top_2,
        total_detections_count=total_count,
        distinct_damage_types=distinct_types,
        effective_level_code=effective_code,
        effective_level_number=eff_meta["level_number"],
        effective_level_label=eff_meta["level_label"],
        effective_short_label=eff_meta["short_label"],
        is_field_verified=is_field_verified,
    )
