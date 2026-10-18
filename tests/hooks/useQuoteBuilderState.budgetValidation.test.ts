import { describe, expect, it } from "vitest";

import { completeQuoteSave, quoteBuilderCanEdit, quoteBuilderCanPersistDraft, validateBudgetForSubmission, validateMonthlyBudget } from "@/hooks/useQuoteBuilderState";

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

  it("recusa orçamento positivo quando a verba cadastrada é zero", () => {
    expect(validateMonthlyBudget(1, { verba_total: 0, verba_consumida: 0 })).toBe(false);
  });

  it("permite orçamento somente até o saldo positivo disponível", () => {
    const budget = { verba_total: 10_000, verba_consumida: 2_000 };
    expect(validateMonthlyBudget(8_000, budget)).toBe(true);
    expect(validateMonthlyBudget(8_001, budget)).toBe(false);
  });
});

describe("navegação após persistir orçamento", () => {
  it("bloqueia edição enquanto o salvamento está em andamento", () => {
    expect(quoteBuilderCanEdit({ saving: true, isEditMode: false, currentStatus: "draft", isLatestVersion: true })).toBe(false);
    expect(quoteBuilderCanEdit({ saving: false, isEditMode: false, currentStatus: "draft", isLatestVersion: true })).toBe(true);
  });

  it("mantém o rascunho habilitado durante a pausa temporária dos controles", () => {
    const savingQuote = {
      isEditMode: false,
      currentStatus: "draft",
      isLatestVersion: true,
    };
    expect(quoteBuilderCanEdit({ ...savingQuote, saving: true })).toBe(false);
    expect(quoteBuilderCanPersistDraft({
      ...savingQuote,
    })).toBe(true);
    expect(quoteBuilderCanPersistDraft({
      isEditMode: true,
      currentStatus: "approved",
      isLatestVersion: true,
    })).toBe(false);
  });

  it("limpa alterações pendentes antes de navegar após salvar", () => {
    const markSaved = vi.fn();
    const navigate = vi.fn();
    completeQuoteSave({
      result: { id: "quote-1" } as never,
      isEditMode: false,
      expectedRowVersion: null,
      finalStatus: "draft" as never,
      transitionApplied: true,
      setExpectedRowVersion: vi.fn(),
      markSaved,
      navigate,
    });
    expect(markSaved).toHaveBeenCalledOnce();
    expect(markSaved.mock.invocationCallOrder[0]).toBeLessThan(navigate.mock.invocationCallOrder[0]);
    expect(navigate).toHaveBeenCalledWith("/orcamentos/quote-1");
  });
});
