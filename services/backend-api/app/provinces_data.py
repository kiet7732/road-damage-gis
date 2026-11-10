from __future__ import annotations

from typing import Any

# Chuẩn hóa tên Tỉnh/Thành phố theo địa giới hành chính hiện hành
PROVINCE_ALIASES: dict[str, str] = {
    "bình dương": "Bình Dương",
    "tỉnh bình dương": "Bình Dương",
    "binh duong": "Bình Dương",
    "tinh binh duong": "Bình Dương",
    "tp. hồ chí minh": "TP. Hồ Chí Minh",
    "tp hồ chí minh": "TP. Hồ Chí Minh",
    "thành phố hồ chí minh": "TP. Hồ Chí Minh",
    "thanh pho ho chi minh": "TP. Hồ Chí Minh",
    "tp.hcm": "TP. Hồ Chí Minh",
    "tphcm": "TP. Hồ Chí Minh",
    "hồ chí minh": "TP. Hồ Chí Minh",
    "ho chi minh": "TP. Hồ Chí Minh",
    "đồng nai": "Đồng Nai",
    "tỉnh đồng nai": "Đồng Nai",
    "dong nai": "Đồng Nai",
    "bà rịa - vũng tàu": "Bà Rịa - Vũng Tàu",
    "tỉnh bà rịa - vũng tàu": "Bà Rịa - Vũng Tàu",
    "ba ria - vung tau": "Bà Rịa - Vũng Tàu",
    "long an": "Long An",
    "tỉnh long an": "Long An",
    "tây ninh": "Tây Ninh",
    "tỉnh tây ninh": "Tây Ninh",
    "hà nội": "Hà Nội",
    "thành phố hà nội": "Hà Nội",
    "tp. hà nội": "Hà Nội",
    "ha noi": "Hà Nội",
    "đà nẵng": "Đà Nẵng",
    "thành phố đà nẵng": "Đà Nẵng",
    "tp. đà nẵng": "Đà Nẵng",
    "da nang": "Đà Nẵng",
    "cần thơ": "Cần Thơ",
    "thành phố cần thơ": "Cần Thơ",
    "tp. cần thơ": "Cần Thơ",
    "can tho": "Cần Thơ",
    "hải phòng": "Hải Phòng",
    "thành phố hải phòng": "Hải Phòng",
    "tp. hải phòng": "Hải Phòng",
    "hai phong": "Hải Phòng",
}

# Các biến thể tên tỉnh có thể xuất hiện trong cột `province` của bảng `reports`
PROVINCE_SQL_VARIANTS: dict[str, list[str]] = {
    "Bình Dương": ["Bình Dương", "Tỉnh Bình Dương", "Binh Duong", "Tinh Binh Duong"],
    "TP. Hồ Chí Minh": [
        "TP. Hồ Chí Minh",
        "Thành phố Hồ Chí Minh",
        "TP Hồ Chí Minh",
        "TP.HCM",
        "Hồ Chí Minh",
    ],
    "Đồng Nai": ["Đồng Nai", "Tỉnh Đồng Nai"],
    "Bà Rịa - Vũng Tàu": ["Bà Rịa - Vũng Tàu", "Tỉnh Bà Rịa - Vũng Tàu"],
    "Long An": ["Long An", "Tỉnh Long An"],
    "Tây Ninh": ["Tây Ninh", "Tỉnh Tây Ninh"],
    "Hà Nội": ["Hà Nội", "Thành phố Hà Nội", "TP. Hà Nội"],
    "Đà Nẵng": ["Đà Nẵng", "Thành phố Đà Nẵng", "TP. Đà Nẵng"],
    "Cần Thơ": ["Cần Thơ", "Thành phố Cần Thơ", "TP. Cần Thơ"],
    "Hải Phòng": ["Hải Phòng", "Thành phố Hải Phòng", "TP. Hải Phòng"],
}

