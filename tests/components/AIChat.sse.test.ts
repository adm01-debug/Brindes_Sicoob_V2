import { describe, expect, it } from 'vitest';
import { readAssistantSse } from '@/components/ai/AIChat';

function sseResponse(chunks: string[]) {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  }), { headers: { 'Content-Type': 'text/event-stream' } });
}

describe('leitura do stream SSE do expert-chat', () => {
  it('agrega deltas mesmo quando um evento chega em blocos de rede separados', async () => {
    const response = sseResponse([
      'data: {"choices":[{"delta":{"content":"Olá ',
      'Sicoob"}}]}\n\n',
      'data: [DONE]\n\n',
    ]);

    await expect(readAssistantSse(response)).resolves.toBe('Olá Sicoob');
  });

  it('rejeita stream sem conteúdo em vez de mostrar resposta vazia', async () => {
    await expect(readAssistantSse(sseResponse(['data: [DONE]\n\n']))).rejects.toThrow('Resposta vazia');
  });
});
