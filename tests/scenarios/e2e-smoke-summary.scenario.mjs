import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';

const execFileAsync = promisify(execFile);
const summaryScript = resolve('scripts/e2e-smoke-summary.mjs');

test('resumo reprova quando o setup impede todos os smoke tests', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sicoob-smoke-summary-'));
  const report = join(directory, 'playwright-report', 'results.json');
  await mkdir(join(directory, 'playwright-report'));
  await writeFile(
    report,
    JSON.stringify({
      stats: { duration: 1000, startTime: new Date(0).toISOString() },
      suites: [{
        file: 'e2e/flows/20-all-features-smoke.spec.ts',
        specs: [{
          title: '01 · Vitrine inicial',
          tests: [{
            projectName: 'chromium-smoke',
            status: 'skipped',
            results: [{ status: 'skipped', duration: 0 }],
          }],
        }],
      }],
    }),
  );

  try {
    await assert.rejects(
      execFileAsync(process.execPath, [summaryScript], {
        cwd: directory,
        env: { ...process.env, E2E_RESULTS_JSON: report, CI: 'false' },
      }),
      (error) => {
        assert.equal(error.code, 1);
        assert.match(error.stdout, /Smoke bloqueado — nenhuma funcionalidade chegou a executar/);
        return true;
      },
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
