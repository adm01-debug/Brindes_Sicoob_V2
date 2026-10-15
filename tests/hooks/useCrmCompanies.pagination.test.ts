import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ useQuery: vi.fn(), selectCrm: vi.fn() }));

vi.mock("@tanstack/react-query", () => ({ useQuery: mocks.useQuery }));
vi.mock("@/lib/crm-db", () => ({
  selectCrm: mocks.selectCrm,
  selectCrmById: vi.fn(),
  selectCrmByIdStrict: vi.fn(),
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
    mocks.selectCrm.mockImplementation(async (_table, options: { offset: number; limit: number }) =>
      options.offset < 10_000
        ? Array.from({ length: 1000 }, (_, index) => ({ id: `cliente-${options.offset + index}` }))
        : [{ id: "cliente-10000" }],
    );

    await expect(runQuery()).rejects.toThrow("excede 10.000 registros");
    expect(mocks.selectCrm).toHaveBeenCalledTimes(11);
    expect(mocks.selectCrm.mock.calls[10][1]).toMatchObject({ offset: 10_000, limit: 1 });
  });

  it.each([9_999, 10_000])("aceita exatamente %i registros sem ultrapassar o limite", async (count) => {
    mocks.selectCrm.mockImplementation(async (_table, options: { offset: number; limit: number }) => {
      const remaining = count - options.offset;
      return Array.from({ length: Math.max(0, Math.min(options.limit, remaining)) }, (_, index) => ({ id: `cliente-${options.offset + index}` }));
    });

    await expect(runQuery()).resolves.toHaveLength(count);
  });

  it.each([10_001, 10_999, 11_000])("rejeita %i registros ao detectar o 10.001º", async (count) => {
    mocks.selectCrm.mockImplementation(async (_table, options: { offset: number; limit: number }) => {
      const remaining = count - options.offset;
      return Array.from({ length: Math.max(0, Math.min(options.limit, remaining)) }, (_, index) => ({ id: `cliente-${options.offset + index}` }));
    });

    await expect(runQuery()).rejects.toThrow("excede 10.000 registros");
    expect(mocks.selectCrm.mock.calls.at(-1)?.[1]).toMatchObject({ offset: 10_000, limit: 1 });
  });
});
