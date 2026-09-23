import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const gate = join(process.cwd(), 'scripts/check-migration-immutability.mjs');

function repo() {
  const cwd = mkdtempSync(join(tmpdir(), 'sicoob-migration-gate-'));
  execFileSync('git', ['init', '-q'], { cwd });
  execFileSync('git', ['config', 'user.email', 'qa@example.invalid'], { cwd });
  execFileSync('git', ['config', 'user.name', 'QA'], { cwd });
  mkdirSync(join(cwd, 'supabase/migrations'), { recursive: true });
  writeFileSync(join(cwd, 'supabase/migrations/001_base.sql'), 'select 1;\n');
  execFileSync('git', ['add', '.'], { cwd });
  execFileSync('git', ['commit', '-qm', 'base'], { cwd });
  return cwd;
}

function run(cwd, env = {}) {
  return spawnSync(process.execPath, [gate], { cwd, encoding: 'utf8', env: { ...process.env, ...env } });
}

test('push com vários commits compara com o SHA anterior informado pelo evento', () => {
  const cwd = repo();
  try {
    const base = execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' }).trim();
    writeFileSync(join(cwd, 'README.md'), 'segundo commit\n');
    execFileSync('git', ['add', '.'], { cwd });
    execFileSync('git', ['commit', '-qm', 'segundo'], { cwd });
    writeFileSync(join(cwd, 'supabase/migrations/001_base.sql'), 'select 2;\n');
    assert.equal(run(cwd, { GITHUB_EVENT_BEFORE: base }).status, 1);
  } finally { rmSync(cwd, { recursive: true, force: true }); }
});

test('SHA zero é ignorado e HEAD^ mantém o gate fechado', () => {
  const cwd = repo();
  try {
    writeFileSync(join(cwd, 'README.md'), 'segundo commit\n');
    execFileSync('git', ['add', '.'], { cwd });
    execFileSync('git', ['commit', '-qm', 'segundo'], { cwd });
    writeFileSync(join(cwd, 'supabase/migrations/001_base.sql'), 'select 2;\n');
    assert.equal(run(cwd, { GITHUB_EVENT_BEFORE: '0000000000000000000000000000000000000000' }).status, 1);
  } finally { rmSync(cwd, { recursive: true, force: true }); }
});

test('repositório sem pai falha em vez de aprovar sem comparação', () => {
  const cwd = repo();
  try { assert.equal(run(cwd).status, 1); }
  finally { rmSync(cwd, { recursive: true, force: true }); }
});

test('migration nova é permitida sem alterar a já versionada', () => {
  const cwd = repo();
  try {
    const base = execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' }).trim();
    writeFileSync(join(cwd, 'supabase/migrations/002_delta.sql'), 'select 2;\n');
    execFileSync('git', ['add', '.'], { cwd });
    execFileSync('git', ['commit', '-qm', 'delta'], { cwd });
    assert.equal(run(cwd, { MIGRATION_BASE_REF: base }).status, 0);
  } finally { rmSync(cwd, { recursive: true, force: true }); }
});
