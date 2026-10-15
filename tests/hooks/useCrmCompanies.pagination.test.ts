import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ useQuery: vi.fn(), selectCrm: vi.fn() }));

vi.mock("@tanstack/react-query", () => ({ useQuery: mocks.useQuery }));
vi.mock("@/lib/crm-db", () => ({
  selectCrm: mocks.selectCrm,
  selectCrmById: vi.fn(),
  searchCrm: vi.fn(),
}));

import { useAllCrmCompanies } from "@/hooks/useCrmCompanies";

async function runQuery() {
  useAllCrmCompanies({ is_customer: true });
  const options = mocks.useQuery.mock.calls[0][0] as { queryFn: () => Promise<unknown> };
  return options.queryFn();
}

describe("useAllCrmCompanies", () => {
  beforeEach(() => {
    mocks.useQuery.mockReset().mockReturnValue({});
    mocks.selectCrm.mockReset();
  });

  it("percorre todas as páginas e mantém uma ordenação estável", async () => {
    mocks.selectCrm
      .mockResolvedValueOnce(Array.from({ length: 1000 }, (_, index) => ({ id: `cliente-${index}` })))
      .mockResolvedValueOnce([{ id: "cliente-1000" }]);

    await expect(runQuery()).resolves.toHaveLength(1001);
    expect(mocks.selectCrm).toHaveBeenCalledTimes(2);
    expect(mocks.selectCrm.mock.calls.map(([, options]) => options.offset)).toEqual([0, 1000]);
    expect(mocks.selectCrm.mock.calls[0][1]).toMatchObject({
      orderBy: { column: "id", ascending: true },
      limit: 1000,
    });
  });

  it("falha explicitamente se a base exceder o limite seguro, sem retornar total parcial", async () => {
    mocks.selectCrm.mockImplementation(async () => Array.from({ length: 1000 }, (_, index) => ({ id: `cliente-${index}` })));

    await expect(runQuery()).rejects.toThrow("excede 10.000 registros");
    expect(mocks.selectCrm).toHaveBeenCalledTimes(11);
  });
});
