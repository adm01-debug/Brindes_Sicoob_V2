import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(
  'supabase/migrations/20261018131850_harden_access_blocked_log_and_marketing_view_acl.sql',
  'utf8',
);

test('INSERT em access_blocked_log fica limitado ao service_role', () => {
  assert.match(migration, /FOR INSERT TO service_role[\s\S]+WITH CHECK \(true\)/);
  assert.match(migration, /REVOKE ALL ON TABLE public\.access_blocked_log FROM PUBLIC, anon, authenticated, service_role/);
  assert.match(migration, /GRANT SELECT ON TABLE public\.access_blocked_log TO authenticated/);
  assert.match(migration, /GRANT INSERT ON TABLE public\.access_blocked_log TO service_role/);
  assert.match(migration, /policy\.polcmd IN \('a', '\*'\)[\s\S]+authenticated/);
  assert.match(migration, /pg_get_expr\(policy\.polqual, policy\.polrelid\) ILIKE '%can_manage%'/);
});

test('view de uso de taxonomia é somente leitura para authenticated e service_role', () => {
  assert.match(migration, /REVOKE ALL ON TABLE public\.catalog_marketing_term_usage[\s\S]+FROM PUBLIC, anon, authenticated, service_role/);
  assert.match(migration, /GRANT SELECT ON TABLE public\.catalog_marketing_term_usage TO authenticated, service_role/);
  assert.match(migration, /has_table_privilege\('authenticated', marketing_view_oid, 'INSERT'\)/);
  assert.match(migration, /has_table_privilege\('service_role', marketing_view_oid, 'UPDATE'\)/);
});

test('migration tem preflight e asserts dos contratos de ACL/RLS', () => {
  assert.match(migration, /\$preflight\$/);
  assert.match(migration, /\$assert\$/);
  assert.match(migration, /RLS precisa permanecer habilitada/);
  assert.match(migration, /Políticas de INSERT em access_blocked_log não estão limitadas a service_role/);
});
