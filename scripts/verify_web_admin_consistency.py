import json
import ssl
import sys
import urllib.request

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

ADMIN_WEB_URL = 'https://admin.tuannguyenkiet0612.dpdns.org'
API_URL = 'https://api.tuannguyenkiet0612.dpdns.org/api'

def check_web_url(path=""):
    url = f"{ADMIN_WEB_URL}{path}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=12, context=ctx) as resp:
            content = resp.read().decode('utf-8', errors='ignore')
            return resp.status, content
    except Exception as e:
        return 0, str(e)

def api_post(endpoint, data, token=None):
    url = f"{API_URL}{endpoint}"
    headers = {'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
    if token:
        headers['Authorization'] = f"Bearer {token}"
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers)
    with urllib.request.urlopen(req, timeout=12, context=ctx) as resp:
        return json.loads(resp.read().decode('utf-8'))

def api_get(endpoint, token=None):
    url = f"{API_URL}{endpoint}"
    headers = {'User-Agent': 'Mozilla/5.0'}
    if token:
        headers['Authorization'] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=12, context=ctx) as resp:
        return json.loads(resp.read().decode('utf-8'))

def main():
    print("=" * 70)
    print("  TOAN DIEN KIEM TRA HE THONG WEB ADMIN: " + ADMIN_WEB_URL)
    print("=" * 70)

    # 1. Kiem tra HTTP Web Admin Frontend
    print("\n[PHAN 1] KIEM TRA DOWNTIME / HTTP STATUS CAC TUYEN DUONG WEB ADMIN:")
    for path in ["/", "/login", "/map", "/reports", "/statistics", "/users", "/account"]:
        status, content = check_web_url(path)
        is_html = "<!DOCTYPE html>" in content or "<html" in content
        has_root = 'id="root"' in content
        print(f" -> GET {path:<15}: HTTP {status} | SPA HTML Container: {'OK' if is_html and has_root else 'FAIL'}")

    # 2. Kiem tra Xac thuc Admin
    print("\n[PHAN 2] KIEM TRA DANG NHAP VA PHIEN LAM VIEC ADMIN (/auth/login, /auth/me):")
    login_res = api_post('/auth/login', {
        'email': 'admin.demo@roadgis.local',
        'password': 'Admin@123'
    })
    token = login_res.get('accessToken')
    user = login_res.get('user', {})
    print(f" -> Dang nhap: {user.get('fullName')} | Email: {user.get('email')} | Vai tro: {user.get('role')}")
    
    me = api_get('/auth/me', token=token)
    print(f" -> Xac thuc /auth/me: ID={me.get('id')}, Vai tro={me.get('role')}, Dia ban={me.get('managed_district') or 'Toan thanh pho'}")

    # 3. Kiem tra Man hinh Dashboard
    print("\n[PHAN 3] KIEM TRA MAN HINH DASHBOARD TONG QUAN (/admin/dashboard):")
    dashboard = api_get('/admin/dashboard', token=token)
    admin_stats = api_get('/admin/dashboard/administrative-stats', token=token)
    
    total_dash = dashboard.get('total_reports', 0)
    kpis = {item['key']: item['value'] for item in dashboard.get('kpis', [])}
    pending_dash = kpis.get('pending', 0)
    processing_dash = kpis.get('processing', 0)
    repaired_dash = kpis.get('repaired', 0)
    print(f" -> KPI Cards: Tong={total_dash}, Cho duyet={pending_dash}, Dang xu ly={processing_dash}, Da sua={repaired_dash}")
    print(f" -> Phan bo Quan/Huyen (district_stats): {len(admin_stats.get('district_stats', []))} nhom quan/huyen co du lieu")

    # 4. Kiem tra Man hinh Ban do GIS
    print("\n[PHAN 4] KIEM TRA MAN HINH BAN DO GIS (/admin/gis/reports, /gis/reports/clusters):")
    gis_res = api_get('/admin/gis/reports?limit=1000', token=token)
    features = gis_res.get('features', [])
    gis_total = gis_res.get('matched_total', len(features))
    gis_pending = gis_res.get('pending_count', 0)
    gis_processing = gis_res.get('processing_count', 0)
    gis_repaired = gis_res.get('repaired_count', 0)
    print(f" -> Ban do GIS: {len(features)} toa do features hop le | matched_total={gis_total}")
    print(f" -> GIS counts: Cho duyet={gis_pending}, Dang xu ly={gis_processing}, Da sua={gis_repaired}")

    clusters = api_get('/gis/reports/clusters?eps=0.001&min_points=2', token=token)
    print(f" -> Cum phan bo (Clusters): {len(clusters)} cum mat do")

    hierarchy = api_get('/gis/administrative-hierarchy', token=token)
    provinces = hierarchy.get('provinces', [])
    print(f" -> Cay dia gioi hanh chinh: {len(provinces)} tinh/thanh")
    for p in provinces:
        print(f"    * {p.get('name')}: {len(p.get('districts', []))} quan/huyen")

    # 5. Kiem tra Man hinh Danh sach Bao cao
    print("\n[PHAN 5] KIEM TRA MAN HINH DANH SACH BAO CAO (/admin/reports):")
    reports_res = api_get('/admin/reports?limit=50&offset=0', token=token)
    table_items = reports_res.get('items', [])
    table_total = reports_res.get('total', len(table_items))
    print(f" -> Bang danh sach: Tong={table_total} ban ghi (Trang 1 co {len(table_items)} dong)")
    
    # 6. Kiem tra Man hinh Chi tiet Bao cao
    print("\n[PHAN 6] KIEM TRA MAN HINH CHI TIET BAO CAO (/admin/reports/{id}):")
    if table_items:
        first_report = table_items[0]
        rep_id = first_report['id']
        detail = api_get(f'/admin/reports/{rep_id}', token=token)
        print(f" -> Chi tiet #{rep_id}:")
        print(f"    * Loai hu hai: {detail.get('damage_type')} | Nhan: {detail.get('damage_label')}")
        print(f"    * Dia chi: {detail.get('formatted_address')}")
        print(f"    * Toa do: ({detail.get('latitude')}, {detail.get('longitude')})")
        print(f"    * AI detections: {len(detail.get('detections', []))} hop nhan dien")
        print(f"    * Field check-in: checked_in={bool(detail.get('field_checked_in_at'))}, distance={detail.get('field_checked_in_distance_meters')}")
        
        timeline = api_get(f'/admin/reports/{rep_id}/engineer-timeline', token=token)
        print(f"    * Timeline kiem toan: {len(timeline.get('items', []))} su kien ghi nhan")

    # 7. Kiem tra Man hinh Quan ly Nguoi dung
    print("\n[PHAN 7] KIEM TRA MAN HINH QUAN LY NGUOI DUNG (/admin/users):")
    users_res = api_get('/admin/users?page=1&page_size=20', token=token)
    users_items = users_res.get('items', [])
    users_total = users_res.get('total', len(users_items))
    print(f" -> Tong so nguoi dung trong he thong: {users_total} tai khoan")
    role_counts = {}
    for u in users_items:
        r = u.get('role', 'unknown')
        role_counts[r] = role_counts.get(r, 0) + 1
    print(f"    * Phan bo vai tro: {role_counts}")

    # 8. DOI SOAT TINH DONG NHAT DU LIEU (DATA CONSISTENCY AUDIT)
    print("\n" + "=" * 70)
    print("  KET QUA DOI SOAT TINH DONG NHAT DU LIEU (DATA CONSISTENCY):")
    print("=" * 70)
    checks = []

    # So sanh Tong so bao cao giua Dashboard, Table, GIS Map
    match_total = (total_dash == table_total == gis_total)
    checks.append(("Tong so bao cao (Dashboard vs Table vs GIS Map)", f"{total_dash} == {table_total} == {gis_total}", match_total))

    # So sanh So luong Cho duyet
    match_pending = (pending_dash == gis_pending)
    checks.append(("So luong Cho duyet (Dashboard vs GIS Map)", f"{pending_dash} == {gis_pending}", match_pending))

    # So sanh So luong Dang xu ly
    match_proc = (processing_dash == gis_processing)
    checks.append(("So luong Dang xu ly (Dashboard vs GIS Map)", f"{processing_dash} == {gis_processing}", match_proc))

    # So sanh So luong Da sua chua
    match_rep = (repaired_dash == gis_repaired)
    checks.append(("So luong Da sua chua (Dashboard vs GIS Map)", f"{repaired_dash} == {gis_repaired}", match_rep))

    for name, detail, passed in checks:
        mark = "✓ PASS (DONG NHAT TUYET DOI)" if passed else "✗ MISMATCH"
        print(f" -> {name:<50}: {detail} -> {mark}")

    all_passed = all(p for _, _, p in checks)
    print("\n" + "=" * 70)
    if all_passed:
        print("  KET LUAN: TOAN BO DU LIEU DONG NHAT 100% TREN TAT CA MAN HINH!")
    else:
        print("  CANH BAO: CO SU LECH DU LIEU.")
    print("=" * 70)

if __name__ == '__main__':
    main()
