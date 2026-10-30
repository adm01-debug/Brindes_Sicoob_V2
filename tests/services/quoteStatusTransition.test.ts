import { beforeEach, describe, expect, it, vi } from "vitest";

const H = vi.hoisted(() => {
  const rpc = vi.fn();
  const single = vi.fn();
  const eq = vi.fn();
  const select = vi.fn();
  return { rpc, single, eq, select };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({ select: H.select })),
    rpc: H.rpc,
  },
}));

import { approveQuoteWithPdfAtomically, updateQuoteStatusAtomically } from "@/services/quoteStatusTransition";

describe("updateQuoteStatusAtomically", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    H.select.mockReturnValue({ eq: H.eq });
    H.eq.mockReturnValue({ single: H.single });
    H.single.mockResolvedValue({ data: { id: "quote-1", row_version: 7 }, error: null });
    H.rpc.mockResolvedValue({ data: [{ id: "quote-1", status: "sent", row_version: 8 }], error: null });
  });

  it("lê a versão atual e delega status e histórico à RPC atômica", async () => {
    await expect(updateQuoteStatusAtomically("quote-1", "sent", "Sincronização concluída"))
      .resolves.toEqual({ id: "quote-1", status: "sent", row_version: 8 });

    expect(H.rpc).toHaveBeenCalledWith("bulk_update_quote_status_atomic", {
      p_quote_ids: ["quote-1"],
      p_expected_row_versions: [7],
      p_status: "sent",
      p_notes: "Sincronização concluída",
    });
  });

  it("não trata uma resposta parcial como sucesso", async () => {
    H.rpc.mockResolvedValue({ data: [], error: null });

    await expect(updateQuoteStatusAtomically("quote-1", "pending"))
      .rejects.toThrow("não foi confirmada");
  });

  it("propaga conflito ou negação retornados pelo banco", async () => {
    const error = { code: "40001", message: "versão obsoleta" };
    H.rpc.mockResolvedValue({ data: null, error });

    await expect(updateQuoteStatusAtomically("quote-1", "pending"))
      .rejects.toEqual(error);
  });

  it("vincula o PDF e a aprovação na RPC específica", async () => {
    H.rpc.mockResolvedValue({
      data: [{ id: "quote-1", status: "approved", row_version: 8, approved_pdf_url: "https://arquivos.test/assinada.pdf" }],
      error: null,
    });

    await expect(approveQuoteWithPdfAtomically("quote-1", "https://arquivos.test/assinada.pdf"))
      .resolves.toMatchObject({ status: "approved", approved_pdf_url: "https://arquivos.test/assinada.pdf" });
    expect(H.rpc).toHaveBeenCalledWith("approve_quote_with_pdf_atomic", {
      p_quote_id: "quote-1",
      p_expected_quote_row_version: 7,
      p_approved_pdf_url: "https://arquivos.test/assinada.pdf",
      p_notes: null,
    });
  });
});
