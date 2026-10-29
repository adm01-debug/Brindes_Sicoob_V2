import { beforeEach, describe, expect, it, vi } from "vitest";

const H = vi.hoisted(() => {
  const rpc = vi.fn();
  const from = vi.fn();
  return { rpc, from };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: H.from,
    rpc: H.rpc,
  },
}));

import { approveQuoteWithPdfAtomically, updateQuoteStatusAtomically } from "@/services/quoteStatusTransition";

describe("updateQuoteStatusAtomically", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    H.rpc.mockResolvedValue({ data: [{ id: "quote-1", status: "sent", row_version: 8 }], error: null });
  });

  it("envia à RPC atômica a versão observada pela tela, sem releitura prévia", async () => {
    await expect(updateQuoteStatusAtomically("quote-1", 7, "sent", "Sincronização concluída"))
      .resolves.toEqual({ id: "quote-1", status: "sent", row_version: 8 });

    expect(H.rpc).toHaveBeenCalledWith("bulk_update_quote_status_atomic", {
      p_quote_ids: ["quote-1"],
      p_expected_row_versions: [7],
      p_status: "sent",
      p_notes: "Sincronização concluída",
    });
    expect(H.from).not.toHaveBeenCalled();
  });

  it("recusa transição sem versão observada", async () => {
    await expect(updateQuoteStatusAtomically("quote-1", 0, "sent"))
      .rejects.toThrow("versão observada");
    expect(H.rpc).not.toHaveBeenCalled();
  });

  it("não trata uma resposta parcial como sucesso", async () => {
    H.rpc.mockResolvedValue({ data: [], error: null });

    await expect(updateQuoteStatusAtomically("quote-1", 7, "pending"))
      .rejects.toThrow("não foi confirmada");
  });

  it("propaga conflito ou negação retornados pelo banco", async () => {
    const error = { code: "40001", message: "versão obsoleta" };
    H.rpc.mockResolvedValue({ data: null, error });

    await expect(updateQuoteStatusAtomically("quote-1", 7, "pending"))
      .rejects.toEqual(error);
  });

  it("vincula o PDF e a aprovação na RPC específica", async () => {
    H.rpc.mockResolvedValue({
      data: [{ id: "quote-1", status: "approved", row_version: 8, approved_pdf_url: "https://arquivos.test/assinada.pdf" }],
      error: null,
    });

    await expect(approveQuoteWithPdfAtomically("quote-1", 7, "https://arquivos.test/assinada.pdf"))
      .resolves.toMatchObject({ status: "approved", approved_pdf_url: "https://arquivos.test/assinada.pdf" });
    expect(H.rpc).toHaveBeenCalledWith("approve_quote_with_pdf_atomic", {
      p_quote_id: "quote-1",
      p_expected_quote_row_version: 7,
      p_approved_pdf_url: "https://arquivos.test/assinada.pdf",
      p_notes: null,
    });
  });

  it("não aprova PDF sem a versão que a tela abriu", async () => {
    await expect(approveQuoteWithPdfAtomically("quote-1", 0, "quotes/quote-1/assinada.pdf"))
      .rejects.toThrow("versão observada");
    expect(H.rpc).not.toHaveBeenCalled();
  });
});
