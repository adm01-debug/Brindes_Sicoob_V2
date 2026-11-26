import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  budgets: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));

import { sicoobStatsService } from "@/services/sicoob/statsService";

function thenable(table: string) {
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.eq = () => builder;
  builder.in = () => builder;
  builder.gte = () => builder;
  builder.order = () => builder;
  builder.limit = () => builder;
  builder.then = (resolve: (value: unknown) => void) =>
    resolve({
      data: table === "pa_budgets" ? mocks.budgets : [],
      error: null,
      count: 0,
    });
  return builder;
}

describe("sicoobStatsService.getPaDashboardStats", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-20T12:00:00.000Z"));
    mocks.from.mockImplementation((table: string) => thenable(table));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("mostra a verba da competência corrente e ignora competência futura", async () => {
    mocks.budgets = [
      { ano: 2026, mes: 10, verba_total: 3000, verba_reservada: 0, verba_comprometida: 0, verba_consumida: 1000 },
      { ano: 2026, mes: 11, verba_total: 5000, verba_reservada: 1000, verba_comprometida: 0, verba_consumida: 500 },
      { ano: 2026, mes: 12, verba_total: 9000, verba_reservada: 0, verba_comprometida: 0, verba_consumida: 0 },
    ];

    const stats = await sicoobStatsService.getPaDashboardStats("pa-1");

    expect(stats.monthlyLimit).toBe(5000);
    expect(stats.availableBudget).toBe(3500);
    expect(stats.hasConfiguredBudget).toBe(true);
  });

  it("declara verba não configurada quando só existe competência futura", async () => {
    mocks.budgets = [
      { ano: 2026, mes: 12, verba_total: 9000, verba_reservada: 0, verba_comprometida: 0, verba_consumida: 0 },
    ];

    const stats = await sicoobStatsService.getPaDashboardStats("pa-1");

    expect(stats.monthlyLimit).toBe(0);
    expect(stats.hasConfiguredBudget).toBe(false);
  });
});
