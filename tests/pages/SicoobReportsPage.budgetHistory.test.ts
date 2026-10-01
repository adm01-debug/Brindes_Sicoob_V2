import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));

import { fetchAllBudgetHistoryRows } from "@/pages/sicoob/reports/SicoobReportsPage";

type BudgetRow = {
  id: string;
  pa_id: string;
  ano: number;
  mes: number;
  verba_total: number;
  verba_consumida: number;
  postos_atendimento: { nome: string } | null;
};

function makePageQuery(data: BudgetRow[]) {
  const chain = {
    select: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
    eq: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    then: vi.fn(),
  };
  chain.select.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  chain.range.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.gte.mockReturnValue(chain);
  chain.lte.mockReturnValue(chain);
  chain.then.mockImplementation((resolve, reject) =>
    Promise.resolve({ data, error: null }).then(resolve, reject));
  return chain;
}

function budgetRow(index: number): BudgetRow {
  return {
    id: `budget-${String(index).padStart(4, "0")}`,
    pa_id: `pa-${String(index).padStart(4, "0")}`,
    ano: 2026,
    mes: 9,
    verba_total: 1_000,
    verba_consumida: index,
    postos_atendimento: { nome: `PA ${index}` },
  };
}

describe("histórico de verba paginado", () => {
  it("limita um PA às 12 competências mais recentes", async () => {
    const page = makePageQuery(Array.from({ length: 12 }, (_, index) => budgetRow(index)));
    mocks.from.mockReset().mockReturnValueOnce(page);

    const rows = await fetchAllBudgetHistoryRows("pa-alvo", null);

    expect(rows).toHaveLength(12);
    expect(mocks.from).toHaveBeenCalledTimes(1);
    expect(page.range).toHaveBeenCalledWith(0, 11);
    expect(page.eq).toHaveBeenCalledWith("pa_id", "pa-alvo");
  });

  it("pagina o consolidado por join da cooperativa dentro de dois anos", async () => {
    const firstPage = makePageQuery(Array.from({ length: 1_000 }, (_, index) => budgetRow(index)));
    const secondPage = makePageQuery([budgetRow(1_000)]);
    mocks.from.mockReset().mockReturnValueOnce(firstPage).mockReturnValueOnce(secondPage);

    const rows = await fetchAllBudgetHistoryRows(null, "cooperativa-alvo");

    expect(rows).toHaveLength(1_001);
    expect(rows[rows.length - 1]?.id).toBe("budget-1000");
    expect(mocks.from).toHaveBeenCalledTimes(2);
    expect(firstPage.range).toHaveBeenCalledWith(0, 999);
    expect(secondPage.range).toHaveBeenCalledWith(1_000, 1_999);

    for (const page of [firstPage, secondPage]) {
      expect(page.select).toHaveBeenCalledWith(expect.stringContaining("postos_atendimento!inner"));
      expect(page.order.mock.calls).toEqual([
        ["ano", { ascending: false }],
        ["mes", { ascending: false }],
        ["pa_id", { ascending: true }],
        ["id", { ascending: true }],
      ]);
      expect(page.gte).toHaveBeenCalledWith("ano", new Date().getUTCFullYear() - 1);
      expect(page.lte).toHaveBeenCalledWith("ano", new Date().getUTCFullYear());
      expect(page.eq).toHaveBeenCalledWith(
        "postos_atendimento.cooperativa_id",
        "cooperativa-alvo",
      );
    }
  });
});
