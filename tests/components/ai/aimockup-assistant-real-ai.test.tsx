import { readFileSync } from "node:fs";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ chat: vi.fn() }));

vi.mock("@/components/ai/AIChat", () => ({
  AIChat: (props: { systemPrompt?: string; className?: string; greeting?: string }) => {
    mocks.chat(props);
    return (
      <div data-testid="chat-real" className={props.className}>
        {props.systemPrompt}
      </div>
    );
  },
}));

import { AIMockupAssistant } from "@/components/ai/AIMockupAssistant";

describe("assistente de layouts entrega a conversa para a IA real", () => {
  it("abre o chat real com o contexto do produto e da tecnica", () => {
    render(<AIMockupAssistant productName="Caneca Sicoob" techniqueName="Laser" />);
    fireEvent.click(screen.getByRole("button", { name: /assistente de layouts/i }));

    expect(screen.getByTestId("chat-real")).toBeTruthy();
    const props = mocks.chat.mock.calls.at(-1)?.[0];
    expect(props?.systemPrompt).toContain("Caneca Sicoob");
    expect(props?.systemPrompt).toContain("Laser");
    expect(props?.systemPrompt).toContain("Não invente preços");
  });

  it("preserva a conversa ao minimizar e reabrir", () => {
    render(<AIMockupAssistant productName="Caneca Sicoob" techniqueName="Laser" />);
    fireEvent.click(screen.getByRole("button", { name: /assistente de layouts/i }));
    const chat = screen.getByTestId("chat-real");
    const panel = screen.getByTestId("assistant-panel");

    fireEvent.click(screen.getByText(/Matheus — Expert em Layouts/));

    expect(panel.className).toContain("h-14");
    expect(screen.getByTestId("assistant-chat-slot").className).toContain("hidden");

    fireEvent.click(screen.getByText(/Matheus — Expert em Layouts/));

    expect(screen.getByTestId("chat-real")).toBe(chat);
    expect(screen.getByTestId("assistant-chat-slot").className).not.toContain("hidden");
  });

  it("nao responde por conta propria nem some ao fechar", () => {
    render(<AIMockupAssistant />);
    fireEvent.click(screen.getByRole("button", { name: /assistente de layouts/i }));
    const chat = screen.getByTestId("chat-real");

    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));

    expect(screen.getByTestId("assistant-panel").className).toContain("hidden");
    expect(screen.getByTestId("chat-real")).toBe(chat);
  });
});

describe("o assistente nao simula IA no codigo", () => {
  it("nao carrega respostas prontas nem aleatoriedade local", () => {
    const source = readFileSync("src/components/ai/AIMockupAssistant.tsx", "utf8");

    expect(source).not.toContain("Simulate AI response");
    expect(source).not.toContain("Math.random(");
    expect(source).not.toContain("setTimeout(");
    expect(source).toContain('from "./AIChat"');
  });
});
