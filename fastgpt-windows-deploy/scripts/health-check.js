// Post-startup health check for all FastGPT services
// Run after start.bat to verify everything is working

const http = require('http');

const CHECKS = [
  { name: 'MongoDB',           host: '127.0.0.1', port: 27017, path: null, expectStatus: null, isTcp: true },
  { name: 'PostgreSQL',        host: '127.0.0.1', port: 5432,  path: null, expectStatus: null, isTcp: true },
  { name: 'Redis',             host: '127.0.0.1', port: 6379,  path: null, expectStatus: null, isTcp: true },
  { name: 'MinIO',             host: '127.0.0.1', port: 9000,  path: '/minio/health/live', expectStatus: 200 },
  { name: 'Mock Plugin',       host: '127.0.0.1', port: 4004,  path: '/health', expectStatus: 200 },
  { name: 'FastGPT App',       host: '127.0.0.1', port: 4000,  path: '/', expectStatus: 200 },
];

function tcpCheck(host, port, timeout = 3000) {
  return new Promise((resolve) => {
    const sock = require('net').connect({ host, port }, () => { sock.destroy(); resolve(true); });
    sock.on('error', () => resolve(false));
    sock.setTimeout(timeout, () => { sock.destroy(); resolve(false); });
  });
}

function httpCheck(host, port, path, expectStatus, timeout = 5000) {
  return new Promise((resolve) => {
    const req = http.get(`http://${host}:${port}${path}`, (res) => {
      const ok = expectStatus ? res.statusCode === expectStatus : res.statusCode < 500;
      resolve(ok);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(timeout, () => { req.destroy(); resolve(false); });
  });
}

async function main() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║     FastGPT Service Health Check         ║');
  console.log('╚══════════════════════════════════════════╝\n');

  let pass = 0;
  let fail = 0;

  for (const check of CHECKS) {
    process.stdout.write(`  ${check.name.padEnd(18)}... `);
    const ok = check.isTcp
      ? await tcpCheck(check.host, check.port)
      : await httpCheck(check.host, check.port, check.path, check.expectStatus);
    if (ok) {
      console.log('[OK]');
      pass++;
    } else {
      console.log('[FAIL]');
      fail++;
    }
  }

  console.log(`\n  Result: ${pass} passed, ${fail} failed`);

  if (fail > 0) {
    console.log('\n  Troubleshooting:');
    console.log('    - Run stop.bat then start.bat to restart all services');
    console.log('    - Check logs in the logs/ directory');
    console.log('    - First request may take ~30s due to Turbopack compilation');
  } else {
    console.log('\n  All services healthy!');
    console.log('  Visit http://localhost:4000 and login with root / 123456');
    console.log('\n  Next step: Configure AI model in Admin Panel');
    console.log('    - If using Ollama: OPENAI_BASE_URL=http://localhost:11434/v1');
    console.log('    - If using vLLM:   OPENAI_BASE_URL=http://<server>:<port>/v1');
  }

  process.exit(fail > 0 ? 1 : 0);
}

main();
