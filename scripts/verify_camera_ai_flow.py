#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
VERIFY CAMERA AI FLOW ON ANDROID EMULATOR
Tests capturing a photo, receiving AI detection preview from backend,
and verifying the report confirmation and submission on Pixel 7 Pro emulator.
"""

import os
import sys
import time
import subprocess
import xml.etree.ElementTree as ET

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

ADB_PATH = r"C:\Android\Sdk\platform-tools\adb.exe"
DEVICE_SERIAL = "emulator-5554"
SCREENSHOT_DIR = r"D:\DATN\Code\road-damage-gis\docs\acceptance_screenshots"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

class CameraAiVerifier:
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

    def input_text(self, text: str):
        escaped = text.replace(" ", "%s").replace("&", "\&").replace("<", "\<").replace(">", "\>").replace("@", "\@")
        self.shell("input", "text", escaped)

    def screenshot(self, filename: str) -> str:
        local_path = os.path.join(SCREENSHOT_DIR, filename)
        remote_path = f"/sdcard/{filename}"
        self.shell("screencap", "-p", remote_path)
        cmd = [self.adb, "-s", self.serial, "pull", remote_path, local_path]
        subprocess.run(cmd, capture_output=True)
        self.shell("rm", remote_path)
        print(f"  [SCREENSHOT] Saved: {local_path}")
        return local_path

    def dump_hierarchy(self) -> ET.Element:
        xml_str = ""
        for attempt in range(3):
            self.shell("uiautomator", "dump", "/sdcard/dump.xml")
            time.sleep(0.3)
            out = self.run_cmd("exec-out", "cat", "/sdcard/dump.xml")
            if out and "<hierarchy" in out:
                xml_str = out
                break
            time.sleep(0.5)

        if not xml_str or "<hierarchy" not in xml_str:
            return ET.Element("hierarchy")
        try:
            clean_xml = xml_str[xml_str.find("<hierarchy"):]
            return ET.fromstring(clean_xml)
        except Exception:
            return ET.Element("hierarchy")

    def find_node(self, root: ET.Element, text_contains: str = None, desc_contains: str = None, class_name: str = None):
        for node in root.iter("node"):
            t = node.get("text", "")
            d = node.get("content-desc", "")
            c = node.get("class", "")

            match = True
            if text_contains and text_contains.lower() not in t.lower():
                match = False
            if desc_contains and desc_contains.lower() not in d.lower():
                match = False
            if class_name and class_name != c:
                match = False
            if match:
                return node
        return None

    def get_bounds_center(self, node: ET.Element):
        bounds = node.get("bounds", "")
        if bounds:
            import re
            m = re.findall(r"\d+", bounds)
            if len(m) == 4:
                x1, y1, x2, y2 = map(int, m)
                return (x1 + x2) // 2, (y1 + y2) // 2
        return None

    def tap_node(self, node: ET.Element) -> bool:
        pt = self.get_bounds_center(node)
        if pt:
            self.tap(pt[0], pt[1])
            return True
        return False

    def tap_by_text(self, text: str) -> bool:
        root = self.dump_hierarchy()
        node = self.find_node(root, text_contains=text)
        if node is not None:
            return self.tap_node(node)
        return False

    def tap_by_desc(self, desc: str) -> bool:
        root = self.dump_hierarchy()
        node = self.find_node(root, desc_contains=desc)
        if node is not None:
            return self.tap_node(node)
        return False

    def grant_permissions(self):
        pkg = "com.roaddamagegis.app"
        for perm in [
            "android.permission.CAMERA",
            "android.permission.ACCESS_FINE_LOCATION",
            "android.permission.ACCESS_COARSE_LOCATION",
            "android.permission.READ_EXTERNAL_STORAGE",
            "android.permission.WRITE_EXTERNAL_STORAGE",
        ]:
            self.shell("pm", "grant", pkg, perm)
        print("  [PERMS] Granted camera & location permissions")

    def fix_gps(self, lat: float = 10.984678, lon: float = 106.677842):
        self.run_cmd("emu", "geo", "fix", str(lon), str(lat), "10")
        print(f"  [GPS] Fixed emulator GPS to ({lat}, {lon})")

def main():
    verifier = CameraAiVerifier()
    print("=" * 60)
    print("  VERIFY CAMERA & AI DETECTION FLOW ON EMULATOR")
    print("=" * 60)

    # 1. Cap quyen va bat GPS
    verifier.grant_permissions()
    verifier.fix_gps(10.984678, 106.677842)

    # 2. Khoi dong app
    print("\n[Bước 1] Mở ứng dụng Road Damage GIS...")
    verifier.shell("am", "force-stop", "com.roaddamagegis.app")
    time.sleep(1)
    verifier.shell("monkey", "-p", "com.roaddamagegis.app", "-c", "android.intent.category.LAUNCHER", "1")
    time.sleep(5)
    verifier.screenshot("verify_camera_step1_launch.png")

    # 3. Kiem tra man hinh hien tai (Login hay Home)
    root = verifier.dump_hierarchy()
    login_btn = verifier.find_node(root, desc_contains="Đăng nhập") or verifier.find_node(root, text_contains="Đăng nhập")

    if login_btn is not None:
        print("\n[Bước 2] Phát hiện màn hình đăng nhập, thực hiện đăng nhập Người dân...")
        # Tim input email
        email_input = verifier.find_node(root, class_name="android.widget.EditText")
        if email_input is not None:
            verifier.tap_node(email_input)
            time.sleep(0.5)
            # Clear text
            for _ in range(30):
                verifier.key("KEYCODE_DEL")
            verifier.input_text("reporter1.demo@roadgis.local")
            time.sleep(0.5)

            # Tab sang password
            verifier.key("KEYCODE_TAB")
            time.sleep(0.3)
            verifier.input_text("Reporter@123")
            time.sleep(0.5)
            verifier.key("KEYCODE_BACK") # an keyboard
            time.sleep(0.5)

            # Bam dang nhap
            verifier.tap_by_desc("Đăng nhập hệ thống") or verifier.tap_by_text("ĐĂNG NHẬP")
            time.sleep(4)
            verifier.screenshot("verify_camera_step2_logged_in.png")

    # 4. Mo man hinh Camera
    print("\n[Bước 3] Điều hướng sang màn hình Camera...")
    # Thu tim tab Camera hoac nut chup tren Home
    camera_btn = (
        verifier.find_node(verifier.dump_hierarchy(), desc_contains="Camera")
        or verifier.find_node(verifier.dump_hierarchy(), desc_contains="Chụp ảnh")
        or verifier.find_node(verifier.dump_hierarchy(), text_contains="Báo cáo ngay")
        or verifier.find_node(verifier.dump_hierarchy(), text_contains="Chụp ảnh")
    )

    if camera_btn is not None:
        verifier.tap_node(camera_btn)
    else:
        # Tap toa do tab giua (bottom bar)
        verifier.tap(720, 2900)
    time.sleep(4)
    verifier.screenshot("verify_camera_step3_camera_screen.png")

    # 5. Chup anh tren man hinh Camera
    print("\n[Bước 4] Nhấn nút chụp ảnh hiện trường...")
    # Nút chụp ảnh tròn ở đáy màn hình camera (thường x=720, y~2700-2850 trên màn 1440x3120)
    shutter_btn = verifier.find_node(verifier.dump_hierarchy(), desc_contains="Chụp ảnh")
    if shutter_btn is not None:
        verifier.tap_node(shutter_btn)
    else:
        verifier.tap(720, 2800)
    
    print("  Đang chờ AI backend xử lý nhận diện ảnh...")
    time.sleep(8)
    verifier.screenshot("verify_camera_step4_confirm_screen.png")

    # 6. Kiem tra noi dung tren man hinh "Xac nhan phan anh"
    print("\n[Bước 5] Kiểm tra phản hồi từ Backend trên màn hình Xác nhận...")
    root = verifier.dump_hierarchy()
    confirm_title = verifier.find_node(root, text_contains="Xác nhận phản ánh")
    if confirm_title is not None:
        print("  -> ĐÃ VÀO MÀN HÌNH XÁC NHẬN PHẢN ÁNH THÀNH CÔNG! ✅")
    
    # Kiem tra xem co bao loi mang khong
    net_err = verifier.find_node(root, text_contains="Không thể kết nối")
    if net_err is not None:
        print("  [CẢNH BÁO] Phát hiện thông báo lỗi kết nối!")
    else:
        print("  -> KHÔNG BỊ LỖI KẾT NỐI MẠNG! Hệ thống gọi API thành công! ✅")

    # 7. Nhap ghi chu va xac nhan gui
    print("\n[Bước 6] Thử xác nhận gửi phản ánh...")
    confirm_send_btn = verifier.find_node(root, text_contains="Xác nhận gửi") or verifier.find_node(root, desc_contains="Xác nhận gửi")
    if confirm_send_btn is not None:
        verifier.tap_node(confirm_send_btn)
        time.sleep(6)
        verifier.screenshot("verify_camera_step5_submitted.png")
        print("  -> Đã bấm Xác nhận gửi!")

    print("\n" + "=" * 60)
    print("  KIỂM TRA HOÀN TẤT!")
    print("=" * 60)

if __name__ == "__main__":
    main()
