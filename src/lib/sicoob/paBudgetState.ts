import { projectOrderAgainstBudget } from '@/lib/sicoob/orderBudgetProjection';
import type { OrderStatus } from '@/types/sicoob/orders';

export type PaBudgetState = 'loading' | 'unavailable' | 'unconfigured' | 'configured';

export function hasConfiguredPaBudget(budget: { verba_total: number } | null | undefined): boolean {
  return budget !== null && budget !== undefined;
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
