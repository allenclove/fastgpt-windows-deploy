// Initialize MinIO buckets for FastGPT
// Uses the MinIO JS client for proper authenticated requests

const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SOURCE_DIR = path.resolve(ROOT, '..', 'fastgpt-source');

// Resolve minio from pnpm store
let Minio;
try {
  Minio = require(path.join(SOURCE_DIR, 'node_modules', '.pnpm', 'minio@8.0.7', 'node_modules', 'minio'));
} catch {
  try {
    Minio = require('minio');
  } catch {
    console.error('[ERROR] Cannot find minio package');
    process.exit(1);
  }
}

const client = new Minio.Client({
  endPoint: '127.0.0.1',
  port: 9000,
  useSSL: false,
  accessKey: 'minioadmin',
  secretKey: 'minioadmin'
});

const BUCKETS = ['fastgpt-public', 'fastgpt-private'];

async function main() {
  console.log('[MinIO] Initializing buckets...');

  for (const bucket of BUCKETS) {
    try {
      const exists = await client.bucketExists(bucket);
      if (exists) {
        console.log(`  [OK] Bucket '${bucket}' already exists`);
      } else {
        await client.makeBucket(bucket, 'us-east-1');
        console.log(`  [OK] Bucket '${bucket}' created`);
      }
    } catch (e) {
      console.error(`  [ERROR] Bucket '${bucket}': ${e.message}`);
      process.exit(1);
    }
  }

  console.log('[MinIO] All buckets ready');
}

main().catch((e) => {
  console.error(`[MinIO] Fatal error: ${e.message}`);
  process.exit(1);
});
