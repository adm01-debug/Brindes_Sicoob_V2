import { describe, expect, it } from 'vitest';
import { defaultFlowFilters } from '@/components/expert/FlowFilterPanel';
import { buildExpertRequestBody } from '@/components/expert/chat/useExpertChat';
import { EXPERT_CHAT_MAX_CONTENT_LENGTH, EXPERT_CHAT_MAX_MESSAGE_LENGTH, EXPERT_CHAT_MAX_MESSAGES } from '@/lib/assistant-message-window';

describe('contrato de mensagens do chat especialista', () => {
  it('limita histórico longo e preserva a pergunta atual dentro do orçamento', () => {
    const history = Array.from({ length: 60 }, (_, index) => ({
      id: `msg-${index}`,
      role: index % 2 ? 'user' as const : 'assistant' as const,
      content: `Histórico ${index} ${'x'.repeat(900)}`,
    }));
    const currentQuestion = 'pergunta atual '.repeat(500);
    const body = buildExpertRequestBody(history, currentQuestion, undefined, defaultFlowFilters);

    expect(body.messages.length).toBeLessThanOrEqual(EXPERT_CHAT_MAX_MESSAGES);
    expect(body.messages.at(-1)?.role).toBe('user');
    expect(body.messages.at(-1)?.content).toBe(currentQuestion.slice(-EXPERT_CHAT_MAX_MESSAGE_LENGTH));
    expect(body.messages.every((message) => message.content.length <= EXPERT_CHAT_MAX_MESSAGE_LENGTH)).toBe(true);
    expect(body.messages.reduce((total, message) => total + message.content.length, 0)).toBeLessThanOrEqual(EXPERT_CHAT_MAX_CONTENT_LENGTH);
  });

  it('emite uma pergunta de até 5.000 caracteres quando não há histórico', () => {
    const body = buildExpertRequestBody([], '😀'.repeat(2_500), undefined, defaultFlowFilters);
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].content.length).toBe(EXPERT_CHAT_MAX_MESSAGE_LENGTH);
  });
});
