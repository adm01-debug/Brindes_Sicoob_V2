import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "token-de-teste" } } }),
    },
  },
  getSupabaseFunctionUrl: () => "https://exemplo.test/functions/v1/expert-chat",
  supabasePublishableKey: "chave-publicavel",
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { AIMockupAssistant } from "@/components/ai/AIMockupAssistant";

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));

describe("foco do assistente de layouts", () => {
  beforeEach(() => {
    // jsdom nao implementa scrollTo; o AIChat usa para auto-scroll.
    Element.prototype.scrollTo = vi.fn();
    mocks.fetch.mockReset();
    vi.stubGlobal("fetch", mocks.fetch);
  });

  it("leva o foco para o chat ao abrir e devolve ao botao ao fechar", async () => {
    render(<AIMockupAssistant productName="Caneca Sicoob" techniqueName="Laser" />);

    const launcher = screen.getByRole("button", { name: /assistente de layouts/i });
    fireEvent.click(launcher);

    const textarea = screen.getByLabelText(/mensagem para o assistente/i);
    await waitFor(() => expect(document.activeElement).toBe(textarea));

    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));

    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("button", { name: /assistente de layouts/i })),
    );
  });

  it("deixa o foco dentro do painel ao reabrir durante a resposta", async () => {
    const encoder = new TextEncoder();
    let liberar = () => {};
    const stream = new ReadableStream({
      start(controller) {
        liberar = () => {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        };
      },
    });
    mocks.fetch.mockResolvedValue(
      new Response(stream, { status: 200, headers: { "Content-Type": "text/event-stream" } }),
    );

    render(<AIMockupAssistant productName="Caneca Sicoob" techniqueName="Laser" />);
    fireEvent.click(screen.getByRole("button", { name: /assistente de layouts/i }));

    const textarea = screen.getByLabelText(/mensagem para o assistente/i) as HTMLTextAreaElement;
    await waitFor(() => expect(document.activeElement).toBe(textarea));
    fireEvent.change(textarea, { target: { value: "Onde coloco a arte?" } });
    fireEvent.keyDown(textarea, { key: "Enter" });

    // Resposta em andamento: o campo esta desabilitado e nao aceita foco.
    await waitFor(() => expect(textarea.disabled).toBe(true));

    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    fireEvent.click(screen.getByRole("button", { name: /assistente de layouts/i }));

    const fechar = screen.getByRole("button", { name: "Fechar" });
    await waitFor(() => expect(document.activeElement).toBe(fechar));

    await act(async () => {
      liberar();
      await Promise.resolve();
    });

    // Terminada a resposta, o foco continua dentro do painel (proximo Tab parte de dentro).
    expect(screen.getByTestId("assistant-panel").contains(document.activeElement)).toBe(true);
  });
});
