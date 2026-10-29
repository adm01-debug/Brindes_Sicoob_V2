import { describe, expect, it, vi } from "vitest";

const toastMocks = vi.hoisted(() => ({
  warning: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: toastMocks }));

import { applyQuoteTransition, completeQuoteSave, validateBudgetForSubmission } from "@/hooks/useQuoteBuilderState";

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

describe("concorrência de transição no editor de orçamento", () => {
  it("usa a versão retornada pela reabertura antes de enviar o status final", async () => {
    const updateQuoteStatus = vi.fn()
      .mockResolvedValueOnce({ id: "q-1", status: "draft", row_version: 3 })
      .mockResolvedValueOnce({ id: "q-1", status: "pending", row_version: 4 });

    await expect(applyQuoteTransition({
      quote: { id: "q-1", row_version: 2 } as never,
      finalStatus: "pending",
      persistedStatus: "rejected",
      maxDiscountPercent: null,
      realDiscountPercent: 0,
      requestApproval: vi.fn(),
      updateQuoteStatus,
    })).resolves.toBe(true);

    expect(updateQuoteStatus).toHaveBeenNthCalledWith(1, "q-1", "draft", 2);
    expect(updateQuoteStatus).toHaveBeenNthCalledWith(2, "q-1", "pending", 3);
  });

  it("preserva o editor e oferece revisão explícita após falha na transição", () => {
    const navigate = vi.fn();
    const setExpectedRowVersion = vi.fn();
    toastMocks.warning.mockClear();

    completeQuoteSave({
      result: { id: "q-1", row_version: 5 } as never,
      isEditMode: true,
      expectedRowVersion: 4,
      finalStatus: "pending",
      transitionApplied: false,
      setExpectedRowVersion,
      navigate,
    });

    expect(setExpectedRowVersion).toHaveBeenCalledWith(5);
    expect(toastMocks.warning).toHaveBeenCalledWith(
      "O orçamento foi salvo, mas não foi possível confirmar o status final.",
      expect.objectContaining({
        description: expect.stringMatching(/alterações estão preservadas/i),
        action: expect.objectContaining({ label: "Revisar orçamento", onClick: expect.any(Function) }),
      }),
    );
    expect(navigate).not.toHaveBeenCalled();

    const options = toastMocks.warning.mock.calls[0]?.[1];
    options?.action?.onClick();
    expect(navigate).toHaveBeenCalledWith("/orcamentos/q-1");
  });

  it("abre o orçamento criado se a transição falhar para evitar duplicação", () => {
    const navigate = vi.fn();
    toastMocks.warning.mockClear();

    completeQuoteSave({
      result: { id: "q-new" } as never,
      isEditMode: false,
      expectedRowVersion: null,
      finalStatus: "pending",
      transitionApplied: false,
      setExpectedRowVersion: vi.fn(),
      navigate,
    });

    expect(navigate).toHaveBeenCalledExactlyOnceWith("/orcamentos/q-new");
    expect(toastMocks.warning).toHaveBeenCalledOnce();
  });

  it("não tenta mudar status sem a versão que o editor observou", async () => {
    const updateQuoteStatus = vi.fn();

    await expect(applyQuoteTransition({
      quote: { id: "q-1" } as never,
      finalStatus: "pending",
      persistedStatus: "draft",
      maxDiscountPercent: null,
      realDiscountPercent: 0,
      requestApproval: vi.fn(),
      updateQuoteStatus,
    })).resolves.toBe(false);

    expect(updateQuoteStatus).not.toHaveBeenCalled();
  });
});
