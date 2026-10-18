import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(
  'supabase/migrations/20261016201500_restore_view_invoker_and_notification_scope.sql',
  'utf8',
);

const protectedViews = [
  'sicoob_budget_audit',
  'telemetry_query_performance',
  'v_full_scope_grants',
  'v_sicoob_hierarchy',
];

test('views sensíveis usam invoker e ACL somente de leitura', () => {
  for (const view of protectedViews) {
    assert.match(migration, new RegExp(`ALTER VIEW public\\.${view} SET \\(security_invoker = on\\)`));
  }
  assert.match(migration, /REVOKE ALL ON[\s\S]+FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /GRANT SELECT ON[\s\S]+TO authenticated, service_role/);
  assert.match(migration, /reloptions @> ARRAY\['security_invoker=on'\]/);
});

test('usuário autenticado só cria notificação para si', () => {
  assert.match(migration, /DROP POLICY IF EXISTS authenticated_create_notifications/);
  assert.match(
    migration,
    /CREATE POLICY authenticated_create_notifications[\s\S]+WITH CHECK \(user_id = \(SELECT auth\.uid\(\)\)\)/,
  );
  assert.doesNotMatch(migration, /authenticated_create_notifications[\s\S]+WITH CHECK \(true\)/);
});
