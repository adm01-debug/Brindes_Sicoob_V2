import { projectOrderAgainstBudget } from '@/lib/sicoob/orderBudgetProjection';
import type { OrderStatus } from '@/types/sicoob/orders';

export type PaBudgetState = 'loading' | 'unavailable' | 'unconfigured' | 'configured';

export function hasConfiguredPaBudget(budget: { verba_total: number } | null | undefined): boolean {
  return budget !== null && budget !== undefined;
}

export interface PaBudgetAmounts {
  planejada: number;
  reservada: number;
  comprometida: number;
  consumida: number;
  ocupada: number;
  disponivel: number;
  percentualOcupado: number;
  percentualConsumido: number;
}

type PaBudgetAmountSource =
  | {
      verba_total?: number | null;
      verba_planejada?: number | null;
      verba_reservada?: number | null;
      verba_comprometida?: number | null;
      verba_consumida?: number | null;
    }
  | null
  | undefined;

function toAmount(value: number | null | undefined): number {
  return Number(value ?? 0);
}

/**
 * A verba vive em quatro estados (migration 20261122120000). Reservado e
 * empenhado ainda nao sao gastos, mas ja estao ocupados: descontar so o
 * consumido libera a mesma verba duas vezes para novos pedidos.
 */
export function readPaBudgetAmounts(budget: PaBudgetAmountSource): PaBudgetAmounts {
  const planejada = toAmount(budget?.verba_planejada ?? budget?.verba_total);
  const reservada = toAmount(budget?.verba_reservada);
  const comprometida = toAmount(budget?.verba_comprometida);
  const consumida = toAmount(budget?.verba_consumida);
  const ocupada = reservada + comprometida + consumida;
  return {
    planejada,
    reservada,
    comprometida,
    consumida,
    ocupada,
    disponivel: planejada - ocupada,
    percentualOcupado: planejada > 0 ? (ocupada / planejada) * 100 : 0,
    percentualConsumido: planejada > 0 ? (consumida / planejada) * 100 : 0,
  };
}

export function resolvePaBudgetState(input: {
  isLoading: boolean;
  hasError: boolean;
  hasPaId: boolean;
  hasBudget: boolean;
}): PaBudgetState {
  if (input.isLoading) return 'loading';
  if (!input.hasPaId || input.hasError) return 'unavailable';
  return input.hasBudget ? 'configured' : 'unconfigured';
}

export interface BudgetCompetence {
  year: number;
  month: number;
}

type CompetenceRow = { ano?: number | null; mes?: number | null };

/** Competencia em UTC, o mesmo fuso usado nas colunas `ano`/`mes` da verba. */
export function resolveBudgetCompetence(referenceDate?: string | Date): BudgetCompetence | null {
  const date = referenceDate === undefined ? new Date() : new Date(referenceDate);
  if (Number.isNaN(date.getTime())) return null;
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

export function formatBudgetCompetence(competence: BudgetCompetence | null | undefined): string | null {
  if (!competence) return null;
  return `${String(competence.month).padStart(2, '0')}/${competence.year}`;
}

/**
 * A verba que vale para a competencia da data consultada: a linha exata e, se
 * ela nao existir, a ultima competencia anterior. Competencia futura nunca vale
 * — o gestor veria um limite que ainda nao foi aprovado para aquele mes.
 */
export function pickBudgetForCompetence<T extends CompetenceRow>(
  rows: T[] | null | undefined,
  competence: BudgetCompetence | null | undefined,
): T | null {
  if (!competence || !rows?.length) return null;
  const limit = competence.year * 12 + competence.month;
  let best: T | null = null;
  let bestRank = -1;
  for (const row of rows) {
    const year = Number(row.ano);
    const month = Number(row.mes);
    if (!Number.isFinite(year) || !Number.isFinite(month)) continue;
    const rank = year * 12 + month;
    if (rank > limit || rank <= bestRank) continue;
    best = row;
    bestRank = rank;
  }
  return best;
}

/**
 * Primeira competencia com verba DEPOIS da pedida. Quando so existe linha
 * futura, `pickBudgetForCompetence` devolve null e a tela calaria como se o PA
 * nao tivesse verba cadastrada; esta funcao permite avisar que a verba existe,
 * mas nao vale para o mes do pedido.
 */
export function nextFutureCompetence<T extends CompetenceRow>(
  rows: T[] | null | undefined,
  competence: BudgetCompetence | null | undefined,
): BudgetCompetence | null {
  if (!competence || !rows?.length) return null;
  const limit = competence.year * 12 + competence.month;
  let best: BudgetCompetence | null = null;
  let bestRank = Number.POSITIVE_INFINITY;
  for (const row of rows) {
    const year = Number(row.ano);
    const month = Number(row.mes);
    if (!Number.isFinite(year) || !Number.isFinite(month)) continue;
    const rank = year * 12 + month;
    if (rank <= limit || rank >= bestRank) continue;
    best = { year, month };
    bestRank = rank;
  }
  return best;
}

/** Competencia de uma linha de verba, ou null quando `ano`/`mes` nao sao numeros. */
export function readBudgetCompetence(row: CompetenceRow | null | undefined): BudgetCompetence | null {
  if (!row) return null;
  const year = Number(row.ano);
  const month = Number(row.mes);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  return { year, month };
}

/** Verdadeiro quando a linha usada e de uma competencia anterior a pedida. */
export function isCarryOverCompetence(
  used: BudgetCompetence | null | undefined,
  requested: BudgetCompetence | null | undefined,
): boolean {
  if (!used || !requested) return false;
  return used.year !== requested.year || used.month !== requested.month;
}

/**
 * A verba e mensal (docs/agentes/regras-dominio.md): saldo e disponibilidade so
 * valem para a competencia exata. Herdar a linha anterior aqui liberaria verba
 * de outro mes para compra, por isso o painel usa este picker e nao o de alcada.
 */
export function pickBudgetForExactCompetence<T extends CompetenceRow>(
  rows: T[] | null | undefined,
  competence: BudgetCompetence | null | undefined,
): T | null {
  if (!competence || !rows?.length) return null;
  return rows.find((row) => Number(row.ano) === competence.year && Number(row.mes) === competence.month) ?? null;
}

/**
 * Quando o pedido ja esta num status que reserva, compromete ou consome verba,
 * o saldo recebido ja inclui esse debito. Comparar o total integral contra esse
 * saldo conta o pedido duas vezes e acusa overbudget falso. A decisao usa a
 * mesma projecao do painel de inteligencia orcamentaria.
 */
export function isOrderOverPaBudget(
  state: PaBudgetState,
  orderTotal: number,
  remainingBudget: number,
  orderStatus?: OrderStatus | null,
): boolean | null {
  if (state !== 'configured') return null;
  return projectOrderAgainstBudget({
    allocatedBudget: null,
    remainingBudget,
    orderTotal,
    orderStatus,
  }).isOverBudget;
}
