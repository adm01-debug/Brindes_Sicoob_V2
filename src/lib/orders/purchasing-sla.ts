/**
 * SLA de aprovação (24h) e totais do mês da gestão de compras.
 *
 * Duas regras valem mais do que o cálculo em si:
 *
 * 1. **Só agrega universo completo — o universo visível.** As consultas são
 *    limitadas (1.000 linhas). Se o `count` do Postgres não bate com as linhas
 *    devolvidas, a consulta truncou: devolvemos `null` e a tela mostra "—". Um
 *    agregado parcial apresentado como total vira decisão errada. A ressalva
 *    honesta: o `count` também passa pela RLS, então a igualdade prova que
 *    **nada foi truncado dentro do que este usuário enxerga** — não prova que
 *    não existam pedidos ocultos para ele.
 * 2. **SLA é tempo de decisão, não idade da fila.** Mede, entre os pedidos do
 *    mês que o gestor já aprovou, quantos foram decididos em até 24h depois de
 *    entrarem na fila (`waiting_approval` → primeiro status aprovado, ambos em
 *    `sicoob_order_history`). Contar pedido ainda pendente daria 100% num mês
 *    em que ninguém aprovou nada. Sem o par de carimbos para algum pedido
 *    aprovado da amostra, o SLA é `null` — não estimamos.
 *
 * Recuperado da PR #119, fechada sem merge.
 */
import type { OrderStatus } from '@/types/sicoob/orders';

export interface SicoobOrderHistoryStatusEvent {
  order_id: string | null;
  new_status: string;
  created_at: string;
}

export interface PurchasingOrder {
  id: string;
  status: OrderStatus;
  total_amount: number | null;
  created_at: string;
}

export type OrderListResult = { data: PurchasingOrder[]; count: number | null } | undefined;

export interface PurchasingMetrics {
  pendingCount: number | null;
  slaPercent: number | null;
  monthlyTotal: number | null;
  approvedTotal: number | null;
}

const APPROVED_STATUSES = new Set<OrderStatus>([
  'confirmed',
  'logistic',
  'in_production',
  'in_separation',
  'in_transit',
  'delivered',
  'completed',
]);

const DIA_EM_MS = 24 * 60 * 60 * 1000;

export interface ApprovalDecision {
  /** Entrada na fila do gestor imediatamente anterior à decisão. */
  submittedAtMs: number;
  /** Primeiro status aprovado registrado depois dessa entrada. */
  decidedAtMs: number;
}

/**
 * Para cada pedido, o par (entrou na fila, foi aprovado) da última decisão.
 *
 * Reenvio é comum: o que vale é a entrada na fila logo antes da aprovação, não
 * a primeira de todas. Pedido ainda sem aprovação registrada não entra no mapa.
 */
interface EventoDeFila { ms: number; aprovado: boolean }

/** Só os dois status que o SLA enxerga, com data válida e pedido conhecido. */
function eventoDeFila(event: SicoobOrderHistoryStatusEvent): EventoDeFila | null {
  if (!event.order_id) return null;
  const ms = Date.parse(event.created_at);
  if (!Number.isFinite(ms)) return null;
  const aprovado = APPROVED_STATUSES.has(event.new_status as OrderStatus);
  if (!aprovado && event.new_status !== 'waiting_approval') return null;
  return { ms, aprovado };
}

/** Último par (última ida à fila, aprovação seguinte) de uma linha do tempo. */
function ultimaDecisao(linha: EventoDeFila[]): ApprovalDecision | null {
  // Desempate explícito: confirmação dentro da alçada grava `waiting_approval`
  // e o status aprovado na MESMA transação, e `now()` é constante ali — os dois
  // eventos saem com o mesmo carimbo. Sem isto, a ordem em que o Postgres
  // devolvesse as linhas decidiria se o par existe; vindo a aprovação primeiro,
  // o pedido ficava sem par e um único caso desses zerava o SLA inteiro.
  // Entrada na fila sempre antes da aprovação no empate: decisão em zero hora.
  linha.sort((a, b) => a.ms - b.ms || Number(a.aprovado) - Number(b.aprovado));
  let entrada: number | null = null;
  let decisao: ApprovalDecision | null = null;
  for (const evento of linha) {
    if (!evento.aprovado) entrada = evento.ms;
    else if (entrada !== null) {
      decisao = { submittedAtMs: entrada, decidedAtMs: evento.ms };
      entrada = null;
    }
  }
  return decisao;
}

