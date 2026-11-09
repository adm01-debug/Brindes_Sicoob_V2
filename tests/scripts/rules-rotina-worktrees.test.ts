import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, cpSync, rmSync, realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// @ts-expect-error módulo .mjs sem tipos
import { limparRegistrados } from '../../scripts/rules/worktrees.mjs';

const sh = (cwd: string, ...args: string[]) => spawnSync('git', args, { cwd, encoding: 'utf8' });
function repoDescartavel() {
  const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'rotina-teste-')));
  const repo = join(tmp, 'repo');
  mkdirSync(repo);
  sh(repo, 'init', '-q', '-b', 'main');
  sh(repo, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'x');
  return { tmp, repo, git: (a: string[]) => sh(repo, ...a) };
}

describe('rules/rotina — limpeza de worktrees', () => {
  it('remove só o worktree registrado e preserva um do usuário com o mesmo prefixo, mesmo sujo', () => {
    const { tmp, repo, git } = repoDescartavel();
    const meu = join(tmp, 'gaps-wt-registrado');
    const doUsuario = join(tmp, 'gaps-wt-feature');
    git(['worktree', 'add', '--detach', '-q', meu]);
    git(['worktree', 'add', '--detach', '-q', doUsuario]);
    writeFileSync(join(doUsuario, 'trabalho.txt'), 'não commitado');
    const registro = join(tmp, 'registro');
    writeFileSync(registro, meu + '\n');

    const removidos = limparRegistrados({ registro, tmp, git });

    expect(removidos).toEqual([meu]);
    expect(existsSync(meu)).toBe(false);
    expect(existsSync(join(doUsuario, 'trabalho.txt'))).toBe(true);
    expect(git(['worktree', 'list']).stdout).toContain('gaps-wt-feature');
    expect(existsSync(registro)).toBe(false);
    rmSync(tmp, { recursive: true, force: true });
    void repo;
  });

  it('ignora caminho registrado fora do tmp ou sem o prefixo da rotina', () => {
    const { tmp, git } = repoDescartavel();
    const fora = join(tmp, 'meu-trabalho');
    git(['worktree', 'add', '--detach', '-q', fora]);
    writeFileSync(join(fora, 'a.txt'), 'x');
    const registro = join(tmp, 'registro');
    writeFileSync(registro, `${fora}\n/etc\n`);
    expect(limparRegistrados({ registro, tmp, git })).toEqual([]);
    expect(existsSync(join(fora, 'a.txt'))).toBe(true);
    rmSync(tmp, { recursive: true, force: true });
  });

  it('sem registro não faz nada', () => {
    const { tmp, git } = repoDescartavel();
    expect(limparRegistrados({ registro: join(tmp, 'nao-existe'), tmp, git })).toEqual([]);
    rmSync(tmp, { recursive: true, force: true });
  });
});

describe('rules/run — caminho do clone com espaço', () => {
  it('lista as regras quando o diretório tem espaços', () => {
    const base = mkdtempSync(join(tmpdir(), 'com espaco '));
    const dest = join(base, 'scripts', 'rules');
    cpSync(join(process.cwd(), 'scripts', 'rules'), dest, { recursive: true });
    const r = spawnSync(process.execPath, [join(dest, 'run.mjs'), '--list'], { cwd: base, encoding: 'utf8' });
    expect(r.stderr).not.toContain('ERR_MODULE_NOT_FOUND');
    expect(r.status).toBe(0);
    expect(r.stdout.split('\n').filter(Boolean).length).toBeGreaterThanOrEqual(23);
    rmSync(base, { recursive: true, force: true });
  });
});
