"""
Module hỗ trợ trích xuất và nhúng Metadata chuẩn EXIF GPS IFD vào file ảnh.
Tương thích hoàn toàn với QGIS, ArcGIS, GDAL, Leaflet và Mapbox.
"""
from dataclasses import dataclass
from datetime import datetime, timezone
import io
import json
import logging
import math
from typing import Any
from PIL import Image, ExifTags

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class ExtractedGisLocation:
    latitude: float
    longitude: float
    accuracy: float | None = None
    altitude: float | None = None
    heading: float | None = None
    recorded_at: str | None = None
    raw_metadata: dict[str, Any] | None = None


def to_float(val: Any) -> float | None:
    if val is None:
        return None
    if hasattr(val, "numerator") and hasattr(val, "denominator"):
        return float(val.numerator) / float(val.denominator) if val.denominator != 0 else 0.0
    if isinstance(val, (tuple, list)) and len(val) == 2:
        return float(val[0]) / float(val[1]) if val[1] != 0 else 0.0
    try:
        f = float(val)
        return f if math.isfinite(f) else None
    except (ValueError, TypeError):
        return None


def dms_to_decimal(dms: Any, ref: str) -> float | None:
    if not isinstance(dms, (tuple, list)) or len(dms) < 3:
        return None
    deg = to_float(dms[0])
    mins = to_float(dms[1])
    sec = to_float(dms[2])
    if deg is None or mins is None or sec is None:
        return None
    decimal = deg + (mins / 60.0) + (sec / 3600.0)
    if str(ref).strip().upper() in ("S", "W"):
        decimal = -decimal
    return decimal


def decimal_to_dms(decimal_degree: float) -> tuple[float, float, float]:
    abs_val = abs(decimal_degree)
    degrees = int(abs_val)
    remainder_minutes = (abs_val - degrees) * 60.0
    minutes = int(remainder_minutes)
    seconds = round((remainder_minutes - minutes) * 60.0, 2)
    return float(degrees), float(minutes), seconds


def extract_gis_exif(image_bytes: bytes) -> ExtractedGisLocation | None:
    """
    Trích xuất thông tin tọa độ chuẩn EXIF GPS IFD từ file ảnh đã chụp.
    Trả về ExtractedGisLocation nếu ảnh có chứa GPS hợp lệ, ngược lại trả về None.
    """
    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            exif = img.getexif()
            if not exif:
                return None

            gps_ifd = exif.get_ifd(ExifTags.IFD.GPSInfo)
            if not gps_ifd:
                return None

            raw_lat = gps_ifd.get(ExifTags.GPS.GPSLatitude)
            raw_lat_ref = gps_ifd.get(ExifTags.GPS.GPSLatitudeRef)
            raw_lon = gps_ifd.get(ExifTags.GPS.GPSLongitude)
            raw_lon_ref = gps_ifd.get(ExifTags.GPS.GPSLongitudeRef)

            if not raw_lat or not raw_lat_ref or not raw_lon or not raw_lon_ref:
                return None

            latitude = dms_to_decimal(raw_lat, str(raw_lat_ref))
            longitude = dms_to_decimal(raw_lon, str(raw_lon_ref))

            if latitude is None or longitude is None:
                return None

            if not (-90.0 <= latitude <= 90.0 and -180.0 <= longitude <= 180.0):
                return None

            # Tọa độ 0, 0 là tọa độ rỗng không hợp lệ
            if latitude == 0.0 and longitude == 0.0:
                return None

            # Sai số vị trí (GPSHPositioningError)
            accuracy = to_float(gps_ifd.get(ExifTags.GPS.GPSHPositioningError))

            # Độ cao (GPSAltitude)
            raw_alt = to_float(gps_ifd.get(ExifTags.GPS.GPSAltitude))
            altitude: float | None = None
            if raw_alt is not None:
                alt_ref = gps_ifd.get(ExifTags.GPS.GPSAltitudeRef)
                is_below_sea = alt_ref in (1, b"\x01")
                altitude = -raw_alt if is_below_sea else raw_alt

            # Hướng la bàn của camera (GPSImgDirection)
            heading = to_float(gps_ifd.get(ExifTags.GPS.GPSImgDirection))

            # Thời gian chụp lúc bắt GPS (GPSTimeStamp & GPSDateStamp)
            date_stamp = gps_ifd.get(ExifTags.GPS.GPSDateStamp)
            time_stamp = gps_ifd.get(ExifTags.GPS.GPSTimeStamp)
            recorded_at: str | None = None

            if date_stamp and time_stamp and isinstance(time_stamp, (tuple, list)) and len(time_stamp) >= 3:
                try:
                    date_parts = [int(p) for p in str(date_stamp).replace("-", ":").split(":")]
                    h = int(to_float(time_stamp[0]) or 0)
                    m = int(to_float(time_stamp[1]) or 0)
                    s = int(to_float(time_stamp[2]) or 0)
                    dt = datetime(date_parts[0], date_parts[1], date_parts[2], h, m, s, tzinfo=timezone.utc)
                    recorded_at = dt.isoformat()
                except Exception as parse_err:
                    logger.debug("Không thể phân tích GPSTimeStamp: %s", parse_err)

            # Metadata tùy biến trong ImageDescription
            raw_metadata: dict[str, Any] = {}
            desc = exif.get(ExifTags.Base.ImageDescription)
            if desc and isinstance(desc, str):
                try:
                    raw_metadata = json.loads(desc)
                except Exception:
                    raw_metadata = {"description": desc}

            return ExtractedGisLocation(
                latitude=latitude,
                longitude=longitude,
                accuracy=accuracy,
                altitude=altitude,
                heading=heading,
                recorded_at=recorded_at,
                raw_metadata=raw_metadata,
            )
    except Exception as exc:
        logger.warning("Lỗi trích xuất EXIF GIS từ ảnh: %s", exc)
        return None


