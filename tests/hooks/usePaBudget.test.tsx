import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ profile: { pa_id: "pa-do-perfil" } }),
}));

import { resolvePaBudgetCompetence, usePaBudget } from "@/hooks/usePaBudget";

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("usePaBudget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const builder = {
      select: mocks.select,
      eq: mocks.eq,
      maybeSingle: mocks.maybeSingle,
    };
    mocks.from.mockReturnValue(builder);
    mocks.select.mockReturnValue(builder);
    mocks.eq.mockReturnValue(builder);
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it("consulta a competência histórica do pedido, alinhada ao created_at", async () => {
    const { result } = renderHook(
      () => usePaBudget("pa-do-pedido", "2026-09-30T23:30:00.000Z"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(mocks.maybeSingle).toHaveBeenCalledOnce());

    expect(mocks.from).toHaveBeenCalledWith("pa_budgets");
    expect(mocks.eq.mock.calls).toEqual([
      ["pa_id", "pa-do-pedido"],
      ["ano", 2026],
      ["mes", 9],
    ]);
    expect(result.current.competenceLabel).toBe("09/2026");
  });

  it("não consulta outra competência quando a data informada é inválida", () => {
    const { result } = renderHook(
      () => usePaBudget("pa-do-pedido", "data-inválida"),
      { wrapper: createWrapper() },
    );

    expect(mocks.from).not.toHaveBeenCalled();
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.competence).toBeNull();
  });

  it("resolve a competência em UTC como o banco canônico", () => {
    expect(resolvePaBudgetCompetence("2026-09-01T00:30:00.000Z")).toEqual({
      year: 2026,
      month: 9,
    });
  });
});
