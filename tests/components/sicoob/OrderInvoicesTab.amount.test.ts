import { describe, expect, it } from "vitest";
import { parseAmountBR } from "@/components/sicoob/orders/OrderInvoicesTab";

describe("parseAmountBR", () => {
  it("lê milhar sem decimais como milhar", () => {
    // `Number("1.250")` devolvia 1,25 e gravava a nota mil vezes menor.
    expect(parseAmountBR("1.250")).toBe(1250);
    expect(parseAmountBR("1.250.000")).toBe(1250000);
  });

  it("lê o separador decimal correto", () => {
    expect(parseAmountBR("1.250,50")).toBe(1250.5);
    expect(parseAmountBR("1250.50")).toBe(1250.5);
    expect(parseAmountBR("99,90")).toBe(99.9);
  });

  it("aceita prefixo de moeda e espaços", () => {
    expect(parseAmountBR("R$ 1.250,00")).toBe(1250);
    expect(parseAmountBR(" R$ 99,90 ")).toBe(99.9);
  });

  it("devolve undefined para entrada sem número", () => {
    expect(parseAmountBR("")).toBeUndefined();
    expect(parseAmountBR("   ")).toBeUndefined();
    expect(parseAmountBR("abc")).toBeUndefined();
  });
});
