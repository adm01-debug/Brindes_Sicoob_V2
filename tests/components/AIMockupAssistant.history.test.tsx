import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  getSupabaseFunctionUrl: () => "https://supabase.test/functions/v1/expert-chat",
  supabasePublishableKey: "chave-publica-teste",
  supabase: { auth: { getSession: mocks.getSession } },
}));
vi.mock("sonner", () => ({
  toast: { error: mocks.toastError },
}));

import { AIMockupAssistant } from "@/components/ai/AIMockupAssistant";

describe("AIMockupAssistant", () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value: vi.fn(),
    });
    mocks.getSession.mockReset().mockResolvedValue({
      data: { session: { access_token: "token-teste" } },
    });
    mocks.toastError.mockReset();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ content: "Recomendo centralizar a marca." }),
      { status: 200, headers: { "content-type": "application/json" } },
    )));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("preserva a conversa ao fechar e reabrir o painel", async () => {
    const user = userEvent.setup();
    render(<AIMockupAssistant productName="Caneca Sicoob" techniqueName="Laser" />);

    await user.click(screen.getByRole("button", { name: "Abrir assistente de layouts" }));
    await user.type(screen.getByRole("textbox", { name: "Mensagem para o assistente" }), "Como posicionar a marca?");
    await user.click(screen.getByRole("button", { name: "Enviar mensagem" }));

    const userMessage = await screen.findByText("Como posicionar a marca?");
    const assistantMessage = await screen.findByText("Recomendo centralizar a marca.");
    const conversationLog = screen.getByRole("log");

    await user.click(screen.getByRole("button", { name: "Fechar" }));

    expect(userMessage).toBeInTheDocument();
    expect(assistantMessage).toBeInTheDocument();
    expect(conversationLog.closest("[hidden]")).toHaveAttribute("hidden");

    await user.click(screen.getByRole("button", { name: "Abrir assistente de layouts" }));

    expect(userMessage).toBeVisible();
    expect(assistantMessage).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Mensagem para o assistente" })).toHaveValue("");
  });
});