def inject_gis_exif(
    image_bytes: bytes,
    *,
    latitude: float,
    longitude: float,
    gps_accuracy: float | None = None,
    altitude: float | None = None,
    heading: float | None = None,
    recorded_at: datetime | str | None = None,
    custom_metadata: dict[str, Any] | None = None,
) -> bytes:
    """
    Đọc ảnh từ byte, chèn nhóm thẻ GPS IFD chuẩn quốc tế và trả về byte ảnh đã kèm EXIF.
    """
    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            exif = img.getexif()
            gps_ifd = exif.get_ifd(ExifTags.IFD.GPSInfo)

            # 1. Tọa độ Vĩ độ
            lat_deg, lat_min, lat_sec = decimal_to_dms(latitude)
            gps_ifd[ExifTags.GPS.GPSLatitudeRef] = "N" if latitude >= 0 else "S"
            gps_ifd[ExifTags.GPS.GPSLatitude] = (lat_deg, lat_min, lat_sec)

            # 2. Tọa độ Kinh độ
            lon_deg, lon_min, lon_sec = decimal_to_dms(longitude)
            gps_ifd[ExifTags.GPS.GPSLongitudeRef] = "E" if longitude >= 0 else "W"
            gps_ifd[ExifTags.GPS.GPSLongitude] = (lon_deg, lon_min, lon_sec)

            # 3. Độ cao so với mực nước biển
            if altitude is not None and math.isfinite(altitude):
                gps_ifd[ExifTags.GPS.GPSAltitudeRef] = b"\x00" if altitude >= 0 else b"\x01"
                gps_ifd[ExifTags.GPS.GPSAltitude] = abs(float(round(altitude, 2)))

            # 4. Thời gian chuẩn UTC lúc chụp
            dt_utc: datetime
            if isinstance(recorded_at, datetime):
                dt_utc = recorded_at.astimezone(timezone.utc)
            elif isinstance(recorded_at, str) and recorded_at.strip():
                try:
                    clean_str = recorded_at.strip().replace("Z", "+00:00")
                    dt_utc = datetime.fromisoformat(clean_str).astimezone(timezone.utc)
                except Exception:
                    dt_utc = datetime.now(timezone.utc)
            else:
                dt_utc = datetime.now(timezone.utc)

            gps_ifd[ExifTags.GPS.GPSTimeStamp] = (
                float(dt_utc.hour),
                float(dt_utc.minute),
                float(dt_utc.second),
            )
            gps_ifd[ExifTags.GPS.GPSDateStamp] = dt_utc.strftime("%Y:%m:%d")

            # 5. Hướng chụp của camera (la bàn số)
            if heading is not None and math.isfinite(heading) and 0.0 <= heading <= 360.0:
                gps_ifd[ExifTags.GPS.GPSImgDirectionRef] = "T"
                gps_ifd[ExifTags.GPS.GPSImgDirection] = float(round(heading, 2))

            # 6. Bán kính sai số GPS
            if gps_accuracy is not None and math.isfinite(gps_accuracy) and gps_accuracy > 0:
                gps_ifd[ExifTags.GPS.GPSHPositioningError] = float(round(gps_accuracy, 2))

            # 7. Metadata tùy biến trong ImageDescription
            if custom_metadata:
                metadata_str = json.dumps(custom_metadata, ensure_ascii=False)
                exif[ExifTags.Base.ImageDescription] = metadata_str

            output = io.BytesIO()
            save_format = img.format if img.format in ("JPEG", "TIFF") else "JPEG"
            to_save = img
            if save_format == "JPEG" and img.mode in ("RGBA", "LA", "P"):
                to_save = img.convert("RGB")

            to_save.save(output, format=save_format, quality=95, exif=exif)
            return output.getvalue()
    except Exception as exc:
        logger.warning("Không thể nhúng EXIF GIS vào ảnh: %s. Trả về ảnh gốc.", exc)
        return image_bytes
