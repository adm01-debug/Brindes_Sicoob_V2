/**
 * useQuoteApproval — generateApprovalLink, getApprovalStatus, revokeToken.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import "../components/render-helpers";
import { act } from "@testing-library/react";
import { renderHookWithProviders } from "./_helpers/render-hook-providers";
import { mockFromOnce, resetSupabaseMocks } from "./_helpers/mock-supabase-builder";
import { useQuoteApproval } from "@/hooks/useQuoteApproval";
import { toast } from "sonner";

beforeEach(() => {
  resetSupabaseMocks();
  vi.clearAllMocks();
});

describe("useQuoteApproval", () => {
  it("generateApprovalLink retorna token e link com /proposta/", async () => {
    const chain = mockFromOnce({
      data: { id: "t1", quote_id: "q1", token: "abc123", seller_id: "s", client_name: null, client_email: null, status: "active", expires_at: null, viewed_at: null, responded_at: null, response: null, response_notes: null, created_at: "" },
      error: null,
    });
    const { result } = renderHookWithProviders(() => useQuoteApproval());
    let r: Awaited<ReturnType<typeof result.current.generateApprovalLink>> | null = null;
    await act(async () => { r = await result.current.generateApprovalLink("q1", "Cliente", "c@x.com"); });
    expect(r!.token.token).toBe("abc123");
    expect(r!.link).toContain("/proposta/abc123");
    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({ status: "active", quote_id: "q1" }));
    expect(toast.success).toHaveBeenCalled();
  });

  it("generateApprovalLink retorna null em erro", async () => {
    mockFromOnce({ data: null, error: { message: "fail" } });
    const { result } = renderHookWithProviders(() => useQuoteApproval());
    let r: Awaited<ReturnType<typeof result.current.generateApprovalLink>> | null = null;
    await act(async () => { r = await result.current.generateApprovalLink("q1"); });
    expect(r).toBeNull();
    expect(toast.error).toHaveBeenCalled();
  });

  it("getApprovalStatus retorna o token mais recente", async () => {
    mockFromOnce({ data: { id: "t1", token: "xyz", status: "active" }, error: null });
    const { result } = renderHookWithProviders(() => useQuoteApproval());
    let token: unknown = null;
    await act(async () => { token = await result.current.getApprovalStatus("q1"); });
    expect((token as { token: string }).token).toBe("xyz");
  });

  it("revokeToken atualiza status e mostra toast", async () => {
    mockFromOnce({ data: null, error: null });
    const { result } = renderHookWithProviders(() => useQuoteApproval());
    let ok = false;
    await act(async () => { ok = await result.current.revokeToken("t1"); });
    expect(ok).toBe(true);
    expect(toast.success).toHaveBeenCalledWith("Link revogado");
  });

  it("revokeToken retorna false e mostra erro em falha", async () => {
    mockFromOnce({ data: null, error: { message: "boom" } });
    const { result } = renderHookWithProviders(() => useQuoteApproval());
    let ok = true;
    await act(async () => { ok = await result.current.revokeToken("t1"); });
    expect(ok).toBe(false);
    expect(toast.error).toHaveBeenCalled();
  });
});
