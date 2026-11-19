import { describe, it, expect } from "vitest";
import {
  EXPERT_CHAT_MAX_CONTENT_LENGTH,
  EXPERT_CHAT_MAX_MESSAGES,
  selectExpertChatMessages,
} from "@/lib/assistant-message-window";

function build(count: number, size = 10) {
  return Array.from({ length: count }, (_, index) => ({
    id: `m${index}`,
    role: (index % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
    content: "x".repeat(size),
  }));
}

describe("selectExpertChatMessages", () => {
  it("mantem o historico curto intacto", () => {
    const messages = build(6);
    expect(selectExpertChatMessages(messages)).toEqual(messages);
  });

  it("respeita o limite de mensagens da Edge", () => {
    const selected = selectExpertChatMessages(build(80));
    expect(selected.length).toBeLessThanOrEqual(EXPERT_CHAT_MAX_MESSAGES);
  });

  it("preserva a ultima pergunta do usuario", () => {
    const messages = build(80);
    messages[messages.length - 1] = { id: "last", role: "user", content: "pergunta final" };
    const selected = selectExpertChatMessages(messages);
    expect(selected.some((message) => message.content === "pergunta final")).toBe(true);
  });

  it("respeita o orcamento de caracteres", () => {
    const selected = selectExpertChatMessages(build(40, 4000));
    const total = selected.reduce((sum, message) => sum + message.content.length, 0);
    expect(total).toBeLessThanOrEqual(EXPERT_CHAT_MAX_CONTENT_LENGTH);
  });

  it("trunca mensagem unica gigante para caber no contrato", () => {
    const selected = selectExpertChatMessages([
      { id: "a", role: "user", content: "y".repeat(90_000) },
    ]);
    const total = selected.reduce((sum, message) => sum + message.content.length, 0);
    expect(total).toBeLessThanOrEqual(EXPERT_CHAT_MAX_CONTENT_LENGTH);
  });
});