import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { effectiveStatus, normalizeSpecPath, runErrors } from '../../scripts/lib/playwright-report.mjs';

const ROOT = resolve(__dirname, '../..');

type Result = { status: string; duration?: number; error?: { message: string } };
const test = (status: string, results: Result[], extra: object = {}) => ({ projectName: 'chromium-smoke', status, results, ...extra });
const spec = (title: string, tests: object[]) => ({ title, line: 1, tests });
const report = (suites: object[], errors: object[] = []) => ({ stats: { duration: 1000, startTime: '2026-11-10T00:00:00Z' }, suites, errors });

function run(script: string, raw: unknown, env: Record<string, string> = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'e2e-summary-'));
  const file = join(dir, 'results.json');
  writeFileSync(file, JSON.stringify(raw));
  const result = spawnSync(process.execPath, [join(ROOT, 'scripts', script)], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, E2E_RESULTS_JSON: file, ...env },
  });
  return { ...result, dir };
}
const smokeSuite = (tests: object[]) => ({
  title: '20-all-features-smoke.spec.ts',
  file: 'flows/20-all-features-smoke.spec.ts',
  suites: [{ title: '@smoke autenticado', specs: tests.map((t, i) => spec(`0${i + 1} · Tela ${i + 1}`, [t])) }],
});

describe('lib/playwright-report', () => {
  it('status efetivo respeita test.fail() e flaky', () => {
    expect(effectiveStatus({ status: 'expected' }, { status: 'failed' })).toBe('passed'); // test.fail() que falhou como esperado
    expect(effectiveStatus({ status: 'unexpected' }, { status: 'passed' })).toBe('failed'); // test.fail() que PASSOU
    expect(effectiveStatus({ status: 'unexpected' }, { status: 'timedOut' })).toBe('timedOut');
    expect(effectiveStatus({ status: 'flaky' }, { status: 'passed' })).toBe('passed');
    expect(effectiveStatus({ status: 'skipped' }, {})).toBe('skipped');
    expect(effectiveStatus({}, { status: 'failed' })).toBe('failed'); // JSON sem status de teste
    expect(effectiveStatus({}, {})).toBe('unknown');
  });

  it('runErrors lê a primeira linha de cada erro do run', () => {
    expect(runErrors({ errors: [{ message: 'globalSetup falhou\n  at x' }, { value: 'outro' }, {}] })).toEqual(['globalSetup falhou', 'outro', 'erro do run sem mensagem']);
    expect(runErrors({})).toEqual([]);
    expect(runErrors({ errors: 'x' })).toEqual([]);
  });

  it('normaliza o caminho relativo ao testDir com o prefixo e2e/', () => {
    expect(normalizeSpecPath('flows/20-x.spec.ts')).toBe('e2e/flows/20-x.spec.ts');
    expect(normalizeSpecPath('./routes/admin/a.spec.ts')).toBe('e2e/routes/admin/a.spec.ts');
    expect(normalizeSpecPath('/repo/e2e/flows/20-x.spec.ts')).toBe('e2e/flows/20-x.spec.ts');
    expect(normalizeSpecPath('e2e\\flows\\20-x.spec.ts')).toBe('e2e/flows/20-x.spec.ts');
  });
});

describe('e2e-feature-summary', () => {
  const failing = report([{ title: 'x', file: 'flows/20-all-features-smoke.spec.ts', specs: [spec('t', [test('unexpected', [{ status: 'failed', duration: 5 }])])] }]);

  it('categoriza o spec pelo caminho relativo ao testDir (não "uncategorized")', () => {
    const { stdout } = run('e2e-feature-summary.mjs', failing);
    expect(stdout).toContain('flow/all-features-smoke');
    expect(stdout).not.toContain('uncategorized');
  });

  it('globalSetup que falha (suites vazio + errors) reprova e aparece no markdown', () => {
    const result = run('e2e-feature-summary.mjs', report([], [{ message: 'globalSetup: banco indisponível\n  at ...' }]));
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('globalSetup: banco indisponível');
    expect(result.stdout).not.toContain('all clear');
  });

  it('run limpo sem testes continua exit 0', () => {
    expect(run('e2e-feature-summary.mjs', report([])).status).toBe(0);
  });

  it('test.fail() que falha como esperado não reprova; o que passa por engano reprova', () => {
    const base = (t: object) => report([{ title: 'x', file: 'flows/a.spec.ts', specs: [spec('t', [t])] }]);
    expect(run('e2e-feature-summary.mjs', base(test('expected', [{ status: 'failed' }], { expectedStatus: 'failed' }))).status).toBe(0);
    expect(run('e2e-feature-summary.mjs', base(test('unexpected', [{ status: 'passed' }], { expectedStatus: 'failed' }))).status).toBe(1);
  });
});

describe('e2e-smoke-summary', () => {
  it('globalSetup que falha reprova (antes: "nenhum smoke encontrado" e exit 0)', () => {
    const result = run('e2e-smoke-summary.mjs', report([], [{ message: 'globalSetup: login E2E recusado' }]));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('globalSetup: login E2E recusado');
  });

  it('sem testes e sem erro continua não fatal (run de regression)', () => {
    expect(run('e2e-smoke-summary.mjs', report([])).status).toBe(0);
  });

  it('contagem correta e flaky sinalizado', () => {
    const tests = [
      test('expected', [{ status: 'passed' }]),
      test('flaky', [{ status: 'failed' }, { status: 'passed' }]),
      test('skipped', [{ status: 'skipped' }]),
    ];
    const result = run('e2e-smoke-summary.mjs', report([smokeSuite(tests)]));
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(result.stdout).toMatch(/Flaky/);
  });

  it('teste que falha de verdade reprova', () => {
    const result = run('e2e-smoke-summary.mjs', report([smokeSuite([test('unexpected', [{ status: 'failed' }])])]));
    expect(result.status).toBe(1);
  });
});

describe('run-smoke-filtered', () => {
  const run2 = (...args: string[]) => spawnSync(process.execPath, [join(ROOT, 'scripts/run-smoke-filtered.mjs'), ...args], { encoding: 'utf8' });
  it.each([['--tag'], ['--tag', '--headed'], ['--tag='], ['-t']])('%j é erro de uso (exit 2), não smoke completo', (...args) => {
    const result = run2(...args);
    expect(result.status, result.stdout + result.stderr).toBe(2);
    expect(result.stdout).not.toContain('Smoke completo');
  });
});
