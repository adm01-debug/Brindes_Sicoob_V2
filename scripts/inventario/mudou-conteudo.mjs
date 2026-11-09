#!/usr/bin/env node
/**
 * O inventario mudou de verdade? Compara cada arquivo de inventario/estado/ com a versao do
 * HEAD depois de tirar os carimbos de data (`medido_em`, `gerado_em`, em qualquer nivel) e a
 * telemetria viva (contadores de janela rolante). Imprime `true` ou `false` — usado pelo
 * inventario-estado-semanal.yml para decidir se abre PR.
 *
 * Uso: node scripts/inventario/mudou-conteudo.mjs [arquivo...]   (padrao: banco, rotas e edges)
 *
 * Replicado do Zapp Web V2 (scripts/inventario/mudou-conteudo.mjs). Aqui a telemetria viva e a do
 * cron e a das filas de entrega (`operacao.filas[]`): o numero de linhas e a contagem por status
 * mudam toda semana sem mudanca estrutural nenhuma. O que importa continua comparado: tabela nova,
 * RLS que caiu, policy que sumiu, rota nova, edge sem deploy, fila que entrou ou saiu da lista e o
 * APARECIMENTO (nao a contagem) de um alerta.
 */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const PADRAO = ['inventario/estado/banco.json', 'inventario/estado/rotas.json', 'inventario/estado/edges.json'];
const CARIMBOS = new Set(['medido_em', 'gerado_em']);
// Contadores de janela rolante: mudam quase toda semana sem mudanca estrutural.
const TELEMETRIA = new Set([
  'execucoes_24h', 'falhas_24h', 'execucoes_7d', 'falhas_7d', 'taxa_falha_7d_pct',
  'startup_timeout_7d', 'ultima_falha', 'duracao_max_s_7d', 'horas_paradas_7d',
  'mais_antigo', 'mais_de_7_dias', 'atualizada_em', 'tamanho_bytes',
]);
const IGNORADOS = new Set([...CARIMBOS, ...TELEMETRIA]);

// `historico.linhas`/`historico.bytes` tambem rolam todo dia com a retencao do historico do cron,
// mas o nome `linhas`/`bytes` e compartilhado com cada tabela em `tabelas[]`, onde a contagem real
// importa. So ignora dentro de `cron.historico`.
function limparHistoricoCron(historico) {
  if (!historico || typeof historico !== 'object') return historico;
  const { linhas, bytes, ...resto } = historico;
  return resto;
}

// Mesmo motivo em `operacao.filas[]`: a fila existir (e com quais status) e estrutural; quantas
// linhas ha em cada status, nao. Mantem o nome da tabela e a lista de status, sem as contagens.
function limparFila(fila) {
  if (!fila || typeof fila !== 'object' || !('tabela' in fila)) return fila;
  const { linhas, bytes, por_status: porStatus, ...resto } = fila;
  return {
    ...resto,
    por_status: Array.isArray(porStatus) ? porStatus.map((s) => s?.status ?? null) : porStatus ?? null,
  };
}

// A telemetria tambem vaza para o TEXTO de alertas[].detalhe, que a lista IGNORADOS (por nome de
// campo) nao alcanca: `cron_falhando` grava "nome (9.0% em 7d)" e `fila_com_falha` grava
// "tabela: 3 em failed". Normaliza so o TEXTO; se um job/tabela entra ou sai da lista, ou o alerta
// aparece/desaparece, a mudanca de verdade continua sendo pega.
const PORCENTAGEM_7D = /\s*\([\d.]+%\s*em\s*7d\)\s*$/;
const CONTAGEM_FILA = /^(.+?):\s*\d+\s+em\s+(.+)$/;
function normalizarAlerta(a) {
  if (!a || typeof a !== 'object' || !('tipo' in a) || !Array.isArray(a.detalhe)) return a;
  if (a.tipo === 'cron_falhando') {
    return { ...a, detalhe: a.detalhe.map((d) => (typeof d === 'string' ? d.replace(PORCENTAGEM_7D, '') : d)) };
  }
  if (a.tipo === 'fila_com_falha') {
    return { ...a, detalhe: a.detalhe.map((d) => (typeof d === 'string' ? d.replace(CONTAGEM_FILA, '$1: $2') : d)) };
  }
  // `horas_paradas_7d` e `mais_de_7_dias` rolam todo dia pela janela/retencao: so o alerta existir importa.
  if (a.tipo === 'cron_parado' || a.tipo === 'historico_cron_sem_limpeza') return { ...a, detalhe: [] };
  return a;
}

/** JSON canonico sem os carimbos de data e sem a telemetria viva. Texto que nao e JSON volta como esta. */
export function semCarimbos(texto) {
  if (texto === null) return null;
  let dado;
  try { dado = JSON.parse(texto); } catch { return texto; }
  const limpar = (v, chave) => {
    if (Array.isArray(v)) {
      return v.map((x) => limpar(chave === 'alertas' ? normalizarAlerta(x) : chave === 'filas' ? limparFila(x) : x));
    }
    if (v && typeof v === 'object') {
      const base = chave === 'historico' ? limparHistoricoCron(v) : v;
      return Object.fromEntries(
        Object.keys(base).filter((k) => !IGNORADOS.has(k)).sort().map((k) => [k, limpar(base[k], k)]),
      );
    }
    return v;
  };
  return JSON.stringify(limpar(dado));
}

/** true se algum arquivo mudou alem dos carimbos (arquivo novo ou apagado conta). */
export function mudou(arquivos, lerAntes, lerDepois) {
  return arquivos.some((f) => semCarimbos(lerAntes(f)) !== semCarimbos(lerDepois(f)));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arquivos = process.argv.length > 2 ? process.argv.slice(2) : PADRAO;
  const lerAntes = (f) => {
    try { return execFileSync('git', ['show', `HEAD:${f}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return null; }
  };
  const lerDepois = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null);
  console.log(String(mudou(arquivos, lerAntes, lerDepois)));
}
