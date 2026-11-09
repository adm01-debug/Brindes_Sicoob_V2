import { sh } from '../lib.mjs';

const MAX_LINHAS = 60;

/** Gates que o projeto já tem, agregados no mesmo relatório. `autofix` aponta a correção sem IA, se existir. */
const CHECKERS = [
  { id: 'cores-hardcoded', script: 'check-sicoob-hardcoded-colors.mjs', severity: 'baixa', kind: 'falha', autofix: 'npm run autofix:apply -- --steps colors' },
  { id: 'seller-scope', script: 'check-seller-scope.mjs', severity: 'alta', kind: 'falha' },
  { id: 'edge-autorizacao', script: 'check-edge-authorization.mjs', severity: 'alta', kind: 'falha' },
  { id: 'edge-log-estruturado', script: 'check-edge-structured-logging.mjs', severity: 'media', kind: 'falha' },
  { id: 'edge-request-id', script: 'check-edge-request-id-propagation.mjs', severity: 'media', kind: 'falha' },
  { id: 'rota-errorelement', script: 'check-route-error-element.mjs', severity: 'media', kind: 'falha' },
  { id: 'aschild-aninhado', script: 'check-aschild-nesting.mjs', severity: 'media', kind: 'falha' },
  { id: 'rota-ref', script: 'check-route-ref-usage.mjs', severity: 'media', kind: 'falha' },
  { id: 'migration-imutavel', script: 'check-migration-immutability.mjs', severity: 'alta', kind: 'falha', staleSensitive: true },
];

export default CHECKERS.map((c) => ({
  id: `gate-${c.id}`,
  kind: c.kind,
  severity: c.severity,
  title: `Gate existente falhou: scripts/${c.script}`,
  fix: c.autofix ?? 'manual (ver a saída do próprio script)',
  run(ctx) {
    const r = sh('node', [`scripts/${c.script}`], ctx.root);
    if (r.status === 0) return { items: [] };
    if (c.staleSensitive && ctx.behind > 0) {
      return { items: [], note: `inconclusivo: o clone está ${ctx.behind} commit(s) atrás de origin/main, o gate compara contra a base e acusaria arquivos que só faltam aqui` };
    }
    // Mantém TODAS as linhas de detalhe (arquivo/ocorrência), não só o cabeçalho: é o que identifica cada achado
    // e permite a comparação entre dias enxergar "corrigi este, apareceu aquele". Só tira cor ANSI, linhas vazias e repetidas.
    const ansi = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');
    const linhas = ((r.stdout ?? '') + '\n' + (r.stderr ?? '')).replace(ansi, '').split('\n').map((l) => l.trim()).filter(Boolean);
    const out = [...new Set(linhas)].slice(0, MAX_LINHAS);
    if (linhas.length > out.length) out.push(`… +${new Set(linhas).size - out.length + 1} linha(s) omitida(s); rode scripts/${c.script} para ver tudo`);
    return { items: out.length ? out : [`exit ${r.status} (sem detalhe parseável)`] };
  },
}));
