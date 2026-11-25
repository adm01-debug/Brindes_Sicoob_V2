import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));

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

import { AIChat } from "@/components/ai/AIChat";

function sseResponse(chunks: string[]) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        const payload = JSON.stringify({ choices: [{ delta: { content: chunk } }] });
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
  return new Response(stream, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

const input = () => screen.getByLabelText(/mensagem para o assistente/i);

describe("AIChat consome o stream real do expert-chat", () => {
  beforeEach(() => {
    // jsdom não implementa scrollTo; o componente usa para auto-scroll.
    Element.prototype.scrollTo = vi.fn();
    mocks.fetch.mockReset();
    vi.stubGlobal("fetch", mocks.fetch);
  });

  it("exibe a resposta recebida em SSE e envia modo e contexto do mockup", async () => {
    mocks.fetch.mockResolvedValue(sseResponse(["Posicione ", "a arte no centro."]));

    render(<AIChat assistantMode="layout" assistantContext="Produto: Caneca Sicoob" />);

    fireEvent.change(input(), { target: { value: "Onde coloco a arte?" } });
    fireEvent.keyDown(input(), { key: "Enter" });

    await waitFor(() => expect(screen.getByText("Posicione a arte no centro.")).toBeTruthy());

    const [, request] = mocks.fetch.mock.calls[0];
    const body = JSON.parse(request.body as string);
    expect(body.assistantMode).toBe("layout");
    expect(body.assistantContext).toBe("Produto: Caneca Sicoob");
    expect(body.messages.at(-1)).toEqual({ role: "user", content: "Onde coloco a arte?" });
    // `systemPrompt`/`contextId` nao existem no schema do backend.
    expect(body.systemPrompt).toBeUndefined();
    expect(body.contextId).toBeUndefined();
  });

  it("mostra erro quando a resposta chega sem conteudo", async () => {
    mocks.fetch.mockResolvedValue(new Response(null, { status: 200 }));

    render(<AIChat />);

    fireEvent.change(input(), { target: { value: "Oi" } });
    fireEvent.keyDown(input(), { key: "Enter" });

    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Resposta vazia"));
  });
});
