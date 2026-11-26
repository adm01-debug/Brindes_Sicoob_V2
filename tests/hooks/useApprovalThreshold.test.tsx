import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  budgets: [] as Array<Record<string, unknown>>,
  eqCalls: [] as Array<[string, string, unknown]>,
  profile: { pa_id: "pa-do-pedido", approval_threshold: null } as { pa_id: string; approval_threshold: number | null },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    profile: mocks.profile,
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
    mocks.profile = { pa_id: "pa-do-pedido", approval_threshold: null };
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

  it("a alçada do PA vence o limite pessoal do perfil", async () => {
    mocks.profile = { pa_id: "pa-do-pedido", approval_threshold: 200 };
    const { result } = renderHook(
      () => useApprovalThreshold(undefined, { referenceDate: "2026-11-02T12:00:00.000Z" }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.threshold).toBe(1000));
    expect(result.current.needsApproval(500)).toBe(false);
    expect(result.current.needsApproval(1500)).toBe(true);
  });

  it("cai no limite pessoal quando o PA não tem limite aprovado", async () => {
    mocks.profile = { pa_id: "pa-do-pedido", approval_threshold: 200 };
    mocks.budgets = [];
    const { result } = renderHook(
      () => useApprovalThreshold(undefined, { referenceDate: "2026-11-02T12:00:00.000Z" }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.threshold).toBe(200));
    expect(result.current.paThreshold).toBeNull();
    // Sem linha visível não dá para afirmar que o PA está sem alçada: a tela que
    // depende disso (aviso do carrinho) precisa saber a diferença.
    expect(result.current.hasVisiblePaBudget).toBe(false);
    expect(result.current.needsApproval(500)).toBe(true);
  });

  it("trata a alçada de R$ 0 como limite real do PA, e não como limite ausente", async () => {
    mocks.profile = { pa_id: "pa-do-pedido", approval_threshold: 5000 };
    mocks.budgets = [{ ano: 2026, mes: 11, limite_alcada: 0 }];
    const { result } = renderHook(
      () => useApprovalThreshold(undefined, { referenceDate: "2026-11-02T12:00:00.000Z" }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.paThreshold).toBe(0));
    expect(result.current.threshold).toBe(0);
    expect(result.current.hasVisiblePaBudget).toBe(true);
    expect(result.current.isCarryOver).toBe(false);
    expect(result.current.needsApproval(1)).toBe(true);
  });

  it("só consulta limites por categoria quando algum item tem categoria", async () => {
    const semCategoria = renderHook(
      () => useApprovalThreshold([{ unit_price: 10, quantity: 1, category_id: null }], { referenceDate: "2026-11-02T12:00:00.000Z" }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(semCategoria.result.current.threshold).toBe(1000));
    expect(mocks.eqCalls.some(([table]) => table === "pa_category_thresholds")).toBe(false);

    mocks.eqCalls = [];
    const comCategoria = renderHook(
      () => useApprovalThreshold([{ unit_price: 10, quantity: 1, category_id: "7" }], { referenceDate: "2026-11-02T12:00:00.000Z" }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(comCategoria.result.current.threshold).toBe(1000));
    expect(mocks.eqCalls.some(([table, column, value]) => table === "pa_category_thresholds" && column === "pa_id" && value === "pa-do-pedido")).toBe(true);
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
