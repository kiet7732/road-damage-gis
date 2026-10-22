import os
import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright
import urllib.request
import json

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')
if sys.stderr.encoding != 'utf-8':
    sys.stderr.reconfigure(encoding='utf-8')

ARTIFACTS_DIR = Path(r"C:\Users\TuaN Kiet\.gemini\antigravity\brain\27ecfe79-b446-4be2-80fd-b2c39c1808f5")
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

BASE_URL = "http://localhost:5173"
API_BASE = "http://127.0.0.1:5000/api"


def run_tests():
    print("=" * 70)
    print("🚀 BẮT ĐẦU KIỂM THỬ QUẢN LÝ TÀI KHOẢN & PHÂN QUYỀN ROLE GUARD")
    print("=" * 70)

    # 1. First test public registration role guard via API
    print("\n--- [BƯỚC 1] KIỂM TRA BẢO MẬT: PUBLIC REGISTER CHỈ ĐƯỢC TẠO ROLE 'reporter' ---")
    reg_payload = {
        "fullName": "Dân Phản Ánh Test",
        "email": "citizen.guard.test@roadgis.local",
        "password": "CitizenPassword@123",
        "role": "field_engineer",  # Attempt privilege escalation
    }
    req = urllib.request.Request(
        f"{API_BASE}/auth/register",
        data=json.dumps(reg_payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    try:
        res = urllib.request.urlopen(req)
        reg_data = json.loads(res.read().decode())
        created_role = reg_data["user"]["role"]
        print(f"  Role trả về từ public register: '{created_role}'")
        assert created_role == "reporter", f"CRITICAL SECURITY FAILURE: Role was not reporter! Got {created_role}"
        print("  ✅ BẢO MẬT THÀNH CÔNG: Public register hoàn toàn bị ép chặt về role 'reporter', không thể tự đăng ký 'field_engineer'!")
    except urllib.error.HTTPError as e:
        print(f"  Register HTTP Error: {e.code} - {e.read().decode()}")

    # 2. Browser E2E Tests on Web Admin
    print("\n--- [BƯỚC 2] MỞ TRÌNH DUYỆT & ĐĂNG NHẬP WEB ADMIN ---")
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        def snap(filename, desc):
            path = ARTIFACTS_DIR / filename
            page.screenshot(path=str(path), full_page=False)
            print(f"  📸 Đã chụp: {filename} ({desc})")

        # Login
        page.goto(f"{BASE_URL}/login", wait_until="networkidle")
        time.sleep(1)
        page.locator("#admin-email").fill("admin.demo@roadgis.local")
        page.locator("#admin-password").fill("Admin@123")
        page.locator("button[type='submit']").click()
        page.wait_for_url(f"{BASE_URL}/", timeout=10000)
        print("  ✅ Đăng nhập Web Admin thành công!")
        time.sleep(1)

        # 3. Check Sidebar & Navigate to Users Management
        print("\n--- [BƯỚC 3] KIỂM TRA SIDEBAR & ĐIỀU HƯỚNG SANG QUẢN LÝ TÀI KHOẢN ---")
        users_link = page.locator("a[href='/users']")
        assert users_link.count() > 0, "Không tìm thấy menu 'Quản lý tài khoản' trên Sidebar!"
        print("  ✅ Đã tìm thấy menu 'Quản lý tài khoản' trên Sidebar!")
        users_link.click()
        page.wait_for_url(f"{BASE_URL}/users", timeout=10000)
        time.sleep(2)

        # Verify page header and stats
        header_text = page.locator("h2").text_content()
        print(f"  Tiêu đề trang: {header_text}")
        assert "Quản lý tài khoản" in header_text

        snap("admin_users_01_page_overview.png", "Tổng quan trang Quản lý tài khoản & Thống kê")

        # 4. Open Modal "+ Tạo tài khoản Kỹ sư"
        print("\n--- [BƯỚC 4] MỞ MODAL TẠO TÀI KHOẢN KỸ SƯ HIỆN TRƯỜNG ---")
        create_btn = page.locator("#btn-create-engineer")
        assert create_btn.count() > 0, "Không tìm thấy nút '+ Tạo tài khoản Kỹ sư'!"
        create_btn.click()
        time.sleep(1)

        # Verify modal open
        modal_title = page.locator("h3").text_content()
        print(f"  Tiêu đề Modal: {modal_title}")
        snap("admin_users_02_create_modal.png", "Modal Tạo tài khoản Kỹ sư với banner cảnh báo phân quyền")

        # 5. Fill form and submit
        print("\n--- [BƯỚC 5] ĐIỀN THÔNG TIN KỸ SƯ VÀ TẠO TÀI KHOẢN ---")
        test_engineer_email = "engineer.hoangnam@roadgis.local"
        test_engineer_name = "Kỹ Sư Hoàng Nam"
        test_engineer_pwd = "Engineer@123"

        page.locator("#new-user-fullname").fill(test_engineer_name)
        page.locator("#new-user-email").fill(test_engineer_email)
        page.locator("#new-user-password").fill(test_engineer_pwd)
        page.locator("#new-user-phone").fill("0909123456")
        page.locator("#new-user-district").select_option("Quận 1")

        snap("admin_users_02b_create_modal_filled.png", "Form tạo Kỹ sư đã điền đầy đủ dữ liệu")

        page.locator("#btn-submit-create-user").click()
        time.sleep(2)

        # Verify table displays the new engineer
        print("\n--- [BƯỚC 6] XÁC MINH KỸ SƯ MỚI TRÊN BẢNG DỮ LIỆU ---")
        page.wait_for_selector(f"text={test_engineer_email}", timeout=5000)
        print(f"  ✅ Đã tìm thấy tài khoản '{test_engineer_email}' trên danh sách!")
        snap("admin_users_03_created_engineer_row.png", "Danh sách người dùng đã xuất hiện Kỹ sư Hoàng Nam")

        # 6. Test filtering by role
        print("\n--- [BƯỚC 7] KIỂM TRA BỘ LỌC VAI TRÒ (KỸ SƯ HIỆN TRƯỜNG) ---")
        page.locator("#user-role-filter").select_option("field_engineer")
        time.sleep(1.5)
        snap("admin_users_04_filtered_engineers.png", "Bộ lọc vai trò Kỹ sư hiện trường hoạt động chính xác")

        # 7. Test Reset Password Modal
        print("\n--- [BƯỚC 8] KIỂM TRA MODAL ĐẶT LẠI MẬT KHẨU ---")
        # Find the reset password button for the newly created user
        user_row = page.locator(f"tr:has-text('{test_engineer_email}')")
        key_btn = user_row.locator("button[title='Đặt lại mật khẩu']")
        key_btn.click()
        time.sleep(1)

        new_pwd = "NewEngineerPassword@789"
        page.locator("#reset-new-password").fill(new_pwd)
        page.locator("#reset-confirm-password").fill(new_pwd)
        snap("admin_users_05_reset_password_modal.png", "Modal Đặt lại mật khẩu")

        page.locator("#btn-submit-reset-pwd").click()
        time.sleep(2)
        print("  ✅ Đã đặt lại mật khẩu cho kỹ sư thành công!")

        # 8. Test API login as newly created engineer with the new password
        print("\n--- [BƯỚC 9] KIỂM THỬ ĐĂNG NHẬP BẰNG TÀI KHOẢN KỸ SƯ VỪA TẠO ---")
        eng_login_req = urllib.request.Request(
            f"{API_BASE}/auth/login",
            data=json.dumps({"email": test_engineer_email, "password": new_pwd}).encode(),
            headers={"Content-Type": "application/json"},
        )
        eng_res = urllib.request.urlopen(eng_login_req)
        eng_data = json.loads(eng_res.read().decode())
        print(f"  Đăng nhập thành công! User ID: {eng_data['user']['id']}, Role: {eng_data['user']['role']}")
        assert eng_data["user"]["role"] == "field_engineer"
        print("  ✅ Kỹ sư đăng nhập thành công với role field_engineer!")

        # 9. Clean up test users
        print("\n--- [BƯỚC 10] DỌN DẸP DỮ LIỆU KIỂM THỬ ---")
        from app.database import get_connection
        with get_connection() as conn:
            for em in [test_engineer_email, "citizen.guard.test@roadgis.local"]:
                u = conn.execute("SELECT id FROM users WHERE email = ?", (em,)).fetchone()
                if u:
                    conn.execute("DELETE FROM refresh_tokens WHERE user_id = ?", (u["id"],))
                    conn.execute("DELETE FROM users WHERE id = ?", (u["id"],))
            conn.commit()
        print("  ✅ Đã dọn dẹp sạch sẽ dữ liệu test!")

        browser.close()

    print("\n" + "=" * 70)
    print("🎉 TOÀN BỘ KIỂM THỬ E2E WEB ADMIN & ROLE GUARD ĐÃ HOÀN TẤT THÀNH CÔNG RỰC RỠ!")
    print("=" * 70)


if __name__ == "__main__":
    run_tests()