# Danh mục đơn vị hành chính cấp huyện trực thuộc Tỉnh/Thành phố (đã cập nhật sáp nhập mới nhất:
# - Bình Dương: 5 Thành phố (Thủ Dầu Một, Thuận An, Dĩ An, Bến Cát [NQ 1012/NQ-UBTVQH15], Tân Uyên [NQ 725/NQ-UBTVQH15]) + 4 Huyện
# - TP. Hồ Chí Minh: TP. Thủ Đức [NQ 1111/NQ-UBTVQH14] + 16 Quận + 5 Huyện)
PROVINCE_DISTRICT_HIERARCHY: dict[str, list[str]] = {
    "Bình Dương": [
        "Thành phố Thủ Dầu Một",
        "Thành phố Thuận An",
        "Thành phố Dĩ An",
        "Thành phố Bến Cát",
        "Thành phố Tân Uyên",
        "Huyện Bàu Bàng",
        "Huyện Bắc Tân Uyên",
        "Huyện Dầu Tiếng",
        "Huyện Phú Giáo",
    ],
    "TP. Hồ Chí Minh": [
        "Thành phố Thủ Đức",
        "Quận 1",
        "Quận 3",
        "Quận 4",
        "Quận 5",
        "Quận 6",
        "Quận 7",
        "Quận 8",
        "Quận 10",
        "Quận 11",
        "Quận 12",
        "Quận Bình Tân",
        "Quận Bình Thạnh",
        "Quận Gò Vấp",
        "Quận Phú Nhuận",
        "Quận Tân Bình",
        "Quận Tân Phú",
        "Huyện Bình Chánh",
        "Huyện Cần Giờ",
        "Huyện Củ Chi",
        "Huyện Hóc Môn",
        "Huyện Nhà Bè",
    ],
    "Đồng Nai": [
        "Thành phố Biên Hòa",
        "Thành phố Long Khánh",
        "Huyện Long Thành",
        "Huyện Nhơn Trạch",
        "Huyện Trảng Bom",
        "Huyện Vĩnh Cửu",
    ],
    "Bà Rịa - Vũng Tàu": [
        "Thành phố Vũng Tàu",
        "Thành phố Bà Rịa",
        "Thị xã Phú Mỹ",
        "Huyện Châu Đức",
        "Huyện Long Điền",
        "Huyện Đất Đỏ",
        "Huyện Xuyên Mộc",
    ],
    "Hà Nội": [
        "Quận Ba Đình",
        "Quận Hoàn Kiếm",
        "Quận Đống Đa",
        "Quận Hai Bà Trưng",
        "Quận Cầu Giấy",
        "Quận Thanh Xuân",
        "Quận Hoàng Mai",
        "Quận Long Biên",
        "Quận Hà Đông",
        "Quận Nam Từ Liêm",
        "Quận Bắc Từ Liêm",
        "Quận Tây Hồ",
    ],
    "Đà Nẵng": [
        "Quận Hải Châu",
        "Quận Thanh Khê",
        "Quận Sơn Trà",
        "Quận Ngũ Hành Sơn",
        "Quận Liên Chiểu",
        "Quận Cẩm Lệ",
        "Huyện Hòa Vang",
    ],
    "Cần Thơ": [
        "Quận Ninh Kiều",
        "Quận Bình Thủy",
        "Quận Cái Răng",
        "Quận Ô Môn",
        "Quận Thốt Nốt",
    ],
    "Hải Phòng": [
        "Quận Hồng Bàng",
        "Quận Ngô Quyền",
        "Quận Lê Chân",
        "Quận Hải An",
        "Thành phố Thủy Nguyên",
    ],
}

