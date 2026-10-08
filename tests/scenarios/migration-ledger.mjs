import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  collectLocalMigrations,
  compareLedger,
  comparePendingBaseline,
} from '../../scripts/db/check-migration-ledger-drift.mjs';
test('compara oito dígitos, conteúdo e ausência nas duas direções', () => {
  const root = mkdtempSync(join(tmpdir(), 'sicoob-ledger-'));
  try {
    mkdirSync(join(root, 'supabase/migrations'), { recursive: true });
    writeFileSync(
      join(root, 'supabase/migrations/20260102_exemplo.sql'),
      '-- introdução\nSELECT 1;',
    );
    writeFileSync(join(root, 'supabase/migrations/003_pendente.sql'), 'SELECT 2;');
    const files = collectLocalMigrations(root);
    assert.equal(files.length, 2);
    const ledger = [
      { version: '20260102', name: 'exemplo', statements: ['SELECT 1'] },
      { version: '999', name: 'sem_fonte', statements: ['SELECT 1'] },
    ];
    assert.deepEqual(
      new Set(compareLedger(files, ledger).map((r) => r.status)),
      new Set(['alinhada', 'remota_sem_arquivo', 'local_sem_ledger']),
    );
    ledger[0].statements = ['SELECT 9'];
    assert.equal(compareLedger(files, ledger)[0].status, 'conteudo_divergente');
    delete ledger[0].statements;
    assert.equal(compareLedger(files, ledger)[0].status, 'conteudo_nao_verificado');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test('uma versão ativa duplicada bloqueia mesmo sem aplicação', () => {
  assert(
    compareLedger([{ version: '001' }, { version: '001' }], []).some(
      (r) => r.status === 'versao_ativa_duplicada',
    ),
  );
});

test('baseline aceita passivo idêntico e bloqueia deriva ou remoção sem reconciliação', () => {
  const known = {
    version: '001',
    status: 'local_sem_ledger',
    path: 'supabase/migrations/001_known.sql',
    local_sha256: 'hash-a',
  };
  const unchanged = comparePendingBaseline([known], [known]);
  assert.equal(unchanged.unexpected.length, 0);
  assert.equal(unchanged.invalid_resolutions.length, 0);

  const changed = comparePendingBaseline([{ ...known, local_sha256: 'hash-b' }], [known]);
  assert.equal(changed.unexpected.length, 1);
  assert.equal(changed.invalid_resolutions.length, 1);

  const deleted = comparePendingBaseline([], [known]);
  assert.equal(deleted.unexpected.length, 0);
  assert.equal(deleted.invalid_resolutions.length, 1);
});

test('baseline aceita somente resolução para estado reconciliado', () => {
  const known = { version: '001', status: 'nome_divergente', path: 'migration.sql' };
  const aligned = comparePendingBaseline(
    [{ version: '001', status: 'alinhada', path: 'migration.sql' }],
    [known],
  );
  assert.equal(aligned.unexpected.length, 0);
  assert.equal(aligned.invalid_resolutions.length, 0);
  assert.equal(aligned.resolved.length, 1);
});
