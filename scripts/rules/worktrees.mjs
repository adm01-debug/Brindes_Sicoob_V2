/**
 * Limpeza de worktrees temporários da rotina. Só remove o que a PRÓPRIA rotina registrou:
 * o nome `gaps-wt-*` não prova propriedade (um worktree seu com esse nome, mesmo sujo, não pode ser tocado).
 */
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

/** Remove os worktrees listados no registro (um caminho por linha) e apaga o registro. Retorna os caminhos removidos. */
export function limparRegistrados({ registro, tmp, git }) {
  const removidos = [];
  if (existsSync(registro)) {
    for (const linha of readFileSync(registro, 'utf8').split('\n')) {
      const p = linha.trim();
      if (!p) continue;
      // Defesa extra: só diretórios criados por mkdtemp(<tmp>/gaps-wt-*), nunca outro caminho.
      if (dirname(resolve(p)) !== resolve(tmp) || !basename(p).startsWith('gaps-wt-')) continue;
      git(['worktree', 'remove', '--force', '--force', p]);
      rmSync(p, { recursive: true, force: true });
      removidos.push(p);
    }
    rmSync(registro, { force: true });
  }
  git(['worktree', 'prune']);
  return removidos;
}
