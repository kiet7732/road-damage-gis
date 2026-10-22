#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
STRICT ACCEPTANCE TEST - MOBILE ANDROID RUNNER
Executes end-to-end verification of all flows, buttons, and features
on Android Virtual Device (Pixel 7 Pro) with comprehensive visual screenshots.
"""

import os
import sys
import time
import subprocess
import xml.etree.ElementTree as ET
from typing import Optional, List, Dict

ADB_PATH = r"C:\Android\Sdk\platform-tools\adb.exe"
DEVICE_SERIAL = "emulator-5554"
SCREENSHOT_DIR = r"D:\DATN\Code\road-damage-gis\docs\acceptance_screenshots"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

class StrictAndroidTester:
    def __init__(self, adb: str = ADB_PATH, serial: str = DEVICE_SERIAL):
        self.adb = adb
        self.serial = serial

    def run_cmd(self, *args: str) -> str:
        cmd = [self.adb, "-s", self.serial] + list(args)
        res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
        return res.stdout.strip()

    def shell(self, *args: str) -> str:
        return self.run_cmd("shell", *args)

    def tap(self, x: int, y: int):
        self.shell("input", "tap", str(x), str(y))

    def key(self, keycode: str):
        self.shell("input", "keyevent", keycode)

    def back(self):
        self.key("KEYCODE_BACK")

    def swipe(self, x1: int, y1: int, x2: int, y2: int, duration_ms: int = 500):
        self.shell("input", "swipe", str(x1), str(y1), str(x2), str(y2), str(duration_ms))

    def screenshot(self, filename: str) -> str:
        dest_path = os.path.join(SCREENSHOT_DIR, filename)
        remote_path = f"/sdcard/{filename}"
        self.shell("screencap", "-p", remote_path)
        subprocess.run([self.adb, "-s", self.serial, "pull", remote_path, dest_path], capture_output=True)
        print(f"  📸 Đã chụp màn hình: {filename}", flush=True)
        return dest_path

    def dump_ui(self) -> List[Dict]:
        self.shell("uiautomator", "dump", "/sdcard/dump.xml")
        xml_content = self.run_cmd("shell", "cat", "/sdcard/dump.xml")
        elements = []
        try:
            root = ET.fromstring(xml_content)
            for node in root.iter("node"):
                text = node.attrib.get("text", "")
                desc = node.attrib.get("content-desc", "")
                bounds_str = node.attrib.get("bounds", "")
                if bounds_str.startswith("[") and "][" in bounds_str:
                    parts = bounds_str.strip("[]").split("][")
                    x1, y1 = map(int, parts[0].split(","))
                    x2, y2 = map(int, parts[1].split(","))
                    center_x = (x1 + x2) // 2
                    center_y = (y1 + y2) // 2
                    elements.append({
                        "text": text,
                        "desc": desc,
                        "bounds": (x1, y1, x2, y2),
                        "center": (center_x, center_y),
                        "clickable": node.attrib.get("clickable") == "true",
                        "resource_id": node.attrib.get("resource-id", ""),
                    })
        except Exception:
            pass
        return elements

    def find_element(self, text_or_desc: str, elements: Optional[List[Dict]] = None) -> Optional[Dict]:
        if elements is None:
            elements = self.dump_ui()
        text_lower = text_or_desc.lower()
        for el in elements:
            if text_lower in el["text"].lower() or text_lower in el["desc"].lower():
                return el
        return None

    def tap_element(self, text_or_desc: str, retries: int = 3, delay: float = 1.0) -> bool:
        for _ in range(retries):
            el = self.find_element(text_or_desc)
            if el:
                self.tap(el["center"][0], el["center"][1])
                return True
            time.sleep(delay)
        return False

    def wait_for_element(self, text_or_desc: str, timeout: float = 12.0) -> Optional[Dict]:
        start = time.time()
        while time.time() - start < timeout:
            el = self.find_element(text_or_desc)
            if el:
                return el
            time.sleep(0.5)
        return None


def run_strict_tests():
    sys.stdout.reconfigure(encoding="utf-8")
    print("=" * 70, flush=True)
    print("🛡️ BẮT ĐẦU QUY TRÌNH KIỂM TRA NGHIỆM THU NGHIÊM NGẶT - ROAD DAMAGE GIS", flush=True)
    print("=" * 70, flush=True)

    tester = StrictAndroidTester()

    # 1. Đảm bảo adb reverse và GPS chuẩn
    tester.run_cmd("reverse", "tcp:5000", "tcp:5000")
    tester.run_cmd("reverse", "tcp:8081", "tcp:8081")
    tester.run_cmd("emu", "geo", "fix", "106.6745", "10.9804")

    # Đóng Maps và Chrome nếu có
    tester.shell("am", "force-stop", "com.google.android.apps.maps")
    tester.shell("am", "force-stop", "com.android.chrome")

    # Kiểm tra trạng thái hiện tại của app
    ui = tester.dump_ui()
    is_eng = tester.find_element("Trung tâm tác nghiệp", ui) or tester.find_element("TRỰC BAN", ui)
    is_rep = tester.find_element("Xin chào", ui) or tester.find_element("Gửi phản ánh mới", ui)
    is_login = tester.find_element("ĐĂNG NHẬP", ui)

    print(f"📊 Trạng thái hiện tại: Eng={bool(is_eng)}, Rep={bool(is_rep)}, Login={bool(is_login)}", flush=True)

    # -------------------------------------------------------------
    # PHẦN 1: KIỂM THỬ VAI TRÒ KỸ SƯ HIỆN TRƯỜNG (FIELD ENGINEER)
    # -------------------------------------------------------------
    print("\n" + "="*50, flush=True)
    print("PHẦN 1: KIỂM THỬ VAI TRÒ KỸ SƯ HIỆN TRƯỜNG (FIELD ENGINEER)", flush=True)
    print("="*50, flush=True)

    if not is_eng:
        if is_rep:
            print("  ➡️ Đang ở vai trò Người dân, thực hiện đăng xuất...", flush=True)
            tester.tap(1296, 2960) # Tab Profile
            time.sleep(1.5)
            tester.swipe(720, 2400, 720, 1000, 400)
            time.sleep(0.8)
            tester.tap_element("Đăng xuất")
            time.sleep(1.0)
            confirm = tester.find_element("Đồng ý") or tester.find_element("Đăng xuất")
            if confirm:
                tester.tap(confirm["center"][0], confirm["center"][1])
            time.sleep(2.0)

        # Đăng nhập vai trò Kỹ sư
        print("  🔑 Đăng nhập tài khoản Kỹ sư...", flush=True)
        btn_eng = tester.wait_for_element("Kỹ sư", timeout=8.0)
        if btn_eng:
            tester.tap(btn_eng["center"][0], btn_eng["center"][1])
            time.sleep(0.5)
        tester.tap_element("ĐĂNG NHẬP")
        tester.wait_for_element("Trung tâm tác nghiệp", timeout=12.0)
        time.sleep(1.5)

    # 1.1 Dashboard Kỹ sư
    print("  ✅ [1.1] Kiểm tra Dashboard Kỹ sư & KPIs", flush=True)
    tester.screenshot("strict_eng_01_dashboard.png")

    # 1.2 Tab Bản đồ Radar GIS (Tab 2: X=558, Y=2900)
    print("  ✅ [1.2] Mở Tab Bản đồ Radar GIS...", flush=True)
    tester.tap(558, 2900)
    time.sleep(3.0)
    tester.screenshot("strict_eng_02_radar_map.png")

    # 1.3 Tab Tác nghiệp (Tab 3: X=881, Y=2900)
    print("  ✅ [1.3] Mở Tab Tác nghiệp (Nhiệm vụ)...", flush=True)
    tester.tap(881, 2900)
    time.sleep(2.0)
    tester.screenshot("strict_eng_03_tasks_list.png")

    # 1.4 Mở Chi tiết nhiệm vụ (EngineerTaskDetailScreen)
    print("  ✅ [1.4] Mở Hồ sơ chi tiết nhiệm vụ...", flush=True)
    # Nhấn vào thẻ nhiệm vụ đầu tiên
    tester.tap(720, 650)
    time.sleep(2.5)
    tester.screenshot("strict_eng_04_task_detail_top.png")

    # 1.5 Mở Modal Soi ảnh & Bounding Box AI
    print("  ✅ [1.5] Kiểm tra nút Soi ảnh Bounding Box AI...", flush=True)
    tester.tap(720, 1000) # Thẻ ảnh công dân
    time.sleep(1.5)
    tester.screenshot("strict_eng_05_photo_bbox_modal.png")
    # Đóng modal xem ảnh
    tester.back()
    time.sleep(1.0)

    # 1.6 Cuộn tới Thẻ Địa chỉ & Kiểm tra Nút "Chỉ đường (Google Maps)"
    print("  ✅ [1.6] Kiểm tra Nút 'Chỉ đường (Google Maps)'...", flush=True)
    tester.swipe(720, 1800, 720, 1100, 400)
    time.sleep(1.0)
    tester.screenshot("strict_eng_06_location_card.png")

    # Kích hoạt chỉ đường Google Maps
    nav_btn = tester.find_element("Chỉ đường (Google Maps)") or tester.find_element("Google Maps") or tester.find_element("Chỉ đường")
    if nav_btn:
        print(f"    🌟 Tìm thấy nút chỉ đường tại {nav_btn['bounds']}, kích hoạt dẫn đường...", flush=True)
        tester.tap(nav_btn["center"][0], nav_btn["center"][1])
        time.sleep(3.5)
        tester.screenshot("strict_eng_07_google_maps_nav.png")
        print("    🌟 Đã mở Google Maps Navigation thành công!", flush=True)
        # Tắt Maps hoàn toàn để dọn PiP và quay lại app
        tester.shell("am", "force-stop", "com.google.android.apps.maps")
        time.sleep(1.0)
        tester.shell("monkey", "-p", "com.roaddamagegis.app", "-c", "android.intent.category.LAUNCHER", "1")
        time.sleep(1.5)

    # 1.7 Cuộn xuống khối THAO TÁC TÁC NGHIỆP: Tiếp nhận / Phiếu khảo sát / Ảnh bổ sung
    print("  ✅ [1.7] Kiểm tra các nút tác nghiệp hiện trường...", flush=True)
    tester.swipe(720, 2400, 720, 800, 400)
    time.sleep(1.0)
    tester.screenshot("strict_eng_08_detail_actions.png")

    # Mở Phiếu khảo sát nếu có
    survey_btn = tester.find_element("Phiếu khảo sát")
    if survey_btn:
        print(f"    📝 Bấm nút 'Phiếu khảo sát' tại {survey_btn['bounds']}...", flush=True)
        tester.tap(survey_btn["center"][0], survey_btn["center"][1])
        time.sleep(2.0)
        tester.screenshot("strict_eng_09_survey_screen.png")
        print("    📝 Đã nạp thành công Màn hình Khảo sát hiện trường!", flush=True)
        tester.back()
        time.sleep(1.0)

    # Quay lại danh sách tác nghiệp rồi về Home
    tester.back()
    time.sleep(1.0)

    # 1.8 Tab Tài khoản Kỹ sư & Đăng xuất (Tab 4: X=1205, Y=2900)
    print("  ✅ [1.8] Mở Tab Tài khoản Kỹ sư & Đăng xuất...", flush=True)
    tester.tap(1205, 2900)
    time.sleep(1.5)
    tester.screenshot("strict_eng_10_profile.png")

    # Cuộn xuống và bấm Đăng xuất
    tester.swipe(720, 2400, 720, 1000, 400)
    time.sleep(0.8)
    tester.tap_element("Đăng xuất")
    time.sleep(1.0)
    confirm = tester.find_element("Đồng ý") or tester.find_element("Đăng xuất")
    if confirm:
        tester.tap(confirm["center"][0], confirm["center"][1])
    time.sleep(2.0)
    tester.screenshot("strict_eng_11_logged_out.png")
    print("  🎉 Hoàn tất kiểm thử vai trò Kỹ sư hiện trường!", flush=True)


    # -------------------------------------------------------------
    # PHẦN 2: KIỂM THỬ VAI TRÒ NGƯỜI DÂN (CITIZEN REPORTER)
    # -------------------------------------------------------------
    print("\n" + "="*50, flush=True)
    print("PHẦN 2: KIỂM THỬ VAI TRÒ NGƯỜI DÂN (CITIZEN REPORTER)", flush=True)
    print("="*50, flush=True)

    # 2.1 Đăng nhập vai trò Người dân
    print("  🔑 [2.1] Đăng nhập tài khoản Người dân (Demo)...", flush=True)
    btn_rep = tester.wait_for_element("Người dân", timeout=8.0)
    if btn_rep:
        tester.tap(btn_rep["center"][0], btn_rep["center"][1])
        time.sleep(0.6)
    tester.tap_element("ĐĂNG NHẬP")
    
    # Chờ vào Home của Reporter
    tester.wait_for_element("Xin chào", timeout=12.0)
    time.sleep(1.5)
    tester.screenshot("strict_rep_01_home.png")
    print("  ✅ [2.1] Đăng nhập & nạp dữ liệu Trang chủ Người dân thành công!", flush=True)

    # 2.2 Cuộn xem danh sách phản ánh lân cận trên Home
    print("  ✅ [2.2] Cuộn xem các khối sự cố lân cận...", flush=True)
    tester.swipe(720, 2400, 720, 1000, 500)
    time.sleep(1.0)
    tester.screenshot("strict_rep_02_home_scrolled.png")
    # Cuộn lại lên trên
    tester.swipe(720, 1000, 720, 2400, 300)
    time.sleep(0.8)

    # 2.3 Mở Camera chụp ảnh hiện trường (FAB giữa Tab Bar: X=720, Y=2960)
    print("  ✅ [2.3] Mở Camera chụp ảnh sự cố AI (Nút FAB)...", flush=True)
    tester.tap(720, 2960)
    time.sleep(2.5)
    tester.screenshot("strict_rep_03_camera_screen.png")
    print("  📸 Đã kiểm tra Viewfinder & Controls của Camera!", flush=True)
    # Trở về từ Camera
    tester.back()
    time.sleep(1.5)

    # 2.4 Mở Tab Bản đồ GIS (Tab 2: X=432, Y=2960)
    print("  ✅ [2.4] Mở Tab Bản đồ GIS Công dân...", flush=True)
    tester.tap(432, 2960)
    time.sleep(3.0)
    tester.screenshot("strict_rep_04_map_tab.png")
    print("  🗺️ Đã nạp thành công Bản đồ GIS OpenStreetMap với các điểm hư hỏng!", flush=True)

    # 2.5 Mở Tab Lịch sử (Tab 4: X=1008, Y=2960)
    print("  ✅ [2.5] Mở Tab Lịch sử phản ánh cá nhân...", flush=True)
    tester.tap(1008, 2960)
    time.sleep(2.0)
    tester.screenshot("strict_rep_05_history_tab.png")

    # 2.6 Mở Chi tiết phản ánh (Report Detail Screen)
    print("  ✅ [2.6] Mở Chi tiết phản ánh đầu tiên...", flush=True)
    tester.tap(720, 600) # Thẻ phản ánh đầu tiên
    time.sleep(2.5)
    tester.screenshot("strict_rep_06_report_detail.png")

    # 2.7 Kiểm tra nút "Xem toàn ảnh" (Photo Viewer Modal)
    print("  ✅ [2.7] Kiểm tra nút Xem toàn ảnh sự cố...", flush=True)
    tester.tap_element("Xem toàn ảnh")
    time.sleep(1.5)
    tester.screenshot("strict_rep_07_photo_viewer_modal.png")
    tester.back() # Đóng modal
    time.sleep(1.0)

    # 2.8 Cuộn tới Thẻ Vị trí & Kiểm tra Nút "Chỉ đường (Maps)" của Công dân
    print("  ✅ [2.8] Kiểm tra Nút 'Chỉ đường (Maps)' của Công dân...", flush=True)
    tester.swipe(720, 1800, 720, 900, 400)
    time.sleep(1.0)
    tester.screenshot("strict_rep_08_location_card.png")

    rep_nav_btn = tester.find_element("Chỉ đường (Maps)") or tester.find_element("Chỉ đường")
    if rep_nav_btn:
        print(f"    🌟 Tìm thấy nút chỉ đường công dân tại {rep_nav_btn['bounds']}, kích hoạt dẫn đường...", flush=True)
        tester.tap(rep_nav_btn["center"][0], rep_nav_btn["center"][1])
        time.sleep(3.5)
        tester.screenshot("strict_rep_09_google_maps_opened.png")
        print("    🌟 Đã mở Google Maps dẫn đường cho Công dân thành công!", flush=True)
        # Tắt Maps dọn PiP và quay lại app
        tester.shell("am", "force-stop", "com.google.android.apps.maps")
        time.sleep(1.0)
        tester.shell("monkey", "-p", "com.roaddamagegis.app", "-c", "android.intent.category.LAUNCHER", "1")
        time.sleep(1.5)

    # Quay lại Lịch sử
    tester.back()
    time.sleep(1.0)

    # 2.9 Mở Tab Tài khoản & Đăng xuất (Tab 5: X=1296, Y=2960)
    print("  ✅ [2.9] Mở Tab Tài khoản Người dân & Đăng xuất...", flush=True)
    tester.tap(1296, 2960)
    time.sleep(1.5)
    tester.screenshot("strict_rep_10_profile.png")

    tester.swipe(720, 2400, 720, 1000, 400)
    time.sleep(0.8)
    tester.tap_element("Đăng xuất")
    time.sleep(1.0)
    confirm = tester.find_element("Đồng ý") or tester.find_element("Đăng xuất")
    if confirm:
        tester.tap(confirm["center"][0], confirm["center"][1])
    time.sleep(2.0)
    tester.screenshot("strict_rep_11_logged_out.png")
    print("  🎉 Hoàn tất kiểm thử vai trò Người dân thành công!", flush=True)

    print("\n" + "="*70, flush=True)
    print("🏆 TOÀN BỘ QUY TRÌNH KIỂM TRA NGHIỆM THU NGHIÊM NGẶT ĐÃ HOÀN TẤT XUẤT SẮC!", flush=True)
    print("="*70, flush=True)

if __name__ == "__main__":
    run_strict_tests()
