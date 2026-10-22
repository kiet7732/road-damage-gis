// scripts/capture_web_supplementary.js
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
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1600,1050',
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

  const targets = await fetchJson('http://localhost:9222/json/list');
  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
  const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
  await cdp.ready;

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('DOM.enable');

  await cdp.send('Page.navigate', { url: 'http://localhost:5173' });
  await sleep(1500);

  // Fill quick demo button
  await cdp.eval(`
    (() => {
      const demoBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Quản trị viên'));
      if (demoBtn) demoBtn.click();
    })()
  `);
  await sleep(400);

  // Submit
  await cdp.eval(`
    (() => {
      const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('ĐĂNG NHẬP'));
      if (submitBtn) submitBtn.click();
    })()
  `);
  await sleep(2000);

  // 1. Manual review page
  await cdp.send('Page.navigate', { url: 'http://localhost:5173/reports/manual-review' });
  await sleep(2000);
  await cdp.captureScreenshot(path.join(ARTIFACT_DIR, 'web_acceptance_manual_review.png'));

  // 2. Account page
  await cdp.send('Page.navigate', { url: 'http://localhost:5173/account' });
  await sleep(2000);
  await cdp.captureScreenshot(path.join(ARTIFACT_DIR, 'web_acceptance_account.png'));

  cdp.close();
  chrome.kill('SIGKILL');
  console.log('Supplementary captures complete!');
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
