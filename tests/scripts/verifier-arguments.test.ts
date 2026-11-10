import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '../..');
const script = (name: string) => join(ROOT, 'scripts', name);

/** `deno` falso: `--version` responde, qualquer outra chamada "passa". */
function fakeDenoPath() {
  const bin = mkdtempSync(join(tmpdir(), 'fake-deno-'));
  writeFileSync(join(bin, 'deno'), '#!/bin/sh\nif [ "$1" = "--version" ]; then echo "deno 9.9.9"; fi\nexit 0\n');
  chmodSync(join(bin, 'deno'), 0o755);
  return `${bin}:${process.env.PATH}`;
}
const run = (file: string, args: string[], env: Record<string, string> = {}) =>
  spawnSync(process.execPath, [script(file), ...args], {
    cwd: mkdtempSync(join(tmpdir(), 'verifier-cwd-')),
    encoding: 'utf8',
    env: { ...process.env, PATH: fakeDenoPath(), ...env },
  });
// cwd temporário precisa enxergar supabase/functions: o script resolve relativo ao cwd.
const runInRepo = (file: string, args: string[], env: Record<string, string> = {}) =>
  spawnSync(process.execPath, [script(file), ...args], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, PATH: fakeDenoPath(), ...env } });

describe('check-price-freshness-coverage — tolerância', () => {
  it.each(['abc', '', '-1', '100', 'NaN'])('COVERAGE_TOLERANCE_PP=%j é recusado (exit 2)', (value) => {
    const result = run('check-price-freshness-coverage.mjs', [], { COVERAGE_TOLERANCE_PP: value });
    // '' cai no padrão "1" via ??: só é recusado quando não numérico/fora da faixa.
    if (value === '') expect(result.status).not.toBe(2);
    else expect(result.status, result.stderr).toBe(2);
  });

  it('valor válido passa da validação (falha depois, por falta do coverage-summary)', () => {
    const result = run('check-price-freshness-coverage.mjs', [], { COVERAGE_TOLERANCE_PP: '2' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('coverage-summary.json');
  });
});

describe('check-edge-functions-health — --timeout', () => {
  const env = { VITE_SUPABASE_URL: 'http://127.0.0.1:9', SUPABASE_ANON_KEY: 'x' };
  it.each([['--timeout', 'abc'], ['--timeout='], ['--timeout=abc'], ['--timeout=0'], ['--timeout=-5']])('%j é erro de uso (exit 2)', (...args) => {
    const result = run('check-edge-functions-health.mjs', args, env);
    expect(result.status, result.stdout + result.stderr).toBe(2);
    expect(result.stderr).toContain('--timeout inválido');
  });
});

describe('triage-edge-typecheck — argumentos', () => {
  it.each([['--al'], ['--only', 'zz'], ['--only=nao-existe'], ['--jsno=x.json']])('%j é recusado (exit 2) sem examinar funções', (...args) => {
    const result = runInRepo('triage-edge-typecheck.mjs', args);
    expect(result.status, result.stdout + result.stderr).toBe(2);
  });
});

describe('typecheck-edge-functions — função pedida', () => {
  it('nome sem index.ts é exit 2, não "typecheck limpo"', () => {
    const result = runInRepo('typecheck-edge-functions.mjs', ['nao-existe']);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('nao-existe');
  });

  it('função real com compilador que passa é exit 0 e informa a contagem', () => {
    const result = runInRepo('typecheck-edge-functions.mjs', ['health-check']);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('1/1 edge function(s) typecheck cleanly');
  });
});
