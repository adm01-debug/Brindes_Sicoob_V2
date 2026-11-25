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
