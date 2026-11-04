import io
import unittest
from PIL import Image

from app.modules.reports.exif_service import extract_gis_exif, inject_gis_exif


class ExifServiceTests(unittest.TestCase):
    def test_01_inject_and_extract_exif(self):
        """Kiểm tra việc ghi thẻ GPS EXIF DMS chuẩn và trích xuất ngược lại tọa độ thập phân."""
        # Tạo 1 ảnh mẫu RGB 100x100
        img = Image.new("RGB", (100, 100), color=(73, 109, 137))
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG")
        raw_jpeg = buffer.getvalue()

        test_lat = 10.762622
        test_lng = 106.660172
        test_acc = 4.5

        # Ghi EXIF GPS
        tagged_jpeg = inject_gis_exif(
            raw_jpeg,
            latitude=test_lat,
            longitude=test_lng,
            gps_accuracy=test_acc,
        )
        self.assertGreater(len(tagged_jpeg), 0)

        # Trích xuất lại EXIF GPS
        extracted = extract_gis_exif(tagged_jpeg)
        self.assertIsNotNone(extracted)
        self.assertAlmostEqual(extracted.latitude, test_lat, places=4)
        self.assertAlmostEqual(extracted.longitude, test_lng, places=4)
        self.assertEqual(extracted.accuracy, test_acc)

    def test_02_extract_from_image_without_exif(self):
        """Ảnh không có thẻ EXIF trả về None một cách an toàn."""
        img = Image.new("RGB", (50, 50), color="white")
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        self.assertIsNone(extract_gis_exif(buf.getvalue()))


if __name__ == "__main__":
    unittest.main()
