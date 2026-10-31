import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(path, 'utf8');
const cloudflareCsp = read('public/_headers')
  .match(/^\s*Content-Security-Policy:\s*(.+)$/m)?.[1];
const vercelConfig = JSON.parse(read('vercel.json'));
const vercelCsp = vercelConfig.headers
  .flatMap((rule) => rule.headers)
  .find((header) => header.key.toLowerCase() === 'content-security-policy')?.value;

test('CSP é entregue com a mesma política em Cloudflare e Vercel', () => {
  assert.ok(cloudflareCsp, 'public/_headers deve declarar Content-Security-Policy');
  assert.equal(vercelCsp, cloudflareCsp, 'Vercel e Cloudflare não podem divergir na CSP');
  assert.equal(vercelConfig.headers[0]?.source, '/:path*');
});

test('CSP fecha vetores de execução e mantém somente transportes necessários', () => {
  assert.match(cloudflareCsp, /default-src 'self'/);
  assert.match(cloudflareCsp, /object-src 'none'/);
  assert.match(cloudflareCsp, /base-uri 'self'/);
  assert.match(cloudflareCsp, /frame-ancestors 'self'/);
  assert.match(cloudflareCsp, /connect-src[^;]*https:\/\/\*\.supabase\.co/);
  assert.match(cloudflareCsp, /connect-src[^;]*wss:\/\/\*\.supabase\.co/);
  assert.match(cloudflareCsp, /worker-src 'self' blob:/);
  assert.doesNotMatch(cloudflareCsp, /img-src[^;]*\bhttp:/);
  assert.doesNotMatch(cloudflareCsp, /script-src[^;]*'unsafe-eval'/);
});
