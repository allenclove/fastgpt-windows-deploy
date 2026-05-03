// Minimal mock of FastGPT Plugin server for local development
const http = require('http');

const PORT = parseInt(process.argv[2], 10) || 4004;

const ok = (data) => ({ code: 0, data });

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, token');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  console.log(`${req.method} ${req.url}`);

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    let result;
    const url = req.url.split('?')[0];

    if (url === '/api/models/get-providers') {
      result = ok({ modelProviders: [] });
    } else if (url === '/api/models') {
      result = ok([]);
    } else if (url === '/api/tools') {
      result = ok([]);
    } else if (url === '/api/tools/tags') {
      result = ok([]);
    } else if (url === '/api/plugins') {
      result = ok([]);
    } else if (url === '/health' || url === '/api/health') {
      result = { status: 'ok' };
    } else {
      result = ok([]);
    }

    res.writeHead(200);
    res.end(JSON.stringify(result));
  });
});

server.listen(PORT, () => {
  console.log(`Mock Plugin server running on http://localhost:${PORT}`);
});
