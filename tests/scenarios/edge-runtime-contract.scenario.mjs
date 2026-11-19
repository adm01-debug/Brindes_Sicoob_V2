/**
 * Contrato de runtime das edge functions.
 *
 * `runtime: "source-only"` no manifesto declara que a função fica preservada
 * como fonte e NÃO é publicada. Até 18/11/2026 o campo era declaração sem
 * fiscal: nada impedia uma função marcada como fonte de entrar na allowlist de
 * publicação, nem avisava da contradição. Recupera a ideia do contrato de
 * runtime da PR #119 (fechada sem merge), aplicada ao que a main já declara.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { requiredFunctions } from '../../scripts/ci/verify-supabase-functions-published.mjs';

const MANIFEST = 'supabase/functions/_shared/edge-authz-manifest.ts';

function lerManifesto() {
  const fonte = readFileSync(MANIFEST, 'utf8');
  const entradas = new Map();
  const re = /^\s+"([a-z0-9-]+)":\s*\{([^}]+)\}/gm;
  let m;
  while ((m = re.exec(fonte)) !== null) {
    const corpo = m[2];
    entradas.set(m[1], {
      runtime: corpo.match(/runtime:\s*"(deployed|source-only)"/)?.[1] ?? 'deployed',
    });
  }
  return entradas;
}

test('nenhuma função declarada "source-only" está na allowlist de publicação', () => {
  const entradas = lerManifesto();
  const contradicao = requiredFunctions.filter(
    (nome) => entradas.get(nome)?.runtime === 'source-only',
  );
  assert.deepEqual(contradicao, []);
});

test('toda função da allowlist de publicação existe no manifesto', () => {
  const entradas = lerManifesto();
  const semManifesto = requiredFunctions.filter((nome) => !entradas.has(nome));
  assert.deepEqual(semManifesto, []);
});

test('o campo runtime só aceita os dois valores do contrato', () => {
  const fonte = readFileSync(MANIFEST, 'utf8');
  const valores = [...fonte.matchAll(/runtime:\s*"([^"]+)"/g)].map((m) => m[1]);
  const invalidos = valores.filter((v) => v !== 'deployed' && v !== 'source-only');
  assert.deepEqual(invalidos, []);
});

test('as funções preservadas como fonte continuam declaradas e contadas', () => {
  const entradas = lerManifesto();
  const somenteFonte = [...entradas]
    .filter(([, e]) => e.runtime === 'source-only')
    .map(([nome]) => nome)
    .sort();
  // Trava a lista: tirar uma daqui é publicar a função, e isso tem de ser uma
  // decisão escrita, não um efeito colateral de edição no manifesto.
  assert.deepEqual(somenteFonte, [
    'e2e-auth-test',
    'error-monitor',
    'qa-block-monitor',
    'sicoob-seed-debug',
  ]);
});
