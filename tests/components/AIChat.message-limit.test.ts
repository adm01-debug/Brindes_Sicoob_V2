import { describe, expect, it } from 'vitest';
import { AI_CHAT_MAX_MESSAGES, selectAssistantRequestMessages, type ChatMessage } from '@/components/ai/AIChat';

function createMessages(count: number): ChatMessage[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `message-${index}`,
    role: index % 2 === 0 ? ('assistant' as const) : ('user' as const),
    content: `Mensagem ${index}`,
    createdAt: index,
  }));
}

describe('limite do histórico enviado ao expert-chat', () => {
  it('mantém a saudação e as mensagens mais recentes dentro do limite de 50', () => {
    const messages = createMessages(56);
    const requestMessages = selectAssistantRequestMessages(messages, 'message-0');

    expect(requestMessages).toHaveLength(AI_CHAT_MAX_MESSAGES);
    expect(requestMessages[0]).toEqual(messages[0]);
    expect(requestMessages.slice(1)).toEqual(messages.slice(-49));
    expect(requestMessages.at(-1)).toEqual(messages.at(-1));
  });

  it('preserva a janela recente sem saudação e não altera históricos já válidos', () => {
    const overLimit = createMessages(51);
    const withinLimit = createMessages(AI_CHAT_MAX_MESSAGES);

    expect(selectAssistantRequestMessages(overLimit)).toEqual(overLimit.slice(-50));
    expect(selectAssistantRequestMessages(withinLimit)).toBe(withinLimit);
  });

  it('não inicia o contexto por uma resposta órfã quando corta um turno antigo', () => {
    const messages = createMessages(52);
    const requestMessages = selectAssistantRequestMessages(messages);

    expect(requestMessages.length).toBeLessThanOrEqual(AI_CHAT_MAX_MESSAGES);
    expect(requestMessages[0].role).toBe('user');
    expect(requestMessages.at(-1)?.role).toBe('user');
  });
});
