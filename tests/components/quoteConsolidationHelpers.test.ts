import { describe, expect, it } from "vitest";
import { consolidateQuoteItems, toSafeCsvCell } from "@/components/quotes/quoteConsolidationHelpers";
import type { Quote } from "@/hooks/quotes/quoteTypes";

const baseQuote = (id: string, items: Quote["items"]): Quote => ({
  id,
  quote_number: `Q-${id}`,
  client_name: `Cliente ${id}`,
  status: "draft",
  subtotal: 0,
  discount_percent: 0,
  discount_amount: 0,
  total: 0,
  items,
});

describe("quoteConsolidationHelpers", () => {
  it("agrega linhas repetidas da mesma origem sem perder quantidade ou valor", () => {
    const items = consolidateQuoteItems([
      baseQuote("1", [
        { product_id: "caneta", product_name: "Caneta", product_sku: "CAN-1", quantity: 2, unit_price: 5 },
        { product_id: "caneta", product_name: "Caneta", product_sku: "CAN-1", quantity: 3, unit_price: 7 },
      ]),
    ], "", { key: "product_name", direction: "asc" });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ total_quantity: 5, total_value: 31, average_price: 6.2 });
    expect(items[0]?.sources).toEqual([expect.objectContaining({ quantity: 5, total_value: 31 })]);
  });

  it("não funde produtos sem SKU quando os IDs são diferentes", () => {
    const items = consolidateQuoteItems([
      baseQuote("1", [
        { product_id: "a", product_name: "Copo", quantity: 1, unit_price: 10 },
        { product_id: "b", product_name: "Copo", quantity: 1, unit_price: 12 },
      ]),
    ], "", null);
    expect(items.map((item) => item.key)).toEqual(["product:a", "product:b"]);
  });

  it("escapa CSV e neutraliza fórmulas em campos textuais", () => {
    expect(toSafeCsvCell('Caneta, "azul"\nlinha 2')).toBe('"Caneta, ""azul""\nlinha 2"');
    expect(toSafeCsvCell("=HYPERLINK(\"https://exemplo.test\")")).toBe('"\'=HYPERLINK(""https://exemplo.test"")"');
    expect(toSafeCsvCell(12.5)).toBe('"12.5"');
  });
});
