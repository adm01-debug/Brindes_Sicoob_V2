import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QuoteShareDialog, buildQuoteWhatsappUrl } from "@/components/quotes/QuoteShareDialog";

const approval = vi.hoisted(() => ({
  generateApprovalLink: vi.fn(),
  getApprovalStatus: vi.fn(),
  copyToClipboard: vi.fn(),
}));

vi.mock("@/hooks/useQuoteApproval", () => ({
  useQuoteApproval: () => ({
    ...approval,
    revokeToken: vi.fn(),
    isLoading: false,
    isGenerating: false,
  }),
}));

describe("QuoteShareDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    approval.getApprovalStatus.mockResolvedValue(null);
    approval.generateApprovalLink.mockResolvedValue(null);
    approval.copyToClipboard.mockResolvedValue(undefined);
  });

  it("reutiliza o token ativo e compartilha somente a rota pública", async () => {
    approval.getApprovalStatus.mockResolvedValue({ token: "token-publico", status: "active" });
    const open = vi.spyOn(window, "open").mockImplementation(() => null);

    render(<QuoteShareDialog quoteId="quote-1" open onOpenChange={vi.fn()}
      quoteNumber="ORC-42" total={1250} clientPhone="(61) 99999-9999" />);

    const link = `${window.location.origin}/proposta/token-publico`;
    expect(await screen.findByDisplayValue(link)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Copiar link" }));
    expect(approval.copyToClipboard).toHaveBeenCalledWith(link);

    fireEvent.click(screen.getByRole("button", { name: "Enviar por WhatsApp" }));
    expect(open).toHaveBeenCalledWith(expect.stringContaining("https://wa.me/5561999999999"), "_blank", "noopener,noreferrer");
    expect(open.mock.calls[0]?.[0]).toContain(encodeURIComponent(link));
    expect(open.mock.calls[0]?.[0]).not.toContain("/orcamentos/");
  });

  it("gera um novo token pelo fluxo canônico quando não há link", async () => {
    const generated = {
      token: { token: "token-novo", status: "active" },
      link: `${window.location.origin}/proposta/token-novo`,
    };
    approval.generateApprovalLink.mockResolvedValue(generated);

    render(<QuoteShareDialog quoteId="quote-2" open onOpenChange={vi.fn()}
      defaultClientName="Cooperativa Centro" defaultClientEmail="compras@sicoob.test" />);

    fireEvent.click(await screen.findByRole("button", { name: "Gerar link público" }));

    await waitFor(() => expect(approval.generateApprovalLink).toHaveBeenCalledWith(
      "quote-2",
      "Cooperativa Centro",
      "compras@sicoob.test",
    ));
    expect(await screen.findByDisplayValue(generated.link)).toBeTruthy();
  });
});

describe("buildQuoteWhatsappUrl", () => {
  it("normaliza telefone brasileiro e preserva o link público", () => {
    const link = "https://portal.test/proposta/abc";
    const result = buildQuoteWhatsappUrl({ link, quoteNumber: "ORC-7", total: 999.9, clientPhone: "11 98888-7777" });

    expect(result).toContain("https://wa.me/5511988887777");
    expect(decodeURIComponent(result)).toContain(link);
    expect(decodeURIComponent(result)).toContain("ORC-7");
  });
});