# GeoJSON Polygon ranh giới hành chính cấp Tỉnh/Thành phố (WGS84 - EPSG:4326)
# Dùng để khoanh vùng ranh giới trực quan trên bản đồ WebGIS cho Quản trị viên cấp tỉnh
PROVINCE_BOUNDARIES_DATA: dict[str, dict[str, Any]] = {
    "Bình Dương": {
        "province": "Bình Dương",
        "full_name": "Tỉnh Bình Dương",
        "road_management_authority": "Sở Giao thông Vận tải Tỉnh Bình Dương (Khu QLĐB IV)",
        "center": {"latitude": 11.1604, "longitude": 106.6719, "zoom": 10},
        "bbox": [106.3350, 10.8650, 106.9700, 11.5050],
        "coordinates": [
            [
                [106.3550, 11.4520],
                [106.4420, 11.5010],
                [106.5680, 11.4880],
                [106.7120, 11.4690],
                [106.8450, 11.4350],
                [106.9580, 11.3420],
                [106.9680, 11.2150],
                [106.9120, 11.0980],
                [106.8350, 10.9920],
                [106.8120, 10.8840],
                [106.7520, 10.8680],
                [106.6850, 10.8920],
                [106.6380, 10.9450],
                [106.5780, 11.0320],
                [106.4890, 11.1150],
                [106.3820, 11.2340],
                [106.3380, 11.3450],
                [106.3550, 11.4520],
            ]
        ],
    },
    "TP. Hồ Chí Minh": {
        "province": "TP. Hồ Chí Minh",
        "full_name": "Thành phố Hồ Chí Minh",
        "road_management_authority": "Sở Giao thông Vận tải TP. Hồ Chí Minh (Khu QLĐB IV)",
        "center": {"latitude": 10.7769, "longitude": 106.6951, "zoom": 10},
        "bbox": [106.3560, 10.3760, 107.0120, 11.1600],
        "coordinates": [
            [
                [106.3650, 11.1420],
                [106.4890, 11.1580],
                [106.5780, 11.0320],
                [106.6380, 10.9450],
                [106.6850, 10.8920],
                [106.7520, 10.8680],
                [106.8480, 10.8950],
                [106.8920, 10.8120],
                [106.8350, 10.7150],
                [106.9850, 10.6120],
                [107.0100, 10.4250],
                [106.8650, 10.3780],
                [106.7320, 10.4850],
                [106.6520, 10.6150],
                [106.5350, 10.6520],
                [106.4580, 10.7680],
                [106.3820, 10.9540],
                [106.3650, 11.1420],
            ]
        ],
    },
    "Đồng Nai": {
        "province": "Đồng Nai",
        "full_name": "Tỉnh Đồng Nai",
        "road_management_authority": "Sở Giao thông Vận tải Tỉnh Đồng Nai (Khu QLĐB IV)",
        "center": {"latitude": 10.9574, "longitude": 107.1426, "zoom": 10},
        "bbox": [106.7600, 10.5800, 107.5700, 11.5800],
        "coordinates": [
            [
                [106.8450, 11.4350],
                [107.1850, 11.5680],
                [107.4850, 11.4620],
                [107.5620, 11.1850],
                [107.4650, 10.8250],
                [107.1850, 10.6650],
                [106.8950, 10.5920],
                [106.7850, 10.7520],
                [106.8120, 10.8840],
                [106.9120, 11.0980],
                [106.9580, 11.3420],
                [106.8450, 11.4350],
            ]
        ],
    },
    "Bà Rịa - Vũng Tàu": {
        "province": "Bà Rịa - Vũng Tàu",
        "full_name": "Tỉnh Bà Rịa - Vũng Tàu",
        "road_management_authority": "Sở Giao thông Vận tải Tỉnh Bà Rịa - Vũng Tàu (Khu QLĐB IV)",
        "center": {"latitude": 10.5417, "longitude": 107.2429, "zoom": 10},
        "bbox": [106.9800, 10.3200, 107.5800, 10.8000],
        "coordinates": [
            [
                [106.9950, 10.6650],
                [107.1850, 10.7850],
                [107.4850, 10.7650],
                [107.5750, 10.5520],
                [107.3120, 10.3950],
                [107.0650, 10.3250],
                [106.9950, 10.6650],
            ]
        ],
    },
    "Hà Nội": {
        "province": "Hà Nội",
        "full_name": "Thành phố Hà Nội",
        "road_management_authority": "Sở Giao thông Vận tải Thành phố Hà Nội (Khu QLĐB I)",
        "center": {"latitude": 21.0285, "longitude": 105.8542, "zoom": 10},
        "bbox": [105.2800, 20.5600, 106.0200, 21.3800],
        "coordinates": [
            [
                [105.3200, 21.2500],
                [105.7800, 21.3700],
                [106.0100, 21.0800],
                [105.9200, 20.6200],
                [105.6200, 20.5700],
                [105.2900, 20.9800],
                [105.3200, 21.2500],
            ]
        ],
    },
    "Đà Nẵng": {
        "province": "Đà Nẵng",
        "full_name": "Thành phố Đà Nẵng",
        "road_management_authority": "Sở Giao thông Vận tải Thành phố Đà Nẵng (Khu QLĐB III)",
        "center": {"latitude": 16.0544, "longitude": 108.2022, "zoom": 11},
        "bbox": [107.9000, 15.9200, 108.3400, 16.2200],
        "coordinates": [
            [
                [107.9200, 16.1800],
                [108.1800, 16.2100],
                [108.3300, 16.1200],
                [108.2800, 15.9500],
                [107.9500, 15.9300],
                [107.9200, 16.1800],
            ]
        ],
    },
    "Cần Thơ": {
        "province": "Cần Thơ",
        "full_name": "Thành phố Cần Thơ",
        "road_management_authority": "Sở Giao thông Vận tải Thành phố Cần Thơ (Khu QLĐB IV)",
        "center": {"latitude": 10.0452, "longitude": 105.7469, "zoom": 10},
        "bbox": [105.2200, 9.9200, 105.8400, 10.3200],
        "coordinates": [
            [
                [105.3200, 10.3000],
                [105.6200, 10.2200],
                [105.8300, 10.0200],
                [105.6800, 9.9300],
                [105.2400, 10.0800],
                [105.3200, 10.3000],
            ]
        ],
    },
    "Hải Phòng": {
        "province": "Hải Phòng",
        "full_name": "Thành phố Hải Phòng",
        "road_management_authority": "Sở Giao thông Vận tải Thành phố Hải Phòng (Khu QLĐB I)",
        "center": {"latitude": 20.8449, "longitude": 106.6881, "zoom": 10},
        "bbox": [106.4200, 20.6200, 107.0800, 21.0200],
        "coordinates": [
            [
                [106.4500, 20.9800],
                [106.8200, 21.0100],
                [107.0600, 20.7500],
                [106.7200, 20.6400],
                [106.4300, 20.7200],
                [106.4500, 20.9800],
            ]
        ],
    },
}


