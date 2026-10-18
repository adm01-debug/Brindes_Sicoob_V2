import { describe, expect, it } from 'vitest';
import { AI_CHAT_MAX_CONTENT_LENGTH, AI_CHAT_MAX_MESSAGE_LENGTH, AI_CHAT_MAX_MESSAGES, selectAssistantRequestMessages, type ChatMessage } from '@/components/ai/AIChat';

function createMessages(count: number): ChatMessage[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `message-${index}`,
    role: index % 2 === 0 ? ('assistant' as const) : ('user' as const),
    content: `Mensagem ${index}`,
    createdAt: index,
  }));
}

describe('limite do histórico enviado ao expert-chat', () => {
  it('mantém a saudação e as mensagens mais recentes dentro do limite de 30', () => {
    const messages = createMessages(56);
    const requestMessages = selectAssistantRequestMessages(messages, 'message-0');

    expect(requestMessages).toHaveLength(AI_CHAT_MAX_MESSAGES);
    expect(requestMessages[0]).toEqual(messages[0]);
    expect(requestMessages.slice(1)).toEqual(messages.slice(-29));
    expect(requestMessages.at(-1)).toEqual(messages.at(-1));
  });

  it('preserva a janela recente sem saudação e não altera históricos já válidos', () => {
    const overLimit = createMessages(51);
    const withinLimit = createMessages(AI_CHAT_MAX_MESSAGES);

    expect(selectAssistantRequestMessages(overLimit)).toEqual(overLimit.slice(-30));
    expect(selectAssistantRequestMessages(withinLimit)).toBe(withinLimit);
  });

  it('não inicia o contexto por uma resposta órfã quando corta um turno antigo', () => {
    const messages = createMessages(52);
    const requestMessages = selectAssistantRequestMessages(messages);

    expect(requestMessages.length).toBeLessThanOrEqual(AI_CHAT_MAX_MESSAGES);
    expect(requestMessages[0].role).toBe('user');
    expect(requestMessages.at(-1)?.role).toBe('user');
  });

  it('limita também o total de caracteres aceito pela Edge', () => {
    const messages = createMessages(30).map((message) => ({ ...message, content: 'x'.repeat(2_000) }));
    const selected = selectAssistantRequestMessages(messages);
    expect(selected.length).toBeLessThanOrEqual(AI_CHAT_MAX_MESSAGES);
    expect(selected.reduce((total, message) => total + message.content.length, 0)).toBeLessThanOrEqual(AI_CHAT_MAX_CONTENT_LENGTH);
    expect(selected.at(-1)).toEqual(messages.at(-1));
  });

  it('limita mensagens individuais ao máximo aceito pela Edge', () => {
    const messages = [{ ...createMessages(1)[0], content: 'x'.repeat(AI_CHAT_MAX_MESSAGE_LENGTH + 1) }];
    expect(selectAssistantRequestMessages(messages)[0].content).toHaveLength(AI_CHAT_MAX_MESSAGE_LENGTH);
  });

  it('aplica corretamente os limites exatos e a semântica UTF-16 usada por Zod', () => {
    const atMessageLimit = createMessages(AI_CHAT_MAX_MESSAGES);
    const overMessageLimit = createMessages(AI_CHAT_MAX_MESSAGES + 1);
    expect(selectAssistantRequestMessages(atMessageLimit)).toHaveLength(AI_CHAT_MAX_MESSAGES);
    expect(selectAssistantRequestMessages(overMessageLimit)).toHaveLength(AI_CHAT_MAX_MESSAGES);

    const emojiMessage = { ...createMessages(1)[0], content: '😀'.repeat(AI_CHAT_MAX_MESSAGE_LENGTH / 2) };
    expect(emojiMessage.content.length).toBe(AI_CHAT_MAX_MESSAGE_LENGTH);
    expect(selectAssistantRequestMessages([emojiMessage])[0].content).toHaveLength(AI_CHAT_MAX_MESSAGE_LENGTH);
  });

  it('reserva espaço para a pergunta atual mesmo após respostas extensas', () => {
    const question = { id: 'pergunta-atual', role: 'user' as const, content: 'Preciso de uma nova sugestão', createdAt: 100 };
    const longResponses = Array.from({ length: 7 }, (_, index) => ({
      id: `resposta-${index}`, role: 'assistant' as const,
      content: 'x'.repeat(5_000), createdAt: index,
    }));
    const selected = selectAssistantRequestMessages([question, ...longResponses]);
    expect(selected).toContainEqual(question);
    expect(selected.reduce((total, message) => total + message.content.length, 0)).toBeLessThanOrEqual(AI_CHAT_MAX_CONTENT_LENGTH);
  });
});
