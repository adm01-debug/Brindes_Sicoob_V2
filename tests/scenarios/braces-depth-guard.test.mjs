import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const braces = require('braces');

test('braces preserva expansões normais', () => {
  assert.deepEqual(braces.expand('produto-{verde,azul}'), ['produto-verde', 'produto-azul']);
});

test('braces rejeita padrão com profundidade não confiável', () => {
  const nested = '{'.repeat(101) + 'item' + '}'.repeat(101);
  assert.throws(() => braces(nested), /exceeds max depth/);
  assert.throws(() => braces.expand(nested), /exceeds max depth/);
});

test('braces rejeita AST fornecida diretamente acima do limite', () => {
  let ast = { type: 'text', value: 'item' };
  for (let depth = 0; depth < 102; depth += 1) {
    ast = { type: 'brace', nodes: [ast] };
  }
  assert.throws(() => braces.compile(ast), /exceeds max depth/);
});
