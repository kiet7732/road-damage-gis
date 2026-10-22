import os
import sys
import time
import json
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')
if sys.stderr.encoding != 'utf-8':
    sys.stderr.reconfigure(encoding='utf-8')

ARTIFACTS_DIR = Path(r"C:\Users\TuaN Kiet\.gemini\antigravity\brain\27ecfe79-b446-4be2-80fd-b2c39c1808f5")
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

BASE_URL = "http://localhost:5173"
API_BASE = "http://127.0.0.1:5000/api"


def run_live_web_interaction():
    print("=" * 70)
    print("🌐 KHỞI CHẠY TỰ ĐỘNG MỞ TRÌNH DUYỆT & THAO TÁC TRỰC QUAN WEB ADMIN")
    print("=" * 70)

    with sync_playwright() as p:
        # Launch browser in HEADED mode (visible to user!)
        print("  🖥️ Đang khởi động trình duyệt Microsoft Edge (Headed Mode)...")
        try:
            browser = p.chromium.launch(channel="msedge", headless=False, slow_mo=700)
        except Exception:
            print("  ⚠️ Không tìm thấy Edge qua channel, khởi chạy Chromium...")
            browser = p.chromium.launch(headless=False, slow_mo=700)

        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        def snap(filename, desc):
            path = ARTIFACTS_DIR / filename
            page.screenshot(path=str(path), full_page=False)
            print(f"  📸 [Chụp màn hình] {filename} -> {desc}")

        # Setup dialog auto-accept for window.confirm
        page.on("dialog", lambda dialog: dialog.accept())

        # -------------------------------------------------------------
        # BƯỚC 1: ĐĂNG NHẬP VÀO WEB ADMIN
        # -------------------------------------------------------------
        print("\n▶ [BƯỚC 1] Đăng nhập vào Web Admin...")
        page.goto(f"{BASE_URL}/login", wait_until="networkidle")
        time.sleep(1)

        page.locator("#admin-email").fill("admin.demo@roadgis.local")
        page.locator("#admin-password").fill("Admin@123")
        time.sleep(0.5)
        page.locator("button[type='submit']").click()
        page.wait_for_url(f"{BASE_URL}/", timeout=10000)
        print("  ✅ Đăng nhập Quản trị viên thành công!")
        time.sleep(1.5)

        # -------------------------------------------------------------
        # BƯỚC 2: CHUYỂN HƯỚNG ĐẾN "QUẢN LÝ TÀI KHOẢN" TRÊN SIDEBAR
        # -------------------------------------------------------------
        print("\n▶ [BƯỚC 2] Nhấp vào mục 'Quản lý tài khoản' trên thanh Sidebar...")
        users_menu = page.locator("a[href='/users']")
        users_menu.wait_for(state="visible", timeout=5000)
        users_menu.click()
        page.wait_for_url(f"{BASE_URL}/users", timeout=10000)
        time.sleep(2)

        snap("live_test_01_user_management_overview.png", "Tổng quan Quản lý tài khoản & Thống kê")
        print("  ✅ Màn hình Quản lý tài khoản đã tải thành công!")

        # -------------------------------------------------------------
        # BƯỚC 3: THỬ NGHIỆM BỘ LỌC VÀ TÌM KIẾM
        # -------------------------------------------------------------
        print("\n▶ [BƯỚC 3] Kiểm tra các bộ lọc và tìm kiếm...")
        # Lọc vai trò Kỹ sư
        print("  - Lọc theo vai trò: Kỹ sư hiện trường")
        page.locator("#user-role-filter").select_option("field_engineer")
        time.sleep(1.5)
        snap("live_test_02_filter_engineers.png", "Bộ lọc vai trò Kỹ sư")

        # Lọc cán bộ địa bàn
        print("  - Lọc theo vai trò: Cán bộ địa bàn")
        page.locator("#user-role-filter").select_option("officer")
        time.sleep(1.5)
        snap("live_test_03_filter_officers.png", "Bộ lọc vai trò Cán bộ")

        # Trả lại tất cả vai trò
        page.locator("#user-role-filter").select_option("all")
        time.sleep(1)

        # Tìm kiếm theo từ khóa
        print("  - Tìm kiếm theo từ khóa: 'quan1'")
        page.locator("#user-search-input").fill("quan1")
        page.locator("#btn-search-users").click()
        time.sleep(1.5)
        snap("live_test_04_search_keyword.png", "Kết quả tìm kiếm 'quan1'")

        # Xóa tìm kiếm
        page.locator("#user-search-input").fill("")
        page.locator("#btn-search-users").click()
        time.sleep(1.5)

        # -------------------------------------------------------------
        # BƯỚC 4: MỞ MODAL VÀ TẠO KỸ SƯ HIỆN TRƯỜNG MỚI
        # -------------------------------------------------------------
        print("\n▶ [BƯỚC 4] Mở Modal và tạo tài khoản Kỹ sư hiện trường mới...")
        page.locator("#btn-create-engineer").click()
        time.sleep(1)

        test_email = "engineer.trongnghia@roadgis.local"
        test_name = "Kỹ Sư Trọng Nghĩa"
        test_pwd = "TrongNghia@2026"
        test_phone = "0918889999"
        test_district = "Quận Bình Thạnh"

        page.locator("#new-user-fullname").fill(test_name)
        page.locator("#new-user-email").fill(test_email)
        page.locator("#new-user-phone").fill(test_phone)
        page.locator("#new-user-password").fill(test_pwd)
        page.locator("#new-user-district").select_option(test_district)
        time.sleep(1)

        snap("live_test_05_create_modal_filled.png", "Form tạo Kỹ sư đã điền đầy đủ dữ liệu")

        page.locator("#btn-submit-create-user").click()
        time.sleep(2)

        # Chờ xuất hiện kỹ sư mới trong danh sách
        page.wait_for_selector(f"text={test_email}", timeout=8000)
        print(f"  ✅ Đã tạo thành công tài khoản Kỹ sư '{test_name}' ({test_email})!")
        snap("live_test_06_engineer_created_in_table.png", "Kỹ sư mới xuất hiện trên bảng dữ liệu")

        # -------------------------------------------------------------
        # BƯỚC 5: THỬ NGHIỆM CHỈNH SỬA THÔNG TIN (EDIT MODAL)
        # -------------------------------------------------------------
        print("\n▶ [BƯỚC 5] Thao tác chỉnh sửa thông tin Kỹ sư...")
        user_row = page.locator(f"tr:has-text('{test_email}')")
        edit_btn = user_row.locator("button[title='Chỉnh sửa thông tin']")
        edit_btn.click()
        time.sleep(1)

        # Thay đổi số điện thoại và địa bàn
        page.locator("input[value='0918889999']").fill("0918889988")
        time.sleep(1)
        snap("live_test_07_edit_modal.png", "Modal chỉnh sửa thông tin người dùng")

        page.locator("button[type='submit']:has-text('Lưu thay đổi')").click()
        time.sleep(2)
        print("  ✅ Đã cập nhật thông tin thành công!")

        # -------------------------------------------------------------
        # BƯỚC 6: THỬ NGHIỆM TẠM KHÓA TÀI KHOẢN (LOCK TOGGLE)
        # -------------------------------------------------------------
        print("\n▶ [BƯỚC 6] Khóa tài khoản Kỹ sư và kiểm tra bảo mật...")
        user_row = page.locator(f"tr:has-text('{test_email}')")
        lock_btn = user_row.locator("button[title='Khóa tài khoản']")
        lock_btn.click()
        time.sleep(2)

        snap("live_test_08_account_locked.png", "Tài khoản Kỹ sư đã chuyển sang trạng thái Tạm khóa")

        # Kiểm tra thử đăng nhập bằng tài khoản bị khóa qua API
        print("  - Thử đăng nhập bằng tài khoản vừa bị khóa...")
        try:
            req = urllib.request.Request(
                f"{API_BASE}/auth/login",
                data=json.dumps({"email": test_email, "password": test_pwd}).encode(),
                headers={"Content-Type": "application/json"},
            )
            urllib.request.urlopen(req)
            print("  ❌ Lỗi: Tài khoản bị khóa vẫn đăng nhập được!")
        except urllib.error.HTTPError as err:
            print(f"  ✅ Đăng nhập bị chặn chính xác với mã lỗi {err.code}: {err.read().decode()}")

        # -------------------------------------------------------------
        # BƯỚC 7: MỞ KHÓA TÀI KHOẢN (UNLOCK TOGGLE)
        # -------------------------------------------------------------
        print("\n▶ [BƯỚC 7] Mở khóa lại tài khoản...")
        user_row = page.locator(f"tr:has-text('{test_email}')")
        unlock_btn = user_row.locator("button[title='Mở khóa tài khoản']")
        unlock_btn.click()
        time.sleep(2)
        snap("live_test_09_account_unlocked.png", "Tài khoản Kỹ sư đã được mở khóa trở lại")

        # -------------------------------------------------------------
        # BƯỚC 8: ĐẶT LẠI MẬT KHẨU (RESET PASSWORD MODAL)
        # -------------------------------------------------------------
        print("\n▶ [BƯỚC 8] Thao tác Đặt lại mật khẩu cho Kỹ sư...")
        user_row = page.locator(f"tr:has-text('{test_email}')")
        key_btn = user_row.locator("button[title='Đặt lại mật khẩu']")
        key_btn.click()
        time.sleep(1)

        new_password = "TrongNghia@NewPassword123"
        page.locator("#reset-new-password").fill(new_password)
        page.locator("#reset-confirm-password").fill(new_password)
        time.sleep(1)
        snap("live_test_10_reset_pwd_modal.png", "Modal Đặt lại mật khẩu")

        page.locator("#btn-submit-reset-pwd").click()
        time.sleep(2)
        print("  ✅ Đã đặt lại mật khẩu mới thành công!")

        # Kiểm tra đăng nhập với mật khẩu mới qua API
        print("  - Thử đăng nhập bằng mật khẩu mới vừa đổi...")
        req = urllib.request.Request(
            f"{API_BASE}/auth/login",
            data=json.dumps({"email": test_email, "password": new_password}).encode(),
            headers={"Content-Type": "application/json"},
        )
        res = urllib.request.urlopen(req)
        login_data = json.loads(res.read().decode())
        print(f"  ✅ Đăng nhập thành công với mật khẩu mới! Role: {login_data['user']['role']}")

        # -------------------------------------------------------------
        # BƯỚC 9: DỌN DẸP DỮ LIỆU TEST
        # -------------------------------------------------------------
        print("\n▶ [BƯỚC 9] Dọn dẹp dữ liệu kiểm thử...")
        from app.database import get_connection
        with get_connection() as conn:
            u = conn.execute("SELECT id FROM users WHERE email = ?", (test_email,)).fetchone()
            if u:
                conn.execute("DELETE FROM refresh_tokens WHERE user_id = ?", (u["id"],))
                conn.execute("DELETE FROM users WHERE id = ?", (u["id"],))
                conn.commit()
        print("  ✅ Đã dọn dẹp sạch sẽ tài khoản kiểm thử!")

        # Dừng xem 3 giây trước khi đóng
        time.sleep(3)
        browser.close()

    print("\n" + "=" * 70)
    print("🎉 TOÀN BỘ QUÁ TRÌNH TỰ ĐỘNG THAO TÁC WEB ADMIN ĐÃ THÀNH CÔNG RỰC RỠ!")
    print("=" * 70)


if __name__ == "__main__":
    run_live_web_interaction()
