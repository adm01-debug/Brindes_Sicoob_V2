/**
 * Consulta pública mínima por capacidade do token.
 */
import { describe, it, expect, beforeEach } from "vitest";
import "../components/render-helpers";
import { waitFor } from "@testing-library/react";
import { renderHookWithProviders } from "./_helpers/render-hook-providers";
import { mockFunctionsInvoke, resetSupabaseMocks } from "./_helpers/mock-supabase-builder";
import { useQuoteApprovalToken } from "@/hooks/useQuoteApprovalToken";

beforeEach(() => {
  resetSupabaseMocks();
});

describe("useQuoteApprovalToken", () => {
  it("não dispara query quando token vazio", () => {
    const { result } = renderHookWithProviders(() => useQuoteApprovalToken(null));
    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it("retorna resumo do orçamento sem consulta anônima à tabela", async () => {
    mockFunctionsInvoke({ data: { quote: { quote_number: "001", total: 100, status: "active" } }, error: null });
    const { result } = renderHookWithProviders(() => useQuoteApprovalToken("abc"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ quote_number: "001", total: 100, status: "active" });
  });

  it("preserva ausência de dados para token inválido ou expirado", async () => {
    mockFunctionsInvoke({ data: { quote: null }, error: null });
    const { result } = renderHookWithProviders(() => useQuoteApprovalToken("abc"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it("propaga erro como isError", async () => {
    mockFunctionsInvoke({ data: null, error: { message: "not found" } });
    const { result } = renderHookWithProviders(() => useQuoteApprovalToken("zzz"));
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
