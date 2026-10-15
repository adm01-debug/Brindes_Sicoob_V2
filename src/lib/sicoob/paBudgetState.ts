export type PaBudgetState = "loading" | "unavailable" | "unconfigured" | "configured";

export function hasConfiguredPaBudget(budget: { verba_total: number } | null | undefined): boolean {
  return budget !== null && budget !== undefined;
}

export function resolvePaBudgetState(input: {
  isLoading: boolean;
  hasError: boolean;
  hasPaId: boolean;
  hasBudget: boolean;
}): PaBudgetState {
  if (input.isLoading) return "loading";
  if (!input.hasPaId || input.hasError) return "unavailable";
  return input.hasBudget ? "configured" : "unconfigured";
}

export function isOrderOverPaBudget(
  state: PaBudgetState,
  orderTotal: number,
  remainingBudget: number,
): boolean | null {
  return state === "configured" ? orderTotal > remainingBudget : null;
}
