import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  budgets: [] as Array<Record<string, unknown>>,
  eqCalls: [] as Array<[string, string, unknown]>,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    profile: { pa_id: "pa-do-pedido", approval_threshold: null },
    isGestorCompras: true,
    isDev: false,
    isSupervisor: false,
  }),
}));

import { useApprovalThreshold } from "@/hooks/admin/useApprovalThreshold";

function thenable(table: string) {
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.eq = (column: string, value: unknown) => {
    mocks.eqCalls.push([table, column, value]);
    return builder;
  };
  builder.then = (resolve: (value: unknown) => void) =>
    resolve({ data: table === "pa_budgets" ? mocks.budgets : [], error: null });
  return builder;
}

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useApprovalThreshold", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockImplementation((table: string) => thenable(table));
    mocks.eqCalls = [];
    mocks.budgets = [
      { ano: 2025, mes: 10, limite_alcada: 700 },
      { ano: 2026, mes: 11, limite_alcada: 1000 },
      { ano: 2026, mes: 12, limite_alcada: 5000 },
    ];
  });

  it("usa a alçada da competência do pedido, não a do mês corrente", async () => {
    const { result } = renderHook(
      () => useApprovalThreshold(undefined, { referenceDate: "2026-11-02T12:00:00.000Z" }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.threshold).toBe(1000));
    expect(result.current.competenceLabel).toBe("11/2026");
    expect(result.current.needsApproval(1500)).toBe(true);
    expect(result.current.needsApproval(900)).toBe(false);
  });

  it("não aplica alçada futura e rotula a competência de onde o limite veio", async () => {
    const { result } = renderHook(
      () => useApprovalThreshold(undefined, { referenceDate: "2026-08-20T12:00:00.000Z" }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.threshold).toBe(700));
    expect(result.current.competenceLabel).toBe("10/2025");
    expect(result.current.requestedCompetenceLabel).toBe("08/2026");
    expect(result.current.isCarryOver).toBe(true);
  });

  it("usa a alçada do PA do pedido, e não a do usuário logado", async () => {
    const { result } = renderHook(
      () => useApprovalThreshold(undefined, { paId: "pa-de-outro-pedido", referenceDate: "2026-11-02T12:00:00.000Z" }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.threshold).toBe(1000));
    const thresholdsQuery = mocks.eqCalls.filter(([table, column]) => table === "pa_category_thresholds" && column === "pa_id");
    const budgetQuery = mocks.eqCalls.filter(([table, column]) => table === "pa_budgets" && column === "pa_id");
    expect([...thresholdsQuery, ...budgetQuery].every(([, , value]) => value === "pa-de-outro-pedido")).toBe(true);
    expect(result.current.isCarryOver).toBe(false);
  });
});
