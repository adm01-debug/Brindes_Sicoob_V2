import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(
  'supabase/migrations/20261016190000_enable_scoped_business_realtime.sql',
  'utf8',
);
const service = readFileSync('src/services/sicoob/commonService.ts', 'utf8');

const expectedTables = [
  'custom_kits',
  'device_login_notifications',
  'discount_approval_requests',
  'integration_credentials',
  'kit_comments',
  'login_attempts',
  'notifications',
  'orders',
  'product_views',
  'quotes',
  'search_analytics',
  'sicoob_orders',
];

test('Realtime publica somente o inventário assinado após validar RLS', () => {
  for (const table of expectedTables) assert.match(migration, new RegExp(`'${table}'`));
  assert.match(migration, /c\.relrowsecurity/);
  assert.match(migration, /p\.polcmd IN \('r', '\*'\)/);
  assert.match(migration, /NOT puballtables/);
});

test('tentativas de login ficam visíveis somente ao próprio usuário', () => {
  assert.match(migration, /CREATE POLICY user_read_own_login_attempts/);
  assert.match(migration, /USING \(user_id = \(SELECT auth\.uid\(\)\)\)/);
});

test('cada montagem do Kanban recebe um canal exclusivo', () => {
  assert.match(service, /sicoob-orders-realtime:\$\{crypto\.randomUUID\(\)\}/);
  assert.doesNotMatch(service, /\.channel\('sicoob-orders-realtime'\)/);
});
