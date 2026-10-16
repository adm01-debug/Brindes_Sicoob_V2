import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  collectCriticalSkips,
  compareCriticalSkips,
} from '../../scripts/check-critical-test-skip-budget.mjs';

function withWorkspace(callback) {
  const workspace = mkdtempSync(join(tmpdir(), 'sicoob-critical-skips-'));
  mkdirSync(join(workspace, 'tests/p0'), { recursive: true });
  try {
    return callback(workspace);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
}

test('inventário distingue substituição de skip mesmo quando a quantidade não muda', () => {
  withWorkspace((workspace) => {
    const file = join(workspace, 'tests/p0/exemplo.test.ts');
    writeFileSync(file, "test.skip('cenário aprovado no baseline', () => {});\n");
    const expected = collectCriticalSkips(workspace);

    writeFileSync(file, "test.skip('novo cenário não revisado', () => {});\n");
    const actual = collectCriticalSkips(workspace);
    const diff = compareCriticalSkips(expected, actual);

    assert.equal(expected.length, actual.length);
    assert.equal(diff.added.length, 1);
    assert.equal(diff.removed.length, 1);
  });
});

test('inventário reconhece redução real da dívida', () => {
  withWorkspace((workspace) => {
    const file = join(workspace, 'tests/p0/exemplo.test.ts');
    writeFileSync(file, "test.skip('cenário pendente', () => {});\n");
    const expected = collectCriticalSkips(workspace);

    writeFileSync(file, "test('cenário pendente', () => {});\n");
    const diff = compareCriticalSkips(expected, collectCriticalSkips(workspace));

    assert.deepEqual(diff.added, []);
    assert.deepEqual(diff.removed, expected);
  });
});
