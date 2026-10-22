const http = require('http');
const { spawn } = require('child_process');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function test() {
  const chrome = spawn(CHROME_PATH, ['--headless=new', '--remote-debugging-port=9223', '--no-sandbox']);
  await new Promise(r => setTimeout(r, 1500));
  const ver = await new Promise((res, rej) => http.get('http://localhost:9223/json/version', r => {
    let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d)));
  }));
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 1;
  const send = (method, params = {}) => new Promise((resolve) => {
    const curId = id++;
    const handler = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.id === curId) { ws.removeEventListener('message', handler); resolve(msg.result); }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id: curId, method, params }));
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');

  const failedRequests = [];
  ws.addEventListener('message', (evt) => {
    const msg = JSON.parse(evt.data);
    if (msg.method === 'Network.loadingFailed') {
      failedRequests.push(msg.params);
    }
  });

  await send('Page.navigate', { url: 'https://admin.tuannguyenkiet0612.dpdns.org' });
  await new Promise(r => setTimeout(r, 4000));

  const pageInfo = await send('Runtime.evaluate', {
    expression: `(() => {
      return {
        url: window.location.href,
        origin: window.location.origin,
        title: document.title,
        bodyText: document.body.innerText
      };
    })()`,
    returnByValue: true
  });
  console.log('Page Info:', pageInfo.result.value);

  const testFetch = await send('Runtime.evaluate', {
    expression: `(async () => {
      try {
        const res = await fetch('https://api.tuannguyenkiet0612.dpdns.org/health');
        return { status: res.status, ok: res.ok, data: await res.json() };
      } catch (err) {
        return { error: err.message, stack: err.stack };
      }
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('Fetch /health result:', testFetch.result.value);

  const testMe = await send('Runtime.evaluate', {
    expression: `(async () => {
      try {
        const res = await fetch('https://api.tuannguyenkiet0612.dpdns.org/api/auth/me', {
          credentials: 'include',
          headers: { 'X-Auth-Context': 'web-admin' }
        });
        return { status: res.status, ok: res.ok };
      } catch (err) {
        return { error: err.message, stack: err.stack };
      }
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('Fetch /api/auth/me result:', testMe.result.value);

  console.log('Failed network requests:', JSON.stringify(failedRequests, null, 2));

  ws.close();
  chrome.kill();
}

test().catch(console.error);
