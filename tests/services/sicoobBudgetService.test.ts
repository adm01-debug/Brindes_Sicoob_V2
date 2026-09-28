import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));

import { sicoobBudgetService } from "@/services/sicoob/budgetService";

function makeChain(result: { data: unknown; error: Error | null }) {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "in"]) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}

beforeEach(() => {
  mocks.from.mockReset();
});

describe("sicoobBudgetService.getBudgets", () => {
  it("resolve os PAs da cooperativa antes de filtrar as verbas", async () => {
    const paChain = makeChain({ data: [{ id: "pa-1" }, { id: "pa-2" }], error: null });
    const budgetChain = makeChain({ data: [{ id: "verba-1", pa_id: "pa-1" }], error: null });
    mocks.from.mockImplementation((table: string) => table === "postos_atendimento" ? paChain : budgetChain);

    const result = await sicoobBudgetService.getBudgets({ cooperative_id: "coop-1" });

    expect(paChain.eq as Mock).toHaveBeenCalledWith("cooperativa_id", "coop-1");
    expect(budgetChain.in as Mock).toHaveBeenCalledWith("pa_id", ["pa-1", "pa-2"]);
    expect(result).toEqual([{ id: "verba-1", pa_id: "pa-1" }]);
  });

  it("retorna vazio sem consultar verbas quando a cooperativa não possui PA", async () => {
    const paChain = makeChain({ data: [], error: null });
    mocks.from.mockReturnValue(paChain);

    await expect(sicoobBudgetService.getBudgets({ cooperative_id: "coop-vazia" })).resolves.toEqual([]);

    expect(mocks.from).toHaveBeenCalledTimes(1);
    expect(mocks.from).toHaveBeenCalledWith("postos_atendimento");
  });

  it("mantém o filtro direto por PA", async () => {
    const budgetChain = makeChain({ data: [{ id: "verba-2", pa_id: "pa-9" }], error: null });
    mocks.from.mockReturnValue(budgetChain);

    await sicoobBudgetService.getBudgets({ pa_id: "pa-9" });

    expect(budgetChain.eq as Mock).toHaveBeenCalledWith("pa_id", "pa-9");
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith("pa_budgets");
  });
});
