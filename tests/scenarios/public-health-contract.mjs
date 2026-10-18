import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const health = readFileSync('supabase/functions/health-check/index.ts', 'utf8');
const dossier = readFileSync('supabase/functions/bi-share-dossier/index.ts', 'utf8');

test('health-check público expõe somente liveness, sem consultar serviços internos', () => {
  assert.match(health, /req\.method !== "GET" && req\.method !== "HEAD"/);
  assert.match(health, /json\(\{ status: "ok" \}\)/);
  assert.doesNotMatch(health, /createClient|createExternalCatalogClient|SUPABASE_SERVICE_ROLE_KEY|latency_ms|external_db|error\.message/);
});

test('compartilhamento BI falha fechado sem segredo dedicado', () => {
  assert.match(dossier, /const SHARE_SECRET = Deno\.env\.get\("BI_SHARE_SECRET"\) \?\? ""/);
  assert.doesNotMatch(dossier, /BI_SHARE_SECRET[\s\S]{0,100}SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(dossier, /if \(!SHARE_SECRET\)/);
});
