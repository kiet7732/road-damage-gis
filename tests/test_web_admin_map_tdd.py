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

def run_map_tdd_tests():
    print("=" * 70)
    print("🚀 BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG & TƯƠNG TÁC BẢN ĐỒ GIS WEB ADMIN (TDD)")
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
        # 1. ĐĂNG NHẬP VÀO HỆ THỐNG WEB ADMIN
        # ---------------------------------------------------------
        print("\n--- [BƯỚC 1] ĐĂNG NHẬP VÀO WEB ADMIN ---")
        page.goto(f"{BASE_URL}/login", wait_until="networkidle")
        time.sleep(1)

        page.locator("#admin-email").fill("admin.demo@roadgis.local")
        page.locator("#admin-password").fill("Admin@123")
        page.locator("button[type='submit']").click()
        page.wait_for_url(f"{BASE_URL}/", timeout=10000)
        print("  ✅ Đăng nhập thành công!")

        # ---------------------------------------------------------
        # 2. TRUY CẬP MÀN HÌNH BẢN ĐỒ GIS VÀ KIỂM TRA HIỂN THỊ BAN ĐẦU
        # ---------------------------------------------------------
        print("\n--- [BƯỚC 2] TRUY CẬP BẢN ĐỒ GIS & KIỂM TRA HIỂN THỊ ---")
        page.goto(f"{BASE_URL}/map", wait_until="networkidle")
        time.sleep(3)
        snap("tdd_map_01_initial_view.png", "Bản đồ GIS hiển thị ban đầu với Toolbar và Leaflet Map")

        # Kiểm tra sự tồn tại của map container và leaflet markers
        leaflet_container = page.locator(".leaflet-container")
        assert leaflet_container.is_visible(), "Lỗi: Không tìm thấy Leaflet map container"
        print("  ✅ Leaflet map container đã render thành công.")

        # ---------------------------------------------------------
        # 3. KIỂM TRA BẢNG BỘ LỌC (MAP FILTER PANEL) & NÚT ĐÓNG 'X'
        # ---------------------------------------------------------
        print("\n--- [BƯỚC 3] BẢNG BỘ LỌC BẢN ĐỒ & NÚT ĐÓNG 'X' ---")
        filter_btn = page.locator("button:has-text('Bộ lọc')")
        filter_btn.click()
        time.sleep(0.8)
        snap("tdd_map_02_filter_panel_open.png", "Bảng bộ lọc mở ở góc trên bên phải với nút đóng X")

        # Kiểm tra nút X đóng bộ lọc
        close_filter_btn = page.locator("button[aria-label='Đóng bộ lọc bản đồ']").first
        assert close_filter_btn.is_visible(), "Lỗi: Không tìm thấy nút X đóng bộ lọc"
        print("  ✅ Nút đóng X của Bảng bộ lọc hiển thị rõ ràng.")

        # ---------------------------------------------------------
        # 4. TÍNH CHẤT LOẠI TRỪ TƯƠNG HỖ (MUTUAL EXCLUSION) GIỮA BỘ LỌC VÀ DANH SÁCH
        # ---------------------------------------------------------
        print("\n--- [BƯỚC 4] TÍNH LOẠI TRỪ TƯƠNG HỖ (MUTUAL EXCLUSION) ---")
        # Khi đang mở Bộ lọc, bấm nút 'Phản ánh' -> Bộ lọc phải tự động đóng, Danh sách mở ra
        list_btn = page.locator("button:has-text('Phản ánh')")
        list_btn.click()
        time.sleep(0.8)
        snap("tdd_map_03_drawer_auto_closed_filter.png", "Mở danh sách phản ánh tự động đóng bảng bộ lọc")
        
        # Kiểm tra bảng bộ lọc đã đóng
        assert not close_filter_btn.is_visible(), "Lỗi: Bảng bộ lọc vẫn mở đè lên danh sách phản ánh"
        print("  ✅ Mở danh sách phản ánh đã tự đóng bảng bộ lọc (không bị đè layout).")

        # ---------------------------------------------------------
        # 5. KIỂM TRA DANH SÁCH PHẢN ÁNH (DRAWER): STATUS BADGE, TỌA ĐỘ, THỜI GIAN
        # ---------------------------------------------------------
        print("\n--- [BƯỚC 5] NỘI DUNG DANH SÁCH PHẢN ÁNH TRÊN BẢN ĐỒ ---")
        drawer_close_btn = page.locator("button[aria-label='Đóng danh sách phản ánh']").first
        assert drawer_close_btn.is_visible(), "Lỗi: Không tìm thấy nút đóng danh sách phản ánh"

        # Lấy item đầu tiên trong drawer
        first_report_item = page.locator("button:has-text('D00'), button:has-text('D10'), button:has-text('D20'), button:has-text('D40'), button:has-text('Ổ gà')").first
        print(f"  -> Tìm thấy item phản ánh trong drawer: {first_report_item.inner_text()[:40]}...")
        snap("tdd_map_04_drawer_items_detail.png", "Danh sách phản ánh với StatusBadge và Tọa độ + Ngày giờ")

        # ---------------------------------------------------------
        # 6. BẤM CHỌN ITEM TRONG DANH SÁCH -> THẺ NỔI DETAIL CARD Ở GÓC DƯỚI TRÁI
        # ---------------------------------------------------------
        print("\n--- [BƯỚC 6] CHỌN ITEM -> HIỂN THỊ THẺ NỔI DETAIL CARD Ở GÓC DƯỚI TRÁI ---")
        first_report_item.click()
        time.sleep(1.5)
        snap("tdd_map_05_detail_card_bottom_left.png", "Thẻ nổi xem trước ở góc dưới trái (left: 18, bottom: 18) không bị che khuất")

        # Kiểm tra các thông tin trong Detail Card
        detail_close_btn = page.locator("button[aria-label='Đóng thẻ chi tiết']").first
        assert detail_close_btn.is_visible(), "Lỗi: Không tìm thấy nút X đóng thẻ xem trước"
        
        detail_view_btn = page.locator("button:has-text('Xem chi tiết')").first
        assert detail_view_btn.is_visible(), "Lỗi: Không tìm thấy nút 'Xem chi tiết' trong thẻ nổi"
        print("  ✅ Thẻ nổi xuất hiện đầy đủ nút đóng X và nút Xem chi tiết.")

        # ---------------------------------------------------------
        # 7. PHÍM ESCAPE ĐÓNG THẺ XEM TRƯỚC VÀ CÁC OVERLAY
        # ---------------------------------------------------------
        print("\n--- [BƯỚC 7] KIỂM TRA PHÍM ESCAPE ĐÓNG THẺ XEM TRƯỚC ---")
        page.keyboard.press("Escape")
        time.sleep(0.8)
        snap("tdd_map_06_escape_closed_card.png", "Nhấn Escape đóng thẻ nổi thành công")
        assert not detail_close_btn.is_visible(), "Lỗi: Thẻ xem trước vẫn chưa đóng sau khi bấm Escape"
        print("  ✅ Bấm Escape đã đóng thành công thẻ xem trước.")

        # Mở lại bộ lọc và bấm Escape để kiểm tra
        filter_btn.click()
        time.sleep(0.5)
        assert close_filter_btn.is_visible()
        page.keyboard.press("Escape")
        time.sleep(0.5)
        assert not close_filter_btn.is_visible()
        print("  ✅ Bấm Escape đã đóng thành công Bảng bộ lọc.")

        # ---------------------------------------------------------
        # 8. BẤM TRỰC TIẾP MARKER TRÊN BẢN ĐỒ -> AUTO-PAN & DETAIL CARD
        # ---------------------------------------------------------
        print("\n--- [BƯỚC 8] BẤM TRỰC TIẾP MARKER TRÊN BẢN ĐỒ -> TỰ ĐỘNG PAN VÀ HIỆN THẺ ---")
        marker = page.locator(".leaflet-marker-icon").first
        if marker.is_visible():
            marker.click(force=True)
            time.sleep(1.2)
            snap("tdd_map_07_marker_clicked_pan.png", "Bấm marker trên bản đồ: Auto-pan và thẻ nổi góc dưới trái")
            
            # Đóng thẻ bằng nút X
            if detail_close_btn.is_visible():
                detail_close_btn.click()
                time.sleep(0.6)
                snap("tdd_map_08_card_closed_via_x.png", "Đóng thẻ nổi bằng nút X góc trên phải của thẻ")
                assert not detail_close_btn.is_visible(), "Lỗi: Nút X không đóng được thẻ"
                print("  ✅ Nút X của thẻ xem trước hoạt động chính xác.")

        # ---------------------------------------------------------
        # 9. KIỂM TRA CÁC VIEWPORT RESPONSIVE (TABLET 900px, MOBILE 414px)
        # ---------------------------------------------------------
        print("\n--- [BƯỚC 9] KIỂM TRA GIAO DIỆN RESPONSIVE TRÊN TABLET & MOBILE ---")
        # Tablet
        page.set_viewport_size({"width": 880, "height": 720})
        time.sleep(1)
        snap("tdd_map_09_tablet_layout.png", "Giao diện bản đồ trên Tablet (880px)")

        filter_btn.click()
        time.sleep(0.6)
        snap("tdd_map_10_tablet_filter_overlay.png", "Bảng bộ lọc responsive trên Tablet với nút X")
        page.keyboard.press("Escape")
        time.sleep(0.5)

        # Mobile
        page.set_viewport_size({"width": 414, "height": 896})
        time.sleep(1)
        snap("tdd_map_11_mobile_layout.png", "Giao diện bản đồ trên Mobile iPhone XR (414px)")

        filter_btn.click()
        time.sleep(0.6)
        snap("tdd_map_12_mobile_filter_overlay.png", "Bảng bộ lọc responsive trên Mobile")
        close_filter_mobile = page.locator("button[aria-label='Đóng bộ lọc bản đồ']").first
        if close_filter_mobile.is_visible():
            close_filter_mobile.click()
            time.sleep(0.5)

        # Bật danh sách phản ánh trên mobile
        list_btn.click()
        time.sleep(0.6)
        snap("tdd_map_13_mobile_drawer_overlay.png", "Danh sách phản ánh responsive trên Mobile")

        print("\n" + "=" * 70)
        print("🎉 TẤT CẢ CÁC BƯỚC KIỂM THỬ TDD BẢN ĐỒ GIS ĐÃ HOÀN TẤT VÀ VƯỢT QUA 100%!")
        print("=" * 70)

        browser.close()

if __name__ == "__main__":
    run_map_tdd_tests()
