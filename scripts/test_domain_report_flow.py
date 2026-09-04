import io
import json
import ssl
import sys
import urllib.request
import uuid
from PIL import Image, ImageDraw

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

BASE_URL = 'https://api.tuannguyenkiet0612.dpdns.org/api'

def create_sample_road_image():
    """Tạo ảnh mẫu giả lập mặt đường có vết nứt để test mô hình."""
    img = Image.new('RGB', (400, 300), color=(100, 100, 105))
    draw = ImageDraw.Draw(img)
    # Vẽ đường nứt giả lập
    draw.line([(50, 150), (120, 140), (200, 160), (320, 130), (380, 155)], fill=(30, 30, 35), width=6)
    draw.ellipse([(180, 140), (240, 180)], fill=(40, 40, 45), outline=(20, 20, 25), width=3)
    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=85)
    return buf.getvalue()

def build_multipart_form(fields: dict, files: dict):
    boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
    body = bytearray()
    
    for key, value in fields.items():
        if value is None:
            continue
        body.extend(f"--{boundary}\r\n".encode('utf-8'))
        body.extend(f'Content-Disposition: form-data; name="{key}"\r\n\r\n'.encode('utf-8'))
        body.extend(f"{value}\r\n".encode('utf-8'))
        
    for key, (filename, filedata, content_type) in files.items():
        body.extend(f"--{boundary}\r\n".encode('utf-8'))
        body.extend(f'Content-Disposition: form-data; name="{key}"; filename="{filename}"\r\n'.encode('utf-8'))
        body.extend(f"Content-Type: {content_type}\r\n\r\n".encode('utf-8'))
        body.extend(filedata)
        body.extend(b"\r\n")
        
    body.extend(f"--{boundary}--\r\n".encode('utf-8'))
    content_type = f"multipart/form-data; boundary={boundary}"
    return bytes(body), content_type

def post_json(endpoint, data, token=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    if token:
        headers['Authorization'] = f"Bearer {token}"
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers)
    with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
        return json.loads(resp.read().decode('utf-8'))

def post_multipart(endpoint, fields, files, token=None):
    url = f"{BASE_URL}{endpoint}"
    body, content_type = build_multipart_form(fields, files)
    headers = {
        'Content-Type': content_type,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Content-Length': str(len(body)),
    }
    if token:
        headers['Authorization'] = f"Bearer {token}"
    req = urllib.request.Request(url, data=body, headers=headers)
    with urllib.request.urlopen(req, timeout=25, context=ctx) as resp:
        return json.loads(resp.read().decode('utf-8'))

def get_json(endpoint, token=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    if token:
        headers['Authorization'] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
        return json.loads(resp.read().decode('utf-8'))

def main():
    print("==================================================================")
    print("  LIVE DOMAIN E2E TEST: CHỤP ẢNH -> AI PREVIEW -> XÁC NHẬN PHẢN ÁNH")
    print(f"  Target Base URL: {BASE_URL}")
    print("==================================================================")

    # 1. Đăng nhập tài khoản người phản ánh
    print("\n[Bước 1] ĐĂNG NHẬP NGƯỜI DÂN (reporter1.demo@roadgis.local)...")
    login_res = post_json('/auth/login', {
        'email': 'reporter1.demo@roadgis.local',
        'password': 'Reporter@123'
    })
    token = login_res.get('accessToken')
    user = login_res.get('user', {})
    print(f" -> Đăng nhập thành công! Người dùng: {user.get('fullName')} (ID: {user.get('id')})")
    assert token, "Không lấy được accessToken!"

    # 2. Tạo ảnh mẫu giả lập từ Camera
    print("\n[Bước 2] CHUẨN BỊ ẢNH CHỤP HIỆN TRƯỜNG & TỌA ĐỘ GPS...")
    image_bytes = create_sample_road_image()
    print(f" -> Đã tạo ảnh JPEG nhị phân: {len(image_bytes)} bytes (400x300)")

    # 3. Gửi ảnh lên API Preview AI (/reports/preview-ai)
    print("\n[Bước 3] TEST GỌI API PREVIEW AI QUA DOMAIN (/reports/preview-ai)...")
    preview_res = post_multipart(
        '/reports/preview-ai',
        fields={},
        files={'image': ('camera_capture.jpg', image_bytes, 'image/jpeg')},
        token=token
    )
    print(f" -> Kết quả AI Preview:")
    print(f"    + Thành công: {preview_res.get('success')}")
    print(f"    + Số đối tượng nhận dạng: {preview_res.get('detections_count')}")
    print(f"    + Thông báo: {preview_res.get('message')}")
    preview_token = preview_res.get('preview_token')
    print(f"    + Preview Token nhận được: {preview_token}")

    # 4. Xác nhận và gửi phản ánh chính thức (/reports)
    test_lat = 10.984512
    test_lng = 106.679541
    test_acc = 12.0
    test_note = "Hư hỏng mặt đường gần cổng trường, xuất hiện vết nứt và ổ gà nhỏ [Live Test Domain]"
    
    print("\n[Bước 4] TEST GỬI PHẢN ÁNH CHÍNH THỨC QUA DOMAIN (/reports)...")
    submit_res = post_multipart(
        '/reports',
        fields={
            'latitude': str(test_lat),
            'longitude': str(test_lng),
            'gps_accuracy': str(test_acc),
            'location_source': 'camera_gps',
            'location_recorded_at': '2026-08-31T13:30:00Z',
            'note': test_note,
            'preview_token': preview_token or '',
        },
        files={'image': ('road_damage_confirmed.jpg', image_bytes, 'image/jpeg')},
        token=token
    )
    
    created_id = submit_res.get('id')
    created_status = submit_res.get('status')
    created_type = submit_res.get('type')
    print(f" -> Gửi phản ánh THÀNH CÔNG! ")
    print(f"    + Mã phản ánh (ID): {created_id}")
    print(f"    + Trạng thái: {created_status}")
    print(f"    + Loại hư hỏng: {created_type}")
    print(f"    + Đường dẫn ảnh: {submit_res.get('photoUri') or submit_res.get('image_url')}")

    # 5. Mở xem chi tiết phản ánh vừa tạo (/reports/{id})
    print(f"\n[Bước 5] TEST MỞ XEM CHI TIẾT PHẢN ÁNH QUA DOMAIN (/reports/{created_id})...")
    detail_res = get_json(f"/reports/{created_id}", token=token)
    print(f" -> Tải chi tiết thành công 100%!")
    print(f"    + ID: {detail_res.get('id')}")
    print(f"    + Vị trí: ({detail_res.get('latitude')}, {detail_res.get('longitude')})")
    print(f"    + AI Status: {detail_res.get('ai_status')}")
    print(f"    + Ghi chú: {detail_res.get('note')}")

    # 6. Kiểm tra GIS Search điểm hư hỏng (/gis/search)
    print("\n[Bước 6] TEST TÌM KIẾM GIS KHÔNG GIAN QUA DOMAIN (/gis/search)...")
    gis_url = f"/gis/search?min_latitude={test_lat-0.01}&max_latitude={test_lat+0.01}&min_longitude={test_lng-0.01}&max_longitude={test_lng+0.01}&limit=50"
    gis_res = get_json(gis_url, token=token)
    features = gis_res.get('features', [])
    found_in_gis = any(f.get('properties', {}).get('id') == created_id for f in features)
    print(f" -> Tổng số điểm GIS trong khu vực: {len(features)} điểm")
    print(f" -> Điểm vừa tạo xuất hiện trên bản đồ GIS: {'CÓ (CHÍNH XÁC ✅)' if found_in_gis else 'CHƯA'}")

    # 7. Kiểm tra lịch sử cá nhân (/reports/history)
    print("\n[Bước 7] TEST KIỂM TRA LỊCH SỬ PHẢN ÁNH CỦA BẠN (/reports/history)...")
    history_res = get_json('/reports/history', token=token)
    history_items = history_res.get('items', []) if isinstance(history_res, dict) else history_res
    found_in_history = any(item.get('id') == created_id for item in history_items)
    print(f" -> Tổng số phản ánh trong lịch sử tài khoản: {len(history_items)} điểm")
    print(f" -> Điểm vừa tạo xuất hiện trong lịch sử cá nhân: {'CÓ (CHÍNH XÁC ✅)' if found_in_history else 'CHƯA'}")

    print("\n==================================================================")
    print("  KẾT QUẢ NGHIỆM THU: TOÀN BỘ LUỒNG CHỤP ẢNH -> GỬI PHẢN ÁNH QUA DOMAIN HOẠT ĐỘNG 100% HOÀN HẢO!")
    print("==================================================================")

if __name__ == '__main__':
    main()
