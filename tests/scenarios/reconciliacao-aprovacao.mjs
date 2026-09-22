import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const edge = readFileSync('supabase/functions/sicoob-approval-reconciliation/index.ts', 'utf8');
const migration = readFileSync('supabase/migrations/20260922225300_sicoob_approval_outbox_reconciliation.sql', 'utf8');
const page = readFileSync('src/pages/admin/sicoob/SicoobApprovalReconciliationPage.tsx', 'utf8');

test('reconciliação exige supervisor com revalidação no banco', () => {
  assert.match(edge, /authorize\(req,\s*\{\s*requireRole:\s*["']supervisor["'],\s*enforceServerSide:\s*true\s*\}\)/);
});

test('identidade do operador vem da sessão autenticada', () => {
  assert.match(edge, /auth\.user\.email/);
  assert.match(edge, /auth\.user\.id/);
  assert.doesNotMatch(edge, /body\.operator/);
  assert.match(edge, /p_operator:\s*operator/);
});

test('painel nunca recebe o destino secreto do provedor', () => {
  assert.doesNotMatch(edge, /select\([^)]*destination/);
  assert.doesNotMatch(page, /delivery\.destination\b/);
  assert.match(edge, /destination_label/);
});

test('reenvio cria geração sucessora e preserva a anterior', () => {
  assert.match(migration, /generation\+1/);
  assert.match(migration, /supersedes_delivery_id/);
  assert.match(migration, /destination_changed_after_attempt/);
});

test('painel não libera confirmação sem motivo e recibo', () => {
  assert.match(page, /reasonValid/);
  assert.match(page, /!providerId\.trim\(\)/);
  assert.match(page, /resolution === "delivered"/);
});
