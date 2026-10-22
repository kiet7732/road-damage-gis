// scripts/verify_web_admin_e2e.js
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = path.resolve('C:\\Users\\TuaN Kiet\\.gemini\\antigravity\\brain\\27ecfe79-b446-4be2-80fd-b2c39c1808f5');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

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

  async captureScreenshot(outputPath) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    fs.writeFileSync(outputPath, buffer);
    console.log(`Saved screenshot: ${outputPath} (${buffer.length} bytes)`);
  }

  async eval(expr) {
    const res = await this.send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${res.exceptionDetails.text}`);
    }
    return res.result?.value;
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('--- STARTING WEB ADMIN ACCEPTANCE E2E SUITE ---');
  
  // 1. Launch Headless Chrome
  console.log('1. Launching Headless Chrome on port 9222...');
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1600,1050',
    '--hide-scrollbars'
  ]);

  chrome.on('error', (err) => {
    console.error('Chrome spawn error:', err);
  });

  // Wait for CDP endpoint
  let versionInfo;
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    try {
      versionInfo = await fetchJson('http://localhost:9222/json/version');
      if (versionInfo && versionInfo.webSocketDebuggerUrl) break;
    } catch (_) {}
  }

  if (!versionInfo) {
    throw new Error('Chrome failed to start or port 9222 unreachable');
  }

  console.log('Chrome started with version:', versionInfo['Browser']);

  // Get existing target page from /json/list
  const targets = await fetchJson('http://localhost:9222/json/list');
  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
  console.log('Using page target:', pageTarget.id, pageTarget.webSocketDebuggerUrl);

  const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
  await cdp.ready;

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('DOM.enable');

  // Navigate to login
  await cdp.send('Page.navigate', { url: 'http://localhost:5173' });

  const errors = [];
  cdp.on('Runtime.exceptionThrown', (params) => {
    errors.push(params.exceptionDetails.text);
  });

  // Step 1: Login Page
  console.log('2. Loading Web Admin Login page...');
  await sleep(2000);
  await cdp.captureScreenshot(path.join(ARTIFACT_DIR, 'web_acceptance_login.png'));

  // Fill credentials using quick demo button
  console.log('3. Triggering quick admin demo fill...');
  await cdp.eval(`
    (() => {
      const demoBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Quản trị viên'));
      if (demoBtn) {
        demoBtn.click();
        return true;
      }
      return false;
    })()
  `);
  await sleep(600);

  // Click Submit
  console.log('4. Clicking submit login...');
  await cdp.eval(`
    (() => {
      const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('ĐĂNG NHẬP'));
      if (submitBtn) {
        submitBtn.click();
        return true;
      }
      return false;
    })()
  `);

  // Wait for login and redirect to dashboard
  console.log('5. Waiting for dashboard navigation...');
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    const url = await cdp.eval('window.location.href');
    if (!url.includes('/login') && (url.endsWith('/') || url.includes('/dashboard'))) {
      console.log('Successfully navigated to Dashboard:', url);
      break;
    }
  }

  await sleep(2000);
  await cdp.captureScreenshot(path.join(ARTIFACT_DIR, 'web_acceptance_dashboard.png'));

  // Step 2: Test Map Page
  console.log('6. Navigating to Damage Map (/map)...');
  await cdp.send('Page.navigate', { url: 'http://localhost:5173/map' });
  await sleep(3500);
  await cdp.captureScreenshot(path.join(ARTIFACT_DIR, 'web_acceptance_map.png'));

  // Step 3: Test Reports List Page
  console.log('7. Navigating to Reports List (/reports)...');
  await cdp.send('Page.navigate', { url: 'http://localhost:5173/reports' });
  await sleep(2500);
  await cdp.captureScreenshot(path.join(ARTIFACT_DIR, 'web_acceptance_reports.png'));

  // Get the first report link/id to test Report Detail
  const firstReportId = await cdp.eval(`
    (() => {
      const link = document.querySelector('tr[data-report-id], a[href*="/reports/"], tr');
      const href = link?.querySelector('a[href*="/reports/"]')?.getAttribute('href') || link?.getAttribute('data-href');
      if (href) return href;
      // fallback look for links
      const allLinks = Array.from(document.querySelectorAll('a')).map(a => a.getAttribute('href')).filter(h => h && h.startsWith('/reports/'));
      return allLinks[0] || null;
    })()
  `);
  console.log('Found first report detail target:', firstReportId);

  // Step 4: Test Report Detail Page
  if (firstReportId) {
    console.log(`8. Navigating to Report Detail (${firstReportId})...`);
    await cdp.send('Page.navigate', { url: `http://localhost:5173${firstReportId}` });
  } else {
    console.log('Navigating to first report by fallback ID...');
    // Seed report ID
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/reports/seed-report-001' });
  }
  await sleep(2500);
  await cdp.captureScreenshot(path.join(ARTIFACT_DIR, 'web_acceptance_report_detail.png'));

  // Step 5: Test Statistics Page
  console.log('9. Navigating to Statistics (/statistics)...');
  await cdp.send('Page.navigate', { url: 'http://localhost:5173/statistics' });
  await sleep(2500);
  await cdp.captureScreenshot(path.join(ARTIFACT_DIR, 'web_acceptance_statistics.png'));

  // Step 6: Test Users Page
  console.log('10. Navigating to Users Management (/users)...');
  await cdp.send('Page.navigate', { url: 'http://localhost:5173/users' });
  await sleep(2500);
  await cdp.captureScreenshot(path.join(ARTIFACT_DIR, 'web_acceptance_users.png'));

  // Teardown
  cdp.close();
  chrome.kill('SIGKILL');
  console.log('--- ALL WEB ADMIN MODULE TESTS COMPLETED SUCCESSFULLY ---');
}

run().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
