const wsUrl = process.env.AGY_BROWSER_WS_URL;
if (!wsUrl) {
  console.error('AGY_BROWSER_WS_URL is not set.');
  process.exit(1);
}

console.log('Connecting to:', wsUrl);
const ws = new WebSocket(wsUrl);

ws.onopen = () => {
  console.log('Connected!');
  ws.send(JSON.stringify({
    id: 1,
    method: 'Target.getTargets'
  }));
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  console.log('Received message:', JSON.stringify(msg, null, 2));
  ws.close();
};

ws.onerror = (err) => {
  console.error('WebSocket error:', err);
};

ws.onclose = () => {
  console.log('Closed');
};
