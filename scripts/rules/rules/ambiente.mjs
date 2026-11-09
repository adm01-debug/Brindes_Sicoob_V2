import { sh } from '../lib.mjs';

export default {
  id: 'ambiente-branch-defasada',
  kind: 'falha',
  severity: 'media',
  title: 'Clone local atrás do origin/main — resultados abaixo podem estar velhos',
  fix: 'git fetch && atualizar a branch (por worktree, conforme AGENTS.md); depois rodar de novo',
  run(ctx) {
    const r = sh('git', ['rev-list', '--count', 'HEAD..origin/main'], ctx.root);
    const behind = r.status === 0 ? Number(r.stdout.trim()) : 0;
    ctx.behind = behind;
    return { items: behind > 0 ? [`HEAD está ${behind} commit(s) atrás de origin/main`] : [] };
  },
};
