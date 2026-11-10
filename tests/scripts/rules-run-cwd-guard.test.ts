import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const root = process.cwd();
const scriptPath = resolve(root, 'scripts/rules/run.mjs');

describe('rules/run.mjs — cwd errado', () => {
  let tmp: string | undefined;
  afterEach(() => { if (tmp) rmSync(tmp, { recursive: true, force: true }); tmp = undefined; });

  it('cwd sem package.json/src/ sai 2 com erro em vez de "0 achados" silencioso', () => {
    tmp = mkdtempSync(join(tmpdir(), 'rules-run-cwd-'));
    const r = spawnSync(process.execPath, [scriptPath, '--only', 'nenhuma-regra-combina'], { cwd: tmp, encoding: 'utf8' });
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/não parece a raiz do repositório/);
  });

  it('--list continua funcionando em qualquer cwd (não depende de ROOT, só lista metadado)', () => {
    tmp = mkdtempSync(join(tmpdir(), 'rules-run-cwd-'));
    const r = spawnSync(process.execPath, [scriptPath, '--list'], { cwd: tmp, encoding: 'utf8' });
    expect(r.status).toBe(0);
    expect(r.stdout.length).toBeGreaterThan(0);
  });

  it('cwd correto (raiz do repo) continua funcionando', () => {
    const r = spawnSync(process.execPath, [scriptPath, '--list'], { cwd: root, encoding: 'utf8' });
    expect(r.status).toBe(0);
    expect(r.stdout.length).toBeGreaterThan(0);
  });
});
