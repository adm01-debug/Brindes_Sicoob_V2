import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
let scrollSpy: ReturnType<typeof vi.fn>;

describe("AIChat consome o stream real do expert-chat", () => {
  beforeEach(() => {
    // jsdom não implementa scrollTo; o componente usa para auto-scroll.
    scrollSpy = vi.fn();
    Element.prototype.scrollTo = scrollSpy;
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

  it("descarta a resposta antiga quando o chat e reiniciado durante a geracao", async () => {
    const encoder = new TextEncoder();
    const pushRef: { push: (chunk: string) => void; finish: () => void } = {
      push: () => {},
      finish: () => {},
    };
    const stream = new ReadableStream({
      start(controller) {
        pushRef.push = (chunk: string) => {
          const payload = JSON.stringify({ choices: [{ delta: { content: chunk } }] });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        };
        pushRef.finish = () => {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        };
      },
    });
    mocks.fetch.mockResolvedValue(
      new Response(stream, { status: 200, headers: { "Content-Type": "text/event-stream" } }),
    );

    render(<AIChat />);
    fireEvent.change(input(), { target: { value: "Onde coloco a arte?" } });
    fireEvent.keyDown(input(), { key: "Enter" });

    pushRef.push("Resposta antiga");
    await waitFor(() => expect(screen.getByText(/Resposta antiga/)).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: /reiniciar conversa/i }));

    // Entrega os trechos finais dentro do act: sem isso o teste pode medir antes
    // de o chat processar o resto da resposta antiga.
    await act(async () => {
      pushRef.push(" que nao pode voltar");
      pushRef.finish();
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.queryByText("Onde coloco a arte?")).toBeNull());
    expect(screen.queryByText(/Resposta antiga/)).toBeNull();
    expect(screen.queryByText(/nao pode voltar/)).toBeNull();
  });

  it("nao puxa a rolagem quando a pessoa esta lendo uma mensagem anterior", async () => {
    const encoder = new TextEncoder();
    const pushRef: { push: (chunk: string) => void; finish: () => void } = { push: () => {}, finish: () => {} };
    const stream = new ReadableStream({
      start(controller) {
        pushRef.push = (chunk: string) => {
          const payload = JSON.stringify({ choices: [{ delta: { content: chunk } }] });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        };
        pushRef.finish = () => {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        };
      },
    });
    mocks.fetch.mockResolvedValue(
      new Response(stream, { status: 200, headers: { "Content-Type": "text/event-stream" } }),
    );

    render(<AIChat />);
    fireEvent.change(input(), { target: { value: "Onde coloco a arte?" } });
    fireEvent.keyDown(input(), { key: "Enter" });

    pushRef.push("Primeira resposta");
    await waitFor(() => expect(screen.getByText(/Primeira resposta/)).toBeTruthy());

    const log = screen.getByRole("log");
    // Pessoa rolou para cima: 600px longe do fim da conversa.
    Object.defineProperty(log, "scrollHeight", { value: 1000, configurable: true });
    Object.defineProperty(log, "clientHeight", { value: 300, configurable: true });
    Object.defineProperty(log, "scrollTop", { value: 100, configurable: true, writable: true });
    fireEvent.scroll(log);
    scrollSpy.mockClear();

    await act(async () => {
      pushRef.push(" e continua chegando");
      pushRef.finish();
    });

    expect(screen.getByText(/continua chegando/)).toBeTruthy();
    expect(scrollSpy).not.toHaveBeenCalled();
  });
});
