// Mock server for FastGPT Plugin + Code Sandbox + AI Proxy
// Starts a single HTTP server that handles all three services
const http = require('http');

const PORT = parseInt(process.argv[2], 10) || 4004;

const ok = (data) => ({ code: 0, data });
const err = (message) => ({ code: 500, message });

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { resolve(body); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, token, rootkey');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  console.log(`[mock] ${req.method} ${req.url}`);

  const url = req.url.split('?')[0];

  // ==================== Plugin endpoints ====================
  if (url === '/api/models/get-providers') {
    return reply(ok({ modelProviders: [] }));
  }
  if (url === '/api/models') {
    return reply(ok([]));
  }
  if (url === '/api/tools') {
    return reply(ok([]));
  }
  if (url === '/api/tools/tags') {
    return reply(ok([]));
  }
  if (url === '/api/plugins') {
    return reply(ok([]));
  }

  // ==================== Code Sandbox endpoints ====================
  if (url === '/api/sandbox' || url === '/api/sandbox/') {
    return reply({ message: 'Mock Code Sandbox is running' });
  }
  if (url === '/api/sandbox/health') {
    return reply({ status: 'ok', version: 'mock' });
  }
  if (url === '/api/sandbox/exec' || url === '/api/sandbox/execute') {
    const body = await readBody(req);
    console.log(`[sandbox] exec request: ${JSON.stringify(body).substring(0, 100)}`);
    return reply(ok({
      stdout: '',
      stderr: '',
      exitCode: 0,
      result: 'Mock execution successful'
    }));
  }

  // ==================== AI Proxy endpoints ====================
  if (url === '/api/aiproxy/health' || url === '/api/ai-proxy/health') {
    return reply({ status: 'ok' });
  }
  if (url.startsWith('/api/aiproxy') || url.startsWith('/api/ai-proxy')) {
    return reply(ok({ message: 'Mock AI Proxy' }));
  }

  // ==================== Health endpoint ====================
  if (url === '/health' || url === '/api/health') {
    return reply({ status: 'ok' });
  }

  // ==================== Default ====================
  return reply(ok([]));

  function reply(data) {
    res.writeHead(200);
    res.end(JSON.stringify(data));
  }
});

server.listen(PORT, () => {
  console.log(`Mock server running on http://localhost:${PORT}`);
  console.log(`  - Plugin API:    http://localhost:${PORT}/api/plugins`);
  console.log(`  - Code Sandbox:  http://localhost:${PORT}/api/sandbox`);
  console.log(`  - AI Proxy:      http://localhost:${PORT}/api/aiproxy`);
});
