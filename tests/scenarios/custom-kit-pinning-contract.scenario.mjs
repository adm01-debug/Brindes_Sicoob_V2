import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(
  'supabase/migrations/20261016193000_pin_custom_kit_atomically.sql',
  'utf8',
);
const hook = readFileSync('src/hooks/useCustomKitPersistence.ts', 'utf8');

test('destaque de kit usa uma RPC transacional e escopada ao usuário', () => {
  assert.match(hook, /rpc\('set_custom_kit_pinned'/);
  assert.doesNotMatch(hook, /Desfixa qualquer outro kit fixado primeiro/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /v_owner IS DISTINCT FROM v_actor/);
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_kits_one_pinned_per_user/);
});

test('RPC de destaque não fica disponível a sessões anônimas', () => {
  assert.match(migration, /SECURITY DEFINER/);
  assert.match(migration, /SET search_path = pg_catalog, public/);
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION public\.set_custom_kit_pinned\(uuid, boolean\) FROM PUBLIC, anon/,
  );
  assert.match(
    migration,
    /GRANT EXECUTE ON FUNCTION public\.set_custom_kit_pinned\(uuid, boolean\) TO authenticated/,
  );
});

test('falhas retornadas pelo Supabase impedem a confirmação visual', () => {
  assert.match(hook, /const \{ error \} = await supabase\.rpc\('set_custom_kit_pinned'/);
  assert.match(hook, /if \(error\) throw error;/);
});
