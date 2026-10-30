import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(path, 'utf8');

test('operações internas validam o segredo antes de criar cliente privilegiado', () => {
  for (const name of ['send-notification', 'process-batch-export', 'monthly-health-report', 'connections-auto-test']) {
    const source = read(`supabase/functions/${name}/index.ts`);
    const guard = source.indexOf('requireInternalService(req)');
    const client = source.indexOf('createClient(');
    assert.ok(guard >= 0, `${name} deve exigir segredo interno`);
    assert.ok(client >= 0 && guard < client, `${name} não pode criar service_role antes do guard`);
    assert.ok(source.search(/req\.method !== ['"]POST['"]/) < guard, `${name} deve rejeitar método antes do guard`);
  }
});

test('diagnóstico global e sincronização externa exigem autorização técnica', () => {
  const health = read('supabase/functions/system-healthcheck/index.ts');
  const sync = read('supabase/functions/external-connections-sync/index.ts');
  const panel = read('src/components/admin/connections/LastSyncRunPanel.tsx');

  assert.match(health, /authorize\(req, \{ requireRole: 'dev', enforceServerSide: true \}\)/);
  assert.match(health, /req\.method !== 'GET' && req\.method !== 'POST'/);
  assert.match(sync, /authorize\(req, \{ requireRole: "supervisor", enforceServerSide: true \}\)/);
  assert.match(panel, /functions\.invoke\("external-connections-sync"/);
  assert.doesNotMatch(panel, /rpc\("sync_external_connections_from_credentials"/);
});

test('migration fecha RPCs administrativas e acesso legado a documentos', () => {
  const migration = read('supabase/migrations/20260923110000_harden_internal_operations.sql');
  for (const signature of [
    'send_notification(uuid, text, text, text, text, text, jsonb)',
    'acquire_ai_quota(uuid, text, text)',
    'retry_failed_webhook_deliveries()',
    'sync_external_connections_from_credentials()',
    'sync_external_connections_from_credentials(text, text, uuid)',
    'generate_sicoob_performance_report(text, text)',
  ]) {
    assert.match(migration, new RegExp(`REVOKE ALL ON FUNCTION public\\.${signature.replace(/[()]/g, '\\$&')} FROM PUBLIC, anon, authenticated`));
  }
  assert.match(migration, /favorite_list_actor_mismatch/);
  assert.match(migration, /system_settings_supervisor_read/);
  assert.match(migration, /UPDATE storage\.buckets SET public = false WHERE id = 'order-documents'/);
  assert.match(migration, /LIKE '%''order-documents''%'/);
  assert.doesNotMatch(migration, /LIKE '%order-documents%'/);
});

test('cron de exportação usa Vault e não aponta para projeto legado', () => {
  const schedule = read('supabase/migrations/20260923111000_schedule_secure_export_worker.sql');
  assert.match(schedule, /cron\.unschedule\(jobid\)/);
  assert.match(schedule, /name = 'sicoob_project_url'/);
  assert.match(schedule, /name = 'sicoob_internal_function_secret'/);
  assert.match(schedule, /'x-sicoob-internal-secret', v_internal_secret/);
  assert.match(schedule, /SELECT public\.dispatch_sicoob_export_worker\(\)/);
  assert.match(schedule, /Worker de exportações não agendado: Vault ainda não configurado/);
  assert.ok(
    schedule.indexOf('length(COALESCE(v_internal_secret') < schedule.lastIndexOf('PERFORM cron.schedule('),
    'o cron só pode ser criado depois de validar os segredos do Vault',
  );
  assert.doesNotMatch(schedule, /bojgeppypmtormfjsyun|service_role_key/);
});

test('crons de conexões usam Vault e não mantêm credenciais no agendamento', () => {
  const migration = read('supabase/migrations/20260923140000_secure_legacy_connection_crons.sql');

  assert.match(migration, /public\.dispatch_sicoob_connections_auto_test\(\)/);
  assert.match(migration, /public\.dispatch_sicoob_external_db_keepalive\(\)/);
  assert.match(migration, /name = 'sicoob_project_url'/);
  assert.match(migration, /name = 'sicoob_internal_function_secret'/);
  assert.match(migration, /'x-sicoob-internal-secret', v_internal_secret/);
  assert.match(migration, /cron\.unschedule\(jobid\)/);
  assert.match(migration, /SELECT public\.dispatch_sicoob_connections_auto_test\(\)/);
  assert.match(migration, /SELECT public\.dispatch_sicoob_external_db_keepalive\(\)/);
  assert.doesNotMatch(migration, /nmojwpihnslkssljowjh|apikey|service_role_key|eyJ[a-zA-Z0-9_-]{20}/);
});

test('sync de conexões e favoritos respeitam a hierarquia e concorrência', () => {
  const fix = read('supabase/migrations/20260923112000_fix_connection_sync_and_favorites.sql');
  assert.match(fix, /role IN \('dev', 'supervisor', 'admin', 'manager'\)/);
  assert.match(fix, /is_supervisor_or_above\(auth\.uid\(\)\)/);
  assert.match(fix, /ON CONFLICT \(user_id\) WHERE is_default DO NOTHING/);
  assert.match(fix, /SET search_path = pg_catalog, public/);
});

test('correções P0 isolam documentos, corrigem a sincronização e reservam exportações', () => {
  const migration = read('supabase/migrations/20260923130000_secure_sicoob_documents_and_exports.sql');
  const worker = read('supabase/functions/process-batch-export/index.ts');
  const dialog = read('src/components/orders/BatchExportDialog.tsx');

  for (const policy of [
    'sicoob_shipment_read_in_order_scope',
    'sicoob_invoices_read_in_order_scope',
    'sicoob_payments_read_in_order_scope',
    'sicoob_artwork_read_in_order_scope',
    'sicoob_order_documents_read_in_order_scope',
  ]) {
    assert.match(migration, new RegExp(`DROP POLICY IF EXISTS "${policy}"`));
  }
  assert.match(migration, /sicoob_current_actor_can_read_order\(order_id\)/);
  assert.match(migration, /split_part\(name, '\/', 1\)::uuid/);
  assert.match(migration, /user_id ASC/);
  assert.doesNotMatch(migration, /FROM public\.user_roles[\s\S]{0,250}created_at ASC/);
  assert.match(migration, /FOR UPDATE SKIP LOCKED/);
  assert.match(migration, /split_part\(name, '\/', 1\) = auth\.uid\(\)::text/);
  assert.match(worker, /claim_sicoob_export_jobs/);
  assert.match(worker, /enqueue_due_sicoob_scheduled_exports/);
  assert.match(dialog, /createSignedUrl/);
  assert.doesNotMatch(worker, /getPublicUrl/);
  assert.match(worker, /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/);
  assert.match(worker, /application\/pdf/);
});
