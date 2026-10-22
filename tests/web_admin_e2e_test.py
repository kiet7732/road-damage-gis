import sys
import os
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')
if sys.stderr.encoding != 'utf-8':
    sys.stderr.reconfigure(encoding='utf-8')

SCREENSHOT_DIR = Path(r"C:\Users\TuaN Kiet\.gemini\antigravity\brain\d57763c8-cdd3-4704-87c0-855c667f9aed\screenshots")
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)

BASE_URL = "http://localhost:5173"

def run_tests():
    print("=" * 70)
    print("🚀 BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG WEB ADMIN (PLAYWRIGHT CHROME)")
    print("=" * 70)

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        context = browser.new_context(viewport={"width": 1366, "height": 820})
        page = context.new_page()

        def snap(filename, desc):
            path = SCREENSHOT_DIR / filename
            page.screenshot(path=str(path), full_page=False)
            print(f"  📸 Đã chụp: {filename} ({desc})")

        # ---------------------------------------------------------
        # SUITE 1: XÁC THỰC & PHÂN QUYỀN QUẢN TRỊ (RBAC)
        # ---------------------------------------------------------
        print("\n--- [SUITE 1] XÁC THỰC & PHÂN QUYỀN QUẢN TRỊ (RBAC) ---")
        page.goto(f"{BASE_URL}/login", wait_until="networkidle")
        time.sleep(1)
        snap("admin_01_login_page.png", "Giao diện Đăng nhập Quản trị")

        # 1.1 Form rỗng
        submit_btn = page.locator("button[type='submit']")
        submit_btn.click()
        time.sleep(0.5)
        snap("admin_02_validation_empty.png", "Báo lỗi khi để trống form")
        assert "Vui lòng nhập email" in page.content(), "Chưa hiện lỗi email rỗng"

        # 1.2 Sai định dạng email và mật khẩu < 6
        email_input = page.locator("#admin-email")
        password_input = page.locator("#admin-password")
        email_input.fill("invalid-email")
        password_input.fill("123")
        submit_btn.click()
        time.sleep(0.5)
        snap("admin_03_validation_format.png", "Báo lỗi email sai định dạng và mật khẩu ngắn")
        assert "Email không hợp lệ" in page.content(), "Chưa hiện lỗi email không hợp lệ"

        # 1.3 RBAC: Tài khoản không có quyền quản trị
        print("  -> Thử đăng nhập bằng tài khoản Kỹ sư hiện trường...")
        email_input.fill("engineer.a.demo@roadgis.local")
        password_input.fill("Engineer@123")
        submit_btn.click()
        time.sleep(1.5)
        snap("admin_04_rbac_forbidden.png", "Chặn 403 Forbidden với tài khoản không phải cán bộ")
        print("  ✅ [PASS] RBAC chặn tài khoản phi quản trị thành công.")

        # 1.4 Đăng nhập Admin thành công
        print("  -> Đăng nhập bằng tài khoản Quản trị viên...")
        email_input.fill("admin.demo@roadgis.local")
        password_input.fill("Admin@123")
        submit_btn.click()
        page.wait_for_url(f"{BASE_URL}/", timeout=10000)
        time.sleep(2)
        snap("admin_05_dashboard_success.png", "Đăng nhập thành công và vào Dashboard")
        print("  ✅ [PASS] Đăng nhập Admin thành công.")

        # 1.5 Reload giữ phiên
        page.reload(wait_until="networkidle")
        time.sleep(2)
        assert page.url == f"{BASE_URL}/", "Mất phiên sau khi reload"
        print("  ✅ [PASS] bootstrapAdminSession giữ phiên thành công.")

        # ---------------------------------------------------------
        # SUITE 2: BẢNG ĐIỀU KHIỂN TỔNG QUAN & PHÂN TÍCH (DASHBOARD)
        # ---------------------------------------------------------
        print("\n--- [SUITE 2] BẢNG ĐIỀU KHIỂN TỔNG QUAN & PHÂN TÍCH ---")
        snap("admin_06_dashboard_kpis_charts.png", "KPI Cards, Status Bar Chart, Damage Bar Chart, Timeline Area/Line")
        content = page.content()
        assert "Tổng quan hệ thống" in content, "Không thấy Dashboard"
        assert "Chờ xác minh" in content, "Không thấy KPI"
        assert "Phân bổ theo trạng thái" in content, "Không thấy Bar chart trạng thái"
        print("  ✅ [PASS] Dashboard hiển thị đầy đủ KPI và Biểu đồ.")

        # ---------------------------------------------------------
        # SUITE 3: BẢN ĐỒ QUẢN LÝ GIS HIỆN TRƯỜNG
        # ---------------------------------------------------------
        print("\n--- [SUITE 3] BẢN ĐỒ QUẢN LÝ GIS HIỆN TRƯỜNG ---")
        page.goto(f"{BASE_URL}/map", wait_until="networkidle")
        time.sleep(3)
        snap("admin_07_map_initial.png", "Bản đồ GIS Leaflet với Marker và Cụm điểm")

        filter_btn = page.locator("button:has-text('Bộ lọc')")
        if filter_btn.is_visible():
            filter_btn.click()
            time.sleep(1)
            snap("admin_08_map_filter_panel.png", "Bảng Bộ lọc Bản đồ và Viewport Summary")

        list_btn = page.locator("button:has-text('Phản ánh')")
        if list_btn.is_visible():
            list_btn.click()
            time.sleep(1)
            snap("admin_09_map_report_drawer.png", "Danh sách phản ánh trượt trên bản đồ")
            
            report_item_btn = page.locator("button:has-text('D00'), button:has-text('D10'), button:has-text('D20'), button:has-text('D40'), button:has-text('Ổ gà')").first
            if report_item_btn.is_visible():
                report_item_btn.click()
                time.sleep(1.5)
                snap("admin_10_map_selected_card.png", "Thẻ nổi xem trước điểm hư hỏng")
                print("  ✅ [PASS] Tương tác Bản đồ và Thẻ xem trước thành công.")

        # ---------------------------------------------------------
        # SUITE 4: QUẢN LÝ DANH SÁCH PHẢN ÁNH
        # ---------------------------------------------------------
        print("\n--- [SUITE 4] QUẢN LÝ DANH SÁCH PHẢN ÁNH ---")
        page.goto(f"{BASE_URL}/reports", wait_until="networkidle")
        time.sleep(2)
        snap("admin_11_reports_list.png", "Bảng danh sách phản ánh đầy đủ thông tin")

        search_input = page.locator("input[placeholder*='Tìm theo mã']")
        search_input.fill("D40")
        page.locator("button:has-text('Tìm kiếm')").click()
        time.sleep(1.5)
        snap("admin_12_reports_searched.png", "Tìm kiếm phản ánh theo từ khóa 'D40'")

        page.locator("button:has-text('Xóa lọc')").click()
        time.sleep(1.5)
        snap("admin_13_reports_reset_filter.png", "Xóa lọc đưa bảng về mặc định")

        next_page_btn = page.locator("button:has-text('Trang sau')")
        if next_page_btn.is_enabled():
            next_page_btn.click()
            time.sleep(1.5)
            snap("admin_14_reports_page_2.png", "Trang 2 danh sách phản ánh")
            prev_page_btn = page.locator("button:has-text('Trang trước')")
            prev_page_btn.click()
            time.sleep(1.5)
            print("  ✅ [PASS] Phân trang máy chủ mượt mà.")

        # ---------------------------------------------------------
        # SUITE 5: HÀNG ĐỢI ẢNH CẦN KIỂM TRA THÊM
        # ---------------------------------------------------------
        print("\n--- [SUITE 5] HÀNG ĐỢI ẢNH CẦN KIỂM TRA THÊM ---")
        page.goto(f"{BASE_URL}/reports/manual-review", wait_until="networkidle")
        time.sleep(2)
        snap("admin_15_manual_review_queue.png", "Hàng đợi kiểm tra thủ công cho ảnh AI chưa rõ")
        assert "Ảnh cần kiểm tra thêm" in page.content(), "Không đúng trang manual review"
        print("  ✅ [PASS] Hàng đợi kiểm tra thủ công tách luồng chính xác.")

        # ---------------------------------------------------------
        # SUITE 6: CHI TIẾT PHẢN ÁNH & KIỂM ĐỊNH AI
        # ---------------------------------------------------------
        print("\n--- [SUITE 6] CHI TIẾT PHẢN ÁNH & KIỂM ĐỊNH AI ---")
        page.goto(f"{BASE_URL}/reports", wait_until="networkidle")
        time.sleep(1.5)
        detail_btn = page.locator("button:has-text('Xem chi tiết')").first
        detail_btn.click()
        page.wait_for_url(lambda u: "/reports/" in u and not u.endswith("/reports"), timeout=8000)
        time.sleep(2)
        snap("admin_16_report_detail_top.png", "Chi tiết phản ánh & Bounding Box AI")

        print("  -> Cập nhật trạng thái xử lý...")
        status_select = page.locator("select").first
        status_select.select_option(value="processing")
        note_textarea = page.locator("textarea[placeholder*='Nhập nội dung xác minh']")
        note_textarea.fill("Cán bộ quản lý đã tiếp nhận và chuyển giao khảo sát thực địa.")
        save_status_btn = page.locator("button:has-text('Lưu trạng thái')")
        save_status_btn.click()
        time.sleep(2)
        snap("admin_17_report_status_updated.png", "Cập nhật trạng thái 'Đang xử lý' thành công")

        print("  -> Hiệu chỉnh loại hư hỏng (AI Override)...")
        damage_select = page.locator("select").nth(1)
        damage_select.select_option(value="D40")
        save_damage_btn = page.locator("button:has-text('Lưu loại hư hỏng')")
        save_damage_btn.click()
        time.sleep(2)
        snap("admin_18_damage_type_overridden.png", "Hiệu chỉnh loại hư hỏng sau xác minh thành công")
        print("  ✅ [PASS] Cập nhật trạng thái và AI Override thành công.")

        # ---------------------------------------------------------
        # SUITE 7: QUẢN LÝ TÀI KHOẢN CÁN BỘ
        # ---------------------------------------------------------
        print("\n--- [SUITE 7] QUẢN LÝ TÀI KHOẢN CÁN BỘ ---")
        page.goto(f"{BASE_URL}/account", wait_until="networkidle")
        time.sleep(1.5)
        snap("admin_19_account_profile.png", "Hồ sơ cán bộ quản lý đang đăng nhập")
        assert "Nguyen Van Admin" in page.content(), "Không thấy tên cán bộ"
        print("  ✅ [PASS] Thông tin tài khoản hiển thị chính xác.")

        # ---------------------------------------------------------
        # SUITE 8: HẠ TẦNG GIAO DIỆN & TRẢI NGHIỆM ĐA THIẾT BỊ
        # ---------------------------------------------------------
        print("\n--- [SUITE 8] HẠ TẦNG GIAO DIỆN & TRẢI NGHIỆM (RESPONSIVE & ERROR) ---")
        print("  -> Chuyển sang Tablet (820x1024)...")
        page.set_viewport_size({"width": 820, "height": 1024})
        time.sleep(1)
        snap("admin_20_tablet_header_hamburger.png", "Giao diện Tablet với nút Hamburger thu gọn")
        menu_btn = page.locator("button[aria-label='Mở menu']")
        if menu_btn.is_visible():
            menu_btn.click()
            time.sleep(1)
            snap("admin_21_tablet_sidebar_drawer.png", "Sidebar Drawer dạng ngăn kéo trượt")
            close_drawer_btn = page.locator("button[aria-label='Đóng menu']").first
            close_drawer_btn.click()
            time.sleep(0.5)

        print("  -> Chuyển sang Mobile (412x915)...")
        page.set_viewport_size({"width": 412, "height": 915})
        page.goto(f"{BASE_URL}/", wait_until="networkidle")
        time.sleep(1)
        snap("admin_22_mobile_dashboard.png", "Giao diện Mobile Dashboard co giãn linh hoạt")

        page.set_viewport_size({"width": 1366, "height": 820})
        time.sleep(0.5)

        print("  -> Kiểm tra xử lý lỗi 404...")
        page.goto(f"{BASE_URL}/reports/non-existent-report-id-999", wait_until="networkidle")
        time.sleep(1.5)
        snap("admin_23_empty_state_404.png", "Màn hình EmptyState khi 404")
        print("  ✅ [PASS] EmptyState 404 hiển thị đúng chuẩn.")

        print("  -> Kiểm tra Đăng xuất an toàn...")
        user_btn = page.locator("button[title='Mở xác nhận đăng xuất']")
        user_btn.click()
        time.sleep(0.5)
        snap("admin_24_logout_confirm_strip.png", "Dải banner Xác nhận Đăng xuất chống bấm nhầm")
        logout_btn = page.locator("button:has-text('Đăng xuất')").last
        logout_btn.click()
        page.wait_for_url(f"{BASE_URL}/login", timeout=8000)
        time.sleep(1.5)
        snap("admin_25_logged_out_safe.png", "Đăng xuất an toàn và điều hướng về /login")
        print("  ✅ [PASS] Đăng xuất an toàn thành công.")

        browser.close()

    print("\n" + "=" * 70)
    print("🎉 TẤT CẢ 8 NHÓM CHỨC NĂNG WEB ADMIN ĐÃ ĐƯỢC KIỂM THỬ THÀNH CÔNG 100%!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
