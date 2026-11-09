import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const root = process.cwd();
const lockDir = join(tmpdir(), `autofix-${createHash('sha1').update(root).digest('hex').slice(0, 8)}.lock`);

describe('autofix — trava', () => {
  afterEach(() => rmSync(lockDir, { recursive: true, force: true }));

  it('uma 2ª execução recusada NÃO remove a trava da execução ativa', () => {
    mkdirSync(lockDir);
    writeFileSync(join(lockDir, 'pid'), String(process.pid)); // dono vivo: este processo de teste
    const r = spawnSync(process.execPath, ['scripts/autofix/run.mjs', '--steps', 'docs-drift'], { cwd: root, encoding: 'utf8' });
    expect(r.status).toBe(2);
    expect(existsSync(lockDir)).toBe(true);
  });
});
