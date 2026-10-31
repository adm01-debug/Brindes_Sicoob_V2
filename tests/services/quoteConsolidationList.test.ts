import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  from: vi.fn(),
  tables: {} as Record<string, Array<Record<string, unknown>>>,
  calls: [] as Array<{ table: string; filters: Record<string, unknown>; range: [number, number] | null }>,
}));

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: database.from } }));

import { QuoteService } from "@/services/QuoteService";

function createBuilder(table: string) {
  const request = { table, filters: {} as Record<string, unknown>, range: null as [number, number] | null };
  database.calls.push(request);
  const query: Record<string, unknown> = {};
  const chain = () => query;
  query.select = vi.fn(chain);
  query.order = vi.fn(chain);
  query.limit = vi.fn(chain);
  query.eq = vi.fn((column: string, value: unknown) => {
    request.filters[column] = value;
    return query;
  });
  query.in = vi.fn((column: string, values: unknown[]) => {
    request.filters[column] = values;
    return query;
  });
  query.range = vi.fn((start: number, end: number) => {
    request.range = [start, end];
    return query;
  });
  query.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => {
    const rows = database.tables[table] ?? [];
    const [filterColumn, filterValue] = Object.entries(request.filters)[0] ?? [];
    const filtered = filterColumn
      ? rows.filter((row) => Array.isArray(filterValue)
        ? filterValue.includes(row[filterColumn])
        : row[filterColumn] === filterValue)
      : rows;
    const [start, end] = request.range ?? [0, filtered.length - 1];
    return Promise.resolve({ data: filtered.slice(start, end + 1), error: null }).then(resolve, reject);
  };
  return query;
}

const quote = (id: string) => ({
  id,
  quote_number: `Q-${id}`,
  status: "pending_singular_approval" as const,
  subtotal: 20,
  discount_percent: 0,
  discount_amount: 0,
  total: 20,
});

describe("QuoteService.listForConsolidation", () => {
  beforeEach(() => {
    database.tables = {};
    database.calls = [];
    database.from.mockImplementation((table: string) => createBuilder(table));
  });

  it("carrega itens e personalizações em consultas em lote e preserva o vínculo por orçamento", async () => {
    database.tables.quotes = [quote("q1"), quote("q2")];
    database.tables.quote_items = [
      { id: "i1", quote_id: "q1", product_id: "p1", product_name: "Caneta", product_sku: "SKU-1", quantity: 2, unit_price: 10 },
      { id: "i2", quote_id: "q2", product_id: "p1", product_name: "Caneta", product_sku: "SKU-1", quantity: 3, unit_price: 12 },
    ];
    database.tables.quote_item_personalizations = [
      { id: "pers-1", quote_item_id: "i1", technique_id: "laser", total_cost: 4 },
    ];

    const result = await QuoteService.listForConsolidation({ userId: "user-1", scope: "team", orgId: "org-1" });

    expect(result.map((item) => item.items?.length)).toEqual([1, 1]);
    expect(result[0].items?.[0]).toMatchObject({ id: "i1", quote_id: "q1", quantity: 2 });
    expect(result[0].items?.[0].personalizations).toEqual([
      expect.objectContaining({ id: "pers-1", quote_item_id: "i1", technique_id: "laser" }),
    ]);
    expect(result[1].items?.[0]).toMatchObject({ id: "i2", quote_id: "q2", quantity: 3, personalizations: [] });
    expect(database.calls.map((call) => call.table)).toEqual(["quotes", "quote_items", "quote_item_personalizations"]);
    expect(database.calls[1].filters.quote_id).toEqual(["q1", "q2"]);
  });

  it("página os filhos além do limite da API sem consultar cada orçamento individualmente", async () => {
    database.tables.quotes = [quote("q1")];
    database.tables.quote_items = Array.from({ length: 1001 }, (_, index) => ({
      id: `i${index}`,
      quote_id: "q1",
      product_id: `p${index}`,
      product_name: `Produto ${index}`,
      quantity: 1,
      unit_price: 1,
    }));

    const result = await QuoteService.listForConsolidation({ userId: "user-1", scope: "team", orgId: null });

    expect(result[0].items).toHaveLength(1001);
    expect(database.calls.filter((call) => call.table === "quote_items").map((call) => call.range)).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
    expect(database.calls.filter((call) => call.table === "quote_items")).toHaveLength(2);
  });

  it("não consulta linhas filhas quando não há orçamentos elegíveis", async () => {
    database.tables.quotes = [];

    await expect(QuoteService.listForConsolidation({ userId: "user-1", scope: "team", orgId: null })).resolves.toEqual([]);

    expect(database.calls.map((call) => call.table)).toEqual(["quotes"]);
  });
});
