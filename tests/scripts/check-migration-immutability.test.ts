import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SCRIPT = resolve(__dirname, '../../scripts/check-migration-immutability.mjs');

const git = (cwd: string, ...args: string[]) => {
  const result = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', ...args], { cwd, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')}: ${result.stderr}`);
  return result.stdout.trim();
};

/** Repo com `main` (2 migrations) e um branch de trabalho; origin/main aponta para a main. */
function repo() {
  const dir = mkdtempSync(join(tmpdir(), 'mig-immut-'));
  git(dir, 'init', '-q', '-b', 'main');
  mkdirSync(join(dir, 'supabase/migrations'), { recursive: true });
  writeFileSync(join(dir, 'supabase/migrations/20260101000000_a.sql'), 'select 1;\n');
  writeFileSync(join(dir, 'supabase/migrations/20260102000000_b.sql'), 'select 2;\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'base');
  git(dir, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
  git(dir, 'checkout', '-q', '-b', 'trabalho');
  return dir;
}
const run = (cwd: string, env: Record<string, string> = {}) =>
  spawnSync(process.execPath, [SCRIPT], { cwd, encoding: 'utf8', env: { ...process.env, MIGRATION_BASE_REF: '', GITHUB_BASE_REF: '', GITHUB_EVENT_BEFORE: '', ...env } });
const commit = (dir: string, message = 'mudanca') => {
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', message);
};

describe('check-migration-immutability', () => {
  it('migration nova passa', () => {
    const dir = repo();
    writeFileSync(join(dir, 'supabase/migrations/20260103000000_c.sql'), 'select 3;\n');
    commit(dir);
    expect(run(dir).status).toBe(0);
  });

  it('editar migration existente reprova', () => {
    const dir = repo();
    writeFileSync(join(dir, 'supabase/migrations/20260101000000_a.sql'), 'drop table x;\n');
    commit(dir);
    const result = run(dir);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('modificado');
  });

  it('remover migration existente reprova', () => {
    const dir = repo();
    rmSync(join(dir, 'supabase/migrations/20260101000000_a.sql'));
    commit(dir);
    expect(run(dir).status).toBe(1);
  });

  it('trocar migration por symlink (mudança de tipo) reprova', () => {
    const dir = repo();
    rmSync(join(dir, 'supabase/migrations/20260101000000_a.sql'));
    symlinkSync('20260102000000_b.sql', join(dir, 'supabase/migrations/20260101000000_a.sql'));
    commit(dir);
    const result = run(dir);
    expect(result.status, result.stdout).toBe(1);
    expect(result.stderr).toContain('tipo alterado');
  });

  it('branch atrasado em relação à main não acusa migration nova da main como "removida"', () => {
    const dir = repo();
    // a main avança com uma migration nova; o branch de trabalho não a tem
    git(dir, 'checkout', '-q', 'main');
    writeFileSync(join(dir, 'supabase/migrations/20260104000000_d.sql'), 'select 4;\n');
    commit(dir, 'main avancou');
    git(dir, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
    git(dir, 'checkout', '-q', 'trabalho');
    writeFileSync(join(dir, 'README.md'), 'x\n');
    commit(dir, 'trabalho');
    const result = run(dir);
    expect(result.status, result.stderr).toBe(0);
  });

  it('GITHUB_EVENT_BEFORE zerado (SHA sem objeto) cai no próximo candidato em vez de quebrar', () => {
    const dir = repo();
    writeFileSync(join(dir, 'supabase/migrations/20260101000000_a.sql'), 'drop table x;\n');
    commit(dir);
    const result = run(dir, { GITHUB_EVENT_BEFORE: '0'.repeat(40) });
    expect(result.stderr).not.toContain('bad object');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('modificado');
  });
});
