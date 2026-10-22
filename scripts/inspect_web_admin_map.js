// scripts/inspect_web_admin_map.js
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\TuaN Kiet\\.gemini\\antigravity\\brain\\d57763c8-cdd3-4704-87c0-855c667f9aed\\screenshots';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TARGET_URL = 'https://admin.tuannguyenkiet0612.dpdns.org';

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.msgId = 0;
    this.callbacks = new Map();
    this.events = new Map();

    this.ready = new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) {
          reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        } else {
          resolve(msg.result);
        }
      } else if (msg.method) {
        const handlers = this.events.get(msg.method) || [];
        handlers.forEach(h => h(msg.params));
      }
    };
  }

  send(method, params = {}) {
    const id = ++this.msgId;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, handler) {
    if (!this.events.has(method)) {
      this.events.set(method, []);
    }
    this.events.get(method).push(handler);
  }

  async captureScreenshot(filename) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    const outPath = path.join(ARTIFACT_DIR, filename);
    fs.writeFileSync(outPath, buffer);
    console.log(`[Screenshot] Saved: ${filename} (${buffer.length} bytes)`);
    return outPath;
  }

  async eval(expr) {
    const res = await this.send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      console.warn(`[CDP Eval Warning]: ${res.exceptionDetails.text}`, res.exceptionDetails.exception?.description);
    }
    return res.result?.value;
  }

  async setViewport(width, height) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 768,
    });
  }

  close() {
    this.ws.close();
  }
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log('=== STARTING WEB ADMIN MAP DEEP INSPECTION ===');
  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }

  // 1. Launch Chrome
  console.log('1. Launching Headless Chrome on port 9222...');
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1600,1000',
    '--hide-scrollbars'
  ]);

  let versionInfo;
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    try {
      versionInfo = await fetchJson('http://localhost:9222/json/version');
      if (versionInfo && versionInfo.webSocketDebuggerUrl) break;
    } catch (_) {}
  }

  if (!versionInfo) {
    throw new Error('Chrome failed to start on port 9222');
  }

  const targets = await fetchJson('http://localhost:9222/json/list');
  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
  const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
  await cdp.ready;

  const logs = [];
  const errors = [];
  cdp.on('Runtime.consoleAPICalled', (params) => {
    const text = params.args.map(a => a.value || a.description).join(' ');
    logs.push(`[Console ${params.type}] ${text}`);
    if (params.type === 'error') {
      errors.push(text);
    }
  });

  cdp.on('Runtime.exceptionThrown', (params) => {
    const desc = params.exceptionDetails.exception?.description || params.exceptionDetails.text;
    errors.push(`[Exception] ${desc}`);
  });

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('DOM.enable');

  try {
    // 2. Open Login Page
    console.log(`2. Navigating to ${TARGET_URL}/login...`);
    await cdp.send('Page.navigate', { url: `${TARGET_URL}/login` });
    
    // Wait for login form to render
    for (let i = 0; i < 20; i++) {
      await sleep(500);
      const ready = await cdp.eval(`!!document.querySelector('input[type="email"]')`);
      if (ready) {
        console.log(`Login form ready after ${(i+1)*500}ms`);
        break;
      }
    }
    await cdp.captureScreenshot('web_admin_01_login.png');

    // 3. Perform Login
    console.log('3. Filling admin credentials via demo button...');
    const fillResult = await cdp.eval(`
      (() => {
        const demoBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Quản trị viên'));
        if (demoBtn) {
          demoBtn.click();
          return 'Demo button clicked';
        }
        return 'Demo button not found';
      })()
    `);
    console.log('Fill result:', fillResult);
    await sleep(600);
    await cdp.captureScreenshot('web_admin_02_credentials_filled.png');

    console.log('4. Clicking submit login...');
    const submitResult = await cdp.eval(`
      (() => {
        const submitBtn = document.querySelector('button[type="submit"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('ĐĂNG NHẬP'));
        if (submitBtn) {
          submitBtn.click();
          return 'Submit clicked';
        }
        return 'Submit button not found';
      })()
    `);
    console.log('Submit result:', submitResult);
    
    // Wait for login API call & redirect
    for (let i = 0; i < 20; i++) {
      await sleep(500);
      const url = await cdp.eval(`window.location.pathname`);
      if (url && url !== '/login') {
        console.log(`Redirected to ${url} after ${(i+1)*500}ms`);
        break;
      }
    }

    // 5. Navigate to /map
    console.log('5. Navigating to /map...');
    await cdp.send('Page.navigate', { url: `${TARGET_URL}/map` });
    
    // Wait for map container to render
    for (let i = 0; i < 20; i++) {
      await sleep(500);
      const mapReady = await cdp.eval(`!!document.querySelector('.leaflet-container')`);
      if (mapReady) {
        console.log(`Leaflet container ready after ${(i+1)*500}ms`);
        break;
      }
    }
    await sleep(2500); // let tiles, markers and layout settle
    await cdp.captureScreenshot('web_admin_03_map_initial.png');

    // Check page title and structure
    const pageInfo = await cdp.eval(`
      (() => {
        return {
          url: window.location.href,
          title: document.title,
          sidebarExists: !!document.querySelector('.road-admin-map-sidebar'),
          mapContainerExists: !!document.querySelector('.leaflet-container'),
          leafletTilesCount: document.querySelectorAll('.leaflet-tile').length,
          leafletMarkersCount: document.querySelectorAll('.leaflet-marker-icon').length,
          buttonsText: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(Boolean).slice(0, 30),
          selects: Array.from(document.querySelectorAll('select')).map(s => ({
            value: s.value,
            options: Array.from(s.options).map(o => o.text).slice(0, 8)
          }))
        };
      })()
    `);
    console.log('Page State:', JSON.stringify(pageInfo, null, 2));

    // 6. Test Administrative Filters (District / Ward / Road)
    console.log('6. Inspecting and testing Administrative Filter Bar...');
    const districtSelected = await cdp.eval(`
      (() => {
        const selects = Array.from(document.querySelectorAll('select'));
        const districtSelect = selects.find(s => Array.from(s.options).some(o => o.text.includes('Bến Cát') || o.text.includes('Thủ Dầu Một')));
        if (districtSelect) {
          const opt = Array.from(districtSelect.options).find(o => o.text.includes('Bến Cát') || (o.value && o.value !== ''));
          if (opt) {
            districtSelect.value = opt.value;
            districtSelect.dispatchEvent(new Event('change', { bubbles: true }));
            return { selected: opt.text, val: opt.value };
          }
        }
        return null;
      })()
    `);
    console.log('District selection result:', districtSelected);
    await sleep(2500);
    await cdp.captureScreenshot('web_admin_04_district_selected.png');

    // 7. Test Status Filter (Click status chip button "Chờ xác minh")
    console.log('7. Testing Status Filter chip (Clicking "Chờ xác minh")...');
    const statusClickResult = await cdp.eval(`
      (() => {
        const pendingBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Chờ xác minh') && b.getAttribute('title')?.includes('Lọc theo'));
        if (pendingBtn) {
          pendingBtn.click();
          return 'Clicked Chờ xác minh filter button';
        }
        const statusSelect = Array.from(document.querySelectorAll('select')).find(s => Array.from(s.options).some(o => o.value === 'pending'));
        if (statusSelect) {
          statusSelect.value = 'pending';
          statusSelect.dispatchEvent(new Event('change', { bubbles: true }));
          return 'Selected pending via status select';
        }
        return 'Status filter element not found';
      })()
    `);
    console.log('Status filter click result:', statusClickResult);
    await sleep(2000);
    await cdp.captureScreenshot('web_admin_05_status_filter_applied.png');

    // 8. Test Damage Type Filter (Select Ổ gà - D40)
    console.log('8. Testing Damage Type dropdown...');
    const damageTypeResult = await cdp.eval(`
      (() => {
        const selects = Array.from(document.querySelectorAll('select'));
        const damageSelect = selects.find(s => Array.from(s.options).some(o => o.value === 'D40'));
        if (damageSelect) {
          damageSelect.value = 'D40';
          damageSelect.dispatchEvent(new Event('change', { bubbles: true }));
          return 'Selected D40 (Ổ gà)';
        }
        return 'Damage type select not found';
      })()
    `);
    console.log('Damage type selection result:', damageTypeResult);
    await sleep(2000);
    await cdp.captureScreenshot('web_admin_06_damage_type_applied.png');

    // Reset filters
    console.log('Resetting filters via "Xóa bộ lọc"...');
    await cdp.eval(`
      (() => {
        const resetBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Xóa bộ lọc'));
        if (resetBtn) resetBtn.click();
      })()
    `);
    await sleep(1500);

    // 9. Test Desktop Sidebar Collapse / Expand via MapToolbar "Bộ lọc"
    console.log('9. Testing Desktop Sidebar Collapse via toolbar "Bộ lọc" button...');
    const collapseResult = await cdp.eval(`
      (() => {
        const filterBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Bộ lọc') && b.getAttribute('title')?.includes('bộ lọc'));
        if (filterBtn) {
          filterBtn.click();
          return 'Clicked toolbar Bộ lọc button';
        }
        return 'Toolbar Bộ lọc button not found';
      })()
    `);
    console.log('Collapse result:', collapseResult);
    await sleep(1000);
    await cdp.captureScreenshot('web_admin_07_sidebar_collapsed.png');

    // Expand sidebar back
    console.log('Re-expanding Desktop Sidebar...');
    await cdp.eval(`
      (() => {
        const filterBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Bộ lọc') && b.getAttribute('title')?.includes('bộ lọc'));
        if (filterBtn) filterBtn.click();
      })()
    `);
    await sleep(1000);

    // 10. Test Report List Overlay (Click "Phản ánh")
    console.log('10. Testing Report List Overlay ("Phản ánh" button)...');
    const listBtnResult = await cdp.eval(`
      (() => {
        const listBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Phản ánh'));
        if (listBtn) {
          listBtn.click();
          return 'Clicked Phản ánh button';
        }
        return 'Phản ánh button not found';
      })()
    `);
    console.log('Report list result:', listBtnResult);
    await sleep(1500);
    await cdp.captureScreenshot('web_admin_08_report_list_overlay.png');

    // 11. Click on item in list to open Detail Drawer
    console.log('11. Clicking a report item to open ReportDetailDrawer...');
    const itemClickResult = await cdp.eval(`
      (() => {
        const items = document.querySelectorAll('button');
        const reportItem = Array.from(items).find(b => b.textContent.includes('Ổ gà') || b.textContent.includes('Nứt'));
        if (reportItem) {
          reportItem.click();
          return 'Clicked report item';
        }
        const marker = document.querySelector('.leaflet-marker-icon');
        if (marker) {
          marker.click();
          return 'Clicked map marker';
        }
        return 'No item found to click';
      })()
    `);
    console.log('Item click result:', itemClickResult);
    await sleep(2000);
    await cdp.captureScreenshot('web_admin_09_detail_drawer.png');

    // Close detail drawer
    await cdp.eval(`
      (() => {
        const closeBtn = document.querySelector('button[aria-label="Đóng chi tiết"]') || Array.from(document.querySelectorAll('button')).find(b => b.querySelector('svg'));
        if (closeBtn) closeBtn.click();
      })()
    `);
    await sleep(800);

    // 12. Test Tablet Layout (1024x768)
    console.log('12. Testing Tablet Viewport (1024x768)...');
    await cdp.setViewport(1024, 768);
    await sleep(1500);
    await cdp.captureScreenshot('web_admin_10_tablet_layout.png');

    // Test Opening Drawer on Tablet
    console.log('Opening Filter Drawer on Tablet...');
    await cdp.eval(`
      (() => {
        const filterBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Bộ lọc'));
        if (filterBtn) filterBtn.click();
      })()
    `);
    await sleep(1200);
    await cdp.captureScreenshot('web_admin_11_tablet_drawer_opened.png');

    // Close Drawer
    await cdp.eval(`
      (() => {
        const closeBtn = document.querySelector('button[aria-label="Đóng bảng lọc bản đồ"]') || document.querySelector('button[aria-label="Đóng bộ lọc bản đồ"]');
        if (closeBtn) closeBtn.click();
      })()
    `);
    await sleep(800);

    // 13. Test Mobile Layout (390x844)
    console.log('13. Testing Mobile Viewport (390x844)...');
    await cdp.setViewport(390, 844);
    await sleep(1500);
    await cdp.captureScreenshot('web_admin_12_mobile_layout.png');

    // Test Opening Drawer on Mobile
    console.log('Opening Filter Drawer on Mobile...');
    await cdp.eval(`
      (() => {
        const filterBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Bộ lọc'));
        if (filterBtn) filterBtn.click();
      })()
    `);
    await sleep(1200);
    await cdp.captureScreenshot('web_admin_13_mobile_drawer_opened.png');

    // Close Mobile Drawer
    await cdp.eval(`
      (() => {
        const closeBtn = document.querySelector('button[aria-label="Đóng bảng lọc bản đồ"]') || document.querySelector('button[aria-label="Đóng bộ lọc bản đồ"]');
        if (closeBtn) closeBtn.click();
      })()
    `);
    await sleep(500);

    // Restore desktop
    await cdp.setViewport(1600, 1000);
    await sleep(500);

    // 14. Dump collected errors and console logs
    console.log('\n=== COLLECTED CONSOLE ERRORS & EXCEPTIONS ===');
    console.log(errors.length > 0 ? errors.join('\n') : 'No JS runtime exceptions detected!');

  } catch (err) {
    console.error('Inspection failed with error:', err);
    await cdp.captureScreenshot('web_admin_error.png');
  } finally {
    cdp.close();
    chrome.kill();
    console.log('=== INSPECTION FINISHED ===');
  }
}

main().catch(err => {
  console.error('Fatal script error:', err);
  process.exit(1);
});
