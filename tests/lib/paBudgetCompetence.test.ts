import { describe, expect, it } from "vitest";
import {
  formatBudgetCompetence,
  pickBudgetForCompetence,
  resolveBudgetCompetence,
} from "@/lib/sicoob/paBudgetState";

const rows = [
  { ano: 2025, mes: 10, limite_alcada: 700 },
  { ano: 2026, mes: 11, limite_alcada: 1000 },
  { ano: 2026, mes: 12, limite_alcada: 5000 },
  { ano: 2027, mes: 1, limite_alcada: 9000 },
];

describe("competência da verba", () => {
  it("usa a linha exata da competência pedida", () => {
    expect(pickBudgetForCompetence(rows, { year: 2026, month: 11 })?.limite_alcada).toBe(1000);
  });

  it("cai para a última competência anterior quando a exata não existe", () => {
    expect(pickBudgetForCompetence(rows, { year: 2026, month: 9 })?.limite_alcada).toBe(700);
  });

  it("nunca usa competência futura", () => {
    expect(pickBudgetForCompetence(rows, { year: 2026, month: 12 })?.limite_alcada).toBe(5000);
    expect(pickBudgetForCompetence(rows, { year: 2026, month: 10 })?.mes).toBe(10);
    expect(pickBudgetForCompetence([{ ano: 2027, mes: 1 }], { year: 2026, month: 11 })).toBeNull();
  });

  it("devolve nulo sem competência ou sem linhas", () => {
    expect(pickBudgetForCompetence(rows, null)).toBeNull();
    expect(pickBudgetForCompetence([], { year: 2026, month: 11 })).toBeNull();
    expect(pickBudgetForCompetence(undefined, { year: 2026, month: 11 })).toBeNull();
  });

  it("resolve a competência em UTC, como as colunas ano/mes", () => {
    expect(resolveBudgetCompetence("2026-09-01T00:30:00.000Z")).toEqual({ year: 2026, month: 9 });
    expect(resolveBudgetCompetence("data-inválida")).toBeNull();
    expect(formatBudgetCompetence({ year: 2026, month: 9 })).toBe("09/2026");
    expect(formatBudgetCompetence(null)).toBeNull();
  });
});
