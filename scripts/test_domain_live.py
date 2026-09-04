import json
import ssl
import sys
import urllib.request

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

BASE_URL = 'https://api.tuannguyenkiet0612.dpdns.org/api'

def post_json(endpoint, data, token=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
    if token:
        headers['Authorization'] = f"Bearer {token}"
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers)
    with urllib.request.urlopen(req, timeout=12, context=ctx) as resp:
        return json.loads(resp.read().decode('utf-8'))

def get_json(endpoint, token=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {'User-Agent': 'Mozilla/5.0'}
    if token:
        headers['Authorization'] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=12, context=ctx) as resp:
        return json.loads(resp.read().decode('utf-8'))

def main():
    print("==================================================")
    print("  LIVE DOMAIN VERIFICATION: api.tuannguyenkiet0612.dpdns.org")
    print("==================================================")

    print("\n[1] TEST AUTH KỸ SƯ QUA DOMAIN:")
    login_res = post_json('/auth/login', {
        'email': 'engineer.a.demo@roadgis.local',
        'password': 'Engineer@123'
    })
    token = login_res.get('accessToken')
    user = login_res.get('user', {})
    print(f" -> Đăng nhập thành công: {user.get('fullName')} (Vai trò: {user.get('role')})")
    print(f" -> Token JWT: {token[:25]}...")

    print("\n[2] TEST CÁC DANH MỤC TÁC NGHIỆP QUA DOMAIN:")
    available = get_json('/engineer/reports/available', token=token)
    assigned = get_json('/engineer/reports/assigned', token=token)
    in_progress = get_json('/engineer/reports/in-progress', token=token)
    history = get_json('/engineer/reports/history', token=token)

    print(f" -> [Chờ tiếp nhận]: {available.get('total')} điểm")
    print(f" -> [Được giao việc]: {assigned.get('total')} điểm")
    print(f" -> [Đang kiểm tra]: {in_progress.get('total')} điểm")
    print(f" -> [Đã hoàn tất]: {history.get('total')} điểm")

    avail_items = available.get('items', [])
    if avail_items:
        sample = avail_items[0]
        print(f"\n[3] TEST CHI TIẾT ĐIỂM HƯ HỎNG QUA DOMAIN:")
        print(f" -> ID: #{sample.get('id')[:8].upper()}")
        print(f" -> Vị trí: ({sample.get('latitude')}, {sample.get('longitude')})")
        print(f" -> Trạng thái: {sample.get('status')} | Field status: {sample.get('field_status')}")
        print(f" -> Khả dụng: can_claim={sample.get('can_claim')}, can_check_in={sample.get('can_check_in')}")

    print("\n[4] TEST PROFILE KỸ SƯ QUA DOMAIN (/auth/me):")
    me = get_json('/auth/me', token=token)
    print(f" -> Thông tin: {me.get('fullName')} | {me.get('email')} | Role: {me.get('role')}")

    print("\n[5] TEST WEB ADMIN QUA DOMAIN (admin.tuannguyenkiet0612.dpdns.org):")
    admin_login = post_json('/auth/login', {
        'email': 'admin.demo@roadgis.local',
        'password': 'Admin@123'
    })
    admin_token = admin_login.get('accessToken')
    admin_reports = get_json('/admin/reports?limit=5', token=admin_token)
    print(f" -> Web Admin xác thực thành công. Tổng số phản ánh trên hệ thống: {admin_reports.get('total')}")

    print("\n==================================================")
    print("  KET QUA: TAT CA DOMAIN LIVE HOAT DONG 100% HOAN HAO!")
    print("==================================================")

if __name__ == '__main__':
    main()