def normalize_province_name(province: str | None) -> str | None:
    if not province:
        return None
    cleaned = province.strip()
    if not cleaned:
        return None
    lowered = cleaned.lower()
    if lowered in PROVINCE_ALIASES:
        return PROVINCE_ALIASES[lowered]
    for prefix in ("tỉnh ", "thành phố ", "tp. ", "tp "):
        if lowered.startswith(prefix):
            stripped = cleaned[len(prefix) :].strip()
            stripped_lower = stripped.lower()
            if stripped_lower in PROVINCE_ALIASES:
                return PROVINCE_ALIASES[stripped_lower]
            return stripped
    return cleaned


def get_province_sql_variants(province: str | None) -> list[str]:
    canonical = normalize_province_name(province)
    if not canonical:
        return []
    variants = list(PROVINCE_SQL_VARIANTS.get(canonical, [canonical, f"Tỉnh {canonical}", f"Thành phố {canonical}"]))
    if province and province.strip() not in variants:
        variants.append(province.strip())
    return variants


def build_province_sql_clause(province: str | None, table_alias: str = "reports") -> tuple[str, list[object]]:
    canonical = normalize_province_name(province)
    if not canonical:
        return "", []

    prefix = f"{table_alias}." if table_alias else ""
    stripped_prov = (
        canonical.lower()
        .replace("tp. ", "")
        .replace("thành phố ", "")
        .replace("tỉnh ", "")
        .strip()
    )
    districts = PROVINCE_DISTRICT_HIERARCHY.get(canonical, [])
    dist_variants: list[str] = []
    for d in districts:
        d_low = d.lower()
        dist_variants.append(d_low)
        d_short = (
            d_low.replace("thành phố ", "")
            .replace("thị xã ", "")
            .replace("quận ", "")
            .replace("huyện ", "")
            .strip()
        )
        if d_short and d_short not in dist_variants:
            dist_variants.append(d_short)

    if dist_variants:
        placeholders = ", ".join(["?" for _ in dist_variants])
        clause = (
            f"(LOWER(TRIM(COALESCE({prefix}province, ''))) LIKE ? "
            f"OR (TRIM(COALESCE({prefix}province, '')) = '' AND LOWER(TRIM(COALESCE({prefix}district, ''))) IN ({placeholders})))"
        )
        params: list[object] = [f"%{stripped_prov}%", *dist_variants]
        return clause, params

    clause = f"(LOWER(TRIM(COALESCE({prefix}province, ''))) LIKE ?)"
    return clause, [f"%{stripped_prov}%"]


def get_province_boundary_geojson(province: str | None) -> dict[str, Any]:
    canonical = normalize_province_name(province)
    if canonical and canonical in PROVINCE_BOUNDARIES_DATA:
        info = PROVINCE_BOUNDARIES_DATA[canonical]
        return {
            "type": "FeatureCollection",
            "province": info["province"],
            "full_name": info["full_name"],
            "road_management_authority": info["road_management_authority"],
            "center": info["center"],
            "bbox": info["bbox"],
            "districts": PROVINCE_DISTRICT_HIERARCHY.get(canonical, []),
            "features": [
                {
                    "type": "Feature",
                    "properties": {
                        "province": info["province"],
                        "full_name": info["full_name"],
                        "road_management_authority": info["road_management_authority"],
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": info["coordinates"],
                    },
                }
            ],
        }

    # Trả về toàn bộ các tỉnh trọng điểm nếu không truyền province
    features = []
    for key, info in PROVINCE_BOUNDARIES_DATA.items():
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "province": info["province"],
                    "full_name": info["full_name"],
                    "road_management_authority": info["road_management_authority"],
                    "center": info["center"],
                    "bbox": info["bbox"],
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": info["coordinates"],
                },
            }
        )
    return {
        "type": "FeatureCollection",
        "province": canonical,
        "full_name": canonical,
        "road_management_authority": "Cục Đường bộ Việt Nam - Bộ Giao thông Vận tải",
        "center": {"latitude": 10.9500, "longitude": 106.7000, "zoom": 9},
        "bbox": [106.3350, 10.3760, 107.0120, 11.5050],
        "districts": [],
        "features": features,
    }
