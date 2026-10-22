"""
Automated E2E Test Suite for Physical Android Device (Redmi Note 9S)
Road Damage GIS Mobile App
"""

import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime

ADB = r"C:\Android\Sdk\platform-tools\adb.exe"
DEVICE_SERIAL = "9313da7b"
PACKAGE_NAME = "com.roaddamagegis.app"
MAIN_ACTIVITY = f"{PACKAGE_NAME}/.MainActivity"
ARTIFACT_DIR = r"C:\Users\TuaN Kiet\.gemini\antigravity\brain\d57763c8-cdd3-4704-87c0-855c667f9aed"
SCREENSHOT_DIR = os.path.join(ARTIFACT_DIR, "screenshots")
SCRATCH_DIR = os.path.join(ARTIFACT_DIR, "scratch")

os.makedirs(SCREENSHOT_DIR, exist_ok=True)
os.makedirs(SCRATCH_DIR, exist_ok=True)

test_results = []
bugs_found = []

def run_adb(args, timeout=20):
    cmd = [ADB, "-s", DEVICE_SERIAL] + args
    try:
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=timeout, encoding="utf-8", errors="replace")
        return proc.returncode, proc.stdout.strip(), proc.stderr.strip()
    except subprocess.TimeoutExpired:
        return -1, "", f"ADB Command timed out after {timeout}s: {' '.join(cmd)}"

def capture_screen(name):
    remote_path = f"/sdcard/Download/{name}.png"
    local_path = os.path.join(SCREENSHOT_DIR, f"{name}.png")
    run_adb(["shell", "screencap", "-p", remote_path])
    run_adb(["pull", remote_path, local_path])
    return local_path

def dump_ui(name="dump"):
    remote_path = f"/sdcard/Download/{name}.xml"
    local_path = os.path.join(SCRATCH_DIR, f"{name}.xml")
    run_adb(["shell", "uiautomator", "dump", remote_path])
    run_adb(["pull", remote_path, local_path])
    if os.path.exists(local_path):
        with open(local_path, "r", encoding="utf-8", errors="replace") as f:
            return f.read()
    return ""

def tap(x, y, delay=1.0):
    run_adb(["shell", "input", "tap", str(x), str(y)])
    time.sleep(delay)

def tap_node_by_text_or_desc(xml_content, pattern):
    match = re.search(rf'(?:text|content-desc)="[^"]*{pattern}[^"]*".*?bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', xml_content)
    if match:
        x1, y1, x2, y2 = map(int, match.groups())
        cx = (x1 + x2) // 2
        cy = (y1 + y2) // 2
        return cx, cy
    return None

def clear_logcat():
    run_adb(["logcat", "-c"])

def get_logcat_errors():
    _, stdout, _ = run_adb(["logcat", "-d", "-s", "AndroidRuntime:E", "ReactNativeJS:E"])
    return stdout

def record_test(tc_id, name, status, duration_ms, details=""):
    test_results.append({
        "id": tc_id,
        "name": name,
        "status": status,
        "duration_ms": duration_ms,
        "details": details
    })
    print(f"[{status}] {tc_id}: {name} ({duration_ms}ms) - {details}")

print("E2E Test Runner initialized.")
