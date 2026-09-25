import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync('supabase/functions/sicoob-reorder/index.ts', 'utf8');

test('recompra retorna somente erros comerciais classificados', () => {
  assert.match(source, /error instanceof ReorderValidationError/);
  assert.match(source, /error: "erro_interno"/);
  assert.doesNotMatch(source, /const message = error instanceof Error/);
});
