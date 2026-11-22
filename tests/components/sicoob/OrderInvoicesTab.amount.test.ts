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
    expect(parseAmountBR("1250")).toBe(1250);
  });

  it("aceita prefixo de moeda e espaços", () => {
    expect(parseAmountBR("R$ 1.250,00")).toBe(1250);
    expect(parseAmountBR(" R$ 99,90 ")).toBe(99.9);
  });

  it("rejeita separadores fora do padrão em vez de adivinhar", () => {
    // "1.250.50" tem dois pontos: não é milhar nem decimal. A normalização
    // anterior removia os pontos e gravava 125050.
    expect(parseAmountBR("1.250.50")).toBeUndefined();
    expect(parseAmountBR("1,250,50")).toBeUndefined();
    expect(parseAmountBR("1.25.3")).toBeUndefined();
  });

  it("rejeita texto que não representa número", () => {
    // "1250,OO" (letra O) caía como campo vazio e a nota era gravada sem valor.
    expect(parseAmountBR("1250,OO")).toBeUndefined();
    expect(parseAmountBR("abc")).toBeUndefined();
    expect(parseAmountBR("R$")).toBeUndefined();
  });

  it("devolve undefined para campo vazio", () => {
    expect(parseAmountBR("")).toBeUndefined();
    expect(parseAmountBR("   ")).toBeUndefined();
  });
});