export function mapApprovalDecisions(
  events: readonly SicoobOrderHistoryStatusEvent[],
): ReadonlyMap<string, ApprovalDecision> {
  const porPedido = new Map<string, EventoDeFila[]>();
  for (const event of events) {
    const util = eventoDeFila(event);
    if (!util) continue;
    const linha = porPedido.get(event.order_id as string) ?? [];
    linha.push(util);
    porPedido.set(event.order_id as string, linha);
  }

  const decisoes = new Map<string, ApprovalDecision>();
  for (const [orderId, linha] of porPedido) {
    const decisao = ultimaDecisao(linha);
    if (decisao) decisoes.set(orderId, decisao);
  }
  return decisoes;
}

function resultCount(result: OrderListResult): number | null {
  return result ? result.count : null;
}

/** Universo completo: o total do banco bate com as linhas que chegaram. */
function hasCompleteResult(
  result: OrderListResult,
  count: number | null,
): result is NonNullable<OrderListResult> {
  return Boolean(result && count !== null && count === result.data.length);
}

/**
 * Percentual dos pedidos **já aprovados** do mês decididos em até 24h.
 *
 * Pedido pendente fica de fora de propósito: incluí-lo faria o indicador
 * mostrar 100% num mês em que ninguém aprovou nada — bastava a fila ser nova.
 */
function calculateApprovalSla(
  monthlyResult: OrderListResult,
  count: number | null,
  decisions: ReadonlyMap<string, ApprovalDecision> | undefined,
): number | null {
  if (!hasCompleteResult(monthlyResult, count) || !decisions) return null;
  const aprovados = monthlyResult.data.filter((order) => APPROVED_STATUSES.has(order.status));
  if (aprovados.length === 0) return null;
  const pares = aprovados.map((order) => decisions.get(order.id));
  // Faltou carimbo de algum aprovado: a amostra não é o universo, não estimamos.
  if (pares.some((par) => !par)) return null;
  const dentroDoSla = pares.filter(
    (par) => par && par.decidedAtMs - par.submittedAtMs <= DIA_EM_MS,
  ).length;
  return (dentroDoSla / aprovados.length) * 100;
}

function sumCompleteOrders(
  result: OrderListResult,
  count: number | null,
  predicate: (order: PurchasingOrder) => boolean,
): number | null {
  if (!hasCompleteResult(result, count)) return null;
  return result.data
    .filter(predicate)
    .reduce((total, order) => total + (Number(order.total_amount) || 0), 0);
}

export function calculatePurchasingMetrics(
  pendingResult: OrderListResult,
  monthlyResult: OrderListResult,
  decisions?: ReadonlyMap<string, ApprovalDecision>,
): PurchasingMetrics {
  const pendingCount = resultCount(pendingResult);
  const monthlyCount = resultCount(monthlyResult);

  return {
    pendingCount,
    slaPercent: calculateApprovalSla(monthlyResult, monthlyCount, decisions),
    monthlyTotal: sumCompleteOrders(
      monthlyResult,
      monthlyCount,
      (order) => order.status !== 'cancelled',
    ),
    approvedTotal: sumCompleteOrders(monthlyResult, monthlyCount, (order) =>
      APPROVED_STATUSES.has(order.status),
    ),
  };
}

/** "—" quando não há universo completo; nunca um número parcial. */
export function metricLabel(value: number | null, formatter: (value: number) => string): string {
  return value === null ? '—' : formatter(value);
}
