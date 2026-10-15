import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ useQuery: vi.fn(), selectCrmPage: vi.fn() }));

vi.mock("@tanstack/react-query", () => ({ useQuery: mocks.useQuery }));
vi.mock("@/lib/crm-db", () => ({
  selectCrmPage: mocks.selectCrmPage,
  selectCrm: vi.fn(),
  selectCrmById: vi.fn(),
  searchCrm: vi.fn(),
}));

import { useCrmClientsPage } from "@/hooks/useCrmCompanies";

describe("useCrmClientsPage", () => {
  beforeEach(() => {
    mocks.useQuery.mockReset().mockReturnValue({});
    mocks.selectCrmPage.mockReset();
  });

  async function runQuery(options: { pageIndex: number; search: string; sortMode: "name" | "created" | "city" }) {
    useCrmClientsPage(options);
    const calls = mocks.useQuery.mock.calls;
    const queryCall = calls[calls.length - 1];
    if (!queryCall) throw new Error("React Query não recebeu opções de consulta");
    const query = queryCall[0] as { queryFn: () => Promise<unknown> };
    return query.queryFn();
  }

  it("carrega uma página ordenada e obtém contagens exatas, sem varrer a tabela", async () => {
    mocks.selectCrmPage
      .mockResolvedValueOnce({ data: [{ id: "cliente-100" }], count: 251 })
      .mockResolvedValueOnce({ data: [], count: 400 })
      .mockResolvedValueOnce({ data: [], count: 8 })
      .mockResolvedValueOnce({ data: [], count: 200 })
      .mockResolvedValueOnce({ data: [], count: 240 });

    await expect(runQuery({ pageIndex: 1, search: "cooperativa", sortMode: "created" })).resolves.toMatchObject({
      clients: [{ id: "cliente-100" }],
      filteredCount: 251,
      totalPages: 3,
      pageIndex: 1,
      kpis: { totalCount: 400, newThisMonth: 8, withLocation: 200, withCnpj: 240 },
    });

    expect(mocks.selectCrmPage).toHaveBeenCalledTimes(5);
    expect(mocks.selectCrmPage.mock.calls[0]?.[1]).toMatchObject({
      select: "id,razao_social,nome_fantasia,title,cnpj,cidade,estado,logo_url,is_customer,created_at",
      limit: 100,
      offset: 100,
      count: "exact",
      orderBy: [{ column: "created_at", ascending: false }, { column: "id", ascending: true }],
      search: { term: "cooperativa", columns: ["title", "nome_fantasia", "razao_social", "cnpj", "cidade"] },
    });
    expect(mocks.selectCrmPage.mock.calls.slice(1).every((call) => call[1]?.head === true && call[1]?.count === "exact")).toBe(true);
    expect(mocks.selectCrmPage.mock.calls[3]?.[1]?.filters).toMatchObject({ cidade: { not_null: true, neq: "" }, estado: { not_null: true, neq: "" } });
    expect(mocks.selectCrmPage.mock.calls[4]?.[1]?.filters).toMatchObject({ cnpj: { not_null: true, neq: "" } });
  });

  it("falha de forma explícita quando o bridge não fornece contagem exata", async () => {
    mocks.selectCrmPage
      .mockResolvedValueOnce({ data: [{ id: "cliente-1" }], count: null })
      .mockResolvedValue({ data: [], count: 0 });

    await expect(runQuery({ pageIndex: 0, search: "", sortMode: "name" })).rejects.toThrow("contagem exata");
  });
});
