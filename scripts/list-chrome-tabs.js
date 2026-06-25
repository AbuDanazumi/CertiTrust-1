import http from 'http';

const wsUrl = process.env.AGY_BROWSER_WS_URL;
if (!wsUrl) {
  console.error('AGY_BROWSER_WS_URL is not set in environment.');
  process.exit(1);
}

const match = wsUrl.match(/127\.0\.0\.1:(\d+)/);
if (!match) {
  console.error('Failed to parse port from wsUrl:', wsUrl);
  process.exit(1);
}
const port = parseInt(match[1], 10);
console.log('Detected Chrome debug port:', port);

function listTabs() {
  http.get(`http://127.0.0.1:${port}/json/list`, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const list = JSON.parse(data);
        console.log(JSON.stringify(list, null, 2));
      } catch (e) {
        console.error('Failed to parse json:', e.message);
        console.log(data);
      }
    });
  }).on('error', (err) => {
    console.error('HTTP request failed:', err.message);
  });
}

listTabs();
