import { describe, expect, it } from "vitest";

import { validateBudgetForSubmission } from "@/hooks/useQuoteBuilderState";

describe("validação de verba antes de enviar orçamento", () => {
  it("falha fechado quando a consulta da competência retorna erro", () => {
    expect(validateBudgetForSubmission(null, new Error("indisponível"))).toEqual({
      ok: false,
      message: "Não foi possível validar a verba do PA. Tente novamente antes de enviar.",
    });
  });

  it("falha fechado quando a competência não foi configurada", () => {
    expect(validateBudgetForSubmission(null, null)).toEqual({
      ok: false,
      message: "A verba desta competência ainda não foi configurada para o seu PA.",
    });
  });

  it("devolve a verba consultada quando o banco confirma a competência", () => {
    const budget = { verba_total: 10_000, verba_consumida: 2_000, limite_alcada: 5_000 };
    expect(validateBudgetForSubmission(budget, null)).toEqual({ ok: true, budget });
  });
});
