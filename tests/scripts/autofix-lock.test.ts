import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
// @ts-expect-error módulo .mjs sem tipos
import { acquireLock } from '../../scripts/lib/pid-lock.mjs';

const root = process.cwd();
const lockFile = join(tmpdir(), `autofix-${createHash('sha1').update(root).digest('hex').slice(0, 8)}.lock`);

describe('autofix — trava', () => {
  afterEach(() => rmSync(lockFile, { force: true }));

  it('uma 2ª execução recusada NÃO remove a trava da execução ativa', () => {
    writeFileSync(lockFile, String(process.pid)); // dono vivo: este processo de teste
    const r = spawnSync(process.execPath, ['scripts/autofix/run.mjs', '--steps', 'docs-drift'], { cwd: root, encoding: 'utf8' });
    expect(r.status).toBe(2);
    expect(existsSync(lockFile)).toBe(true);
    expect(readFileSync(lockFile, 'utf8')).toBe(String(process.pid)); // não foi sobrescrita
  });
});

describe('pid-lock — acquireLock', () => {
  const tmp = join(tmpdir(), `pid-lock-test-${process.pid}-${Date.now()}.lock`);
  afterEach(() => rmSync(tmp, { force: true }));

  it('1ª chamada adquire e grava o próprio pid em UMA escrita (sem janela mkdir+write)', () => {
    const lock = acquireLock(tmp);
    expect(lock.busy).toBe(false);
    expect(readFileSync(tmp, 'utf8')).toBe(String(process.pid));
    lock.release();
    expect(existsSync(tmp)).toBe(false);
  });

  it('2ª chamada com dono vivo é recusada e NÃO apaga a trava', () => {
    const first = acquireLock(tmp);
    expect(first.busy).toBe(false);
    const second = acquireLock(tmp);
    expect(second.busy).toBe(true);
    expect(second.pid).toBe(process.pid);
    expect(existsSync(tmp)).toBe(true); // a trava do 1º sobrevive à tentativa do 2º
    first.release();
  });

  it('trava órfã (pid morto) é reclamada em vez de bloquear para sempre', () => {
    const deadPid = 999999; // não deve existir no container
    mkdirSync(join(tmpdir()), { recursive: true });
    writeFileSync(tmp, String(deadPid));
    const lock = acquireLock(tmp);
    expect(lock.busy).toBe(false);
    expect(readFileSync(tmp, 'utf8')).toBe(String(process.pid));
    lock.release();
  });

  it('sem a janela mkdir+write: nenhuma chamada intermediária vê a trava "vazia" (sem pid)', () => {
    // No mecanismo antigo, mkdirSync() e writeFileSync(pid) eram dois passos: uma leitura no meio
    // via readFileSync(pidFile) podia achar o arquivo ausente (pid=0) mesmo com a trava já "criada".
    // Com `wx`, a trava só existe já COM o pid dentro — não há estado intermediário observável.
    const lock = acquireLock(tmp);
    expect(lock.busy).toBe(false);
    // o arquivo nunca existiu sem conteúdo: ou não existe, ou já tem o pid.
    expect(readFileSync(tmp, 'utf8')).not.toBe('');
    lock.release();
  });
});
