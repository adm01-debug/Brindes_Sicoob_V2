import { describe, expect, it } from "vitest";
import { calcularTotais } from "@/pages/admin/sicoob/tabs/BudgetsTab";

describe("calcularTotais da verba do PA", () => {
  it("desconta reservado e comprometido do saldo livre", () => {
    const t = calcularTotais({
      verba_planejada: 10000,
      verba_reservada: 1500,
      verba_comprometida: 2500,
      verba_consumida: 3000,
    });
    expect(t.saldo).toBe(3000);
  });

  it("nao libera saldo quando so ha valor reservado", () => {
    const t = calcularTotais({ verba_planejada: 5000, verba_reservada: 5000 });
    expect(t.saldo).toBe(0);
    expect(t.percentual).toBe(100);
  });

  it("usa verba_total quando verba_planejada nao existe", () => {
    const t = calcularTotais({ verba_total: 8000, verba_consumida: 2000 });
    expect(t.alocado).toBe(8000);
    expect(t.saldo).toBe(6000);
  });

  it("devolve percentual zero quando nao ha verba alocada", () => {
    const t = calcularTotais({ verba_consumida: 500 });
    expect(t.alocado).toBe(0);
    expect(t.percentual).toBe(0);
  });

  it("trata nulos como zero sem produzir NaN", () => {
    const t = calcularTotais({
      verba_planejada: 1000,
      verba_reservada: null,
      verba_comprometida: null,
      verba_consumida: null,
    });
    expect(t.saldo).toBe(1000);
    expect(Number.isNaN(t.percentual)).toBe(false);
  });
});