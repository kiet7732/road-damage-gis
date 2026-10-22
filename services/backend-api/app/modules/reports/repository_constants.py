from datetime import timedelta

STATUS_LABELS = {
    "new": ("Mới ghi nhận", "Báo cáo mới vào hệ thống"),
    "pending": ("Chờ xác minh", "Đã có dữ liệu AI, chờ cán bộ xác minh"),
    "processing": ("Đang xử lý", "Đã chuyển đơn vị phụ trách"),
    "repaired": ("Đã sửa chữa", "Đã hoàn tất xử lý ngoài thực địa"),
    "rejected": ("Từ chối", "Báo cáo không hợp lệ hoặc không cần xử lý"),
}

STATUS_COLORS = {
    "new": "#075DBB",
    "pending": "#E86C00",
    "processing": "#7E3FB3",
    "repaired": "#119C39",
    "rejected": "#667085",
}

DAMAGE_LABELS = {
    "D00": "Nứt dọc",
    "D10": "Nứt ngang",
    "D20": "Nứt da cá sấu",
    "D40": "Ổ gà",
}

SQL_STATUS_EXPRESSION = """
CASE
    WHEN LOWER(TRIM(COALESCE(reports.status, ''))) IN ('verified', 'in_progress') THEN 'processing'
    WHEN LOWER(TRIM(COALESCE(reports.status, ''))) IN ('resolved', 'done') THEN 'repaired'
    WHEN LOWER(TRIM(COALESCE(reports.status, ''))) IN ('pending_verification', 'manual_review_required') THEN 'pending'
    WHEN LOWER(TRIM(COALESCE(reports.status, ''))) IN ('new', 'pending', 'processing', 'repaired', 'rejected')
        THEN LOWER(TRIM(COALESCE(reports.status, '')))
    ELSE 'new'
END
""".strip()

SQL_EFFECTIVE_DAMAGE_TYPE_EXPRESSION = """
COALESCE(
    NULLIF(UPPER(TRIM(COALESCE(reports.corrected_damage_type, ''))), ''),
    NULLIF(UPPER(TRIM(COALESCE(json_extract(reports.detections_json, '$.detections[0].damage_type'), ''))), '')
)
""".strip()

SQL_PRIMARY_CONFIDENCE_EXPRESSION = """
CAST(json_extract(reports.detections_json, '$.detections[0].confidence') AS REAL)
""".strip()

SQL_REPORT_SELECT = f"""
SELECT
    reports.*,
    {SQL_STATUS_EXPRESSION} AS normalized_status,
    {SQL_EFFECTIVE_DAMAGE_TYPE_EXPRESSION} AS effective_damage_type,
    {SQL_PRIMARY_CONFIDENCE_EXPRESSION} AS primary_confidence,
    assigned_user.full_name AS assigned_engineer_name,
    claimed_user.full_name AS claimed_by_engineer_name
FROM reports
LEFT JOIN users AS assigned_user ON assigned_user.id = reports.assigned_engineer_id
LEFT JOIN users AS claimed_user ON claimed_user.id = reports.claimed_by_engineer_id
""".strip()

FIELD_STATUS_AVAILABLE = "available_for_inspection"
FIELD_STATUS_CLAIMED = "inspection_claimed"
FIELD_STATUS_IN_PROGRESS = "inspection_in_progress"
FIELD_STATUS_SURVEY_COMPLETED = "survey_completed"
FIELD_STATUS_REVOKED = "inspection_revoked"
CLAIM_STATUS_ACTIVE = "active"
CLAIM_STATUS_RELEASED = "released"
CLAIM_STATUS_REVOKED = "revoked"
CLAIM_STATUS_EXPIRED = "expired"
AUTO_RELEASE_WINDOW = timedelta(hours=1)
CHECKIN_NEAR_THRESHOLD_METERS = 30.0
CHECKIN_WARN_THRESHOLD_METERS = 30.0
CHECKIN_MAX_ACCURACY_METERS = 25.0
