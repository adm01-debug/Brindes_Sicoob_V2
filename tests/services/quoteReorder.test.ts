import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: mocks.invoke },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

import { QuoteService } from '@/services/QuoteService';

describe('QuoteService.reorder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('usa a Edge Function de revalidação em vez de copiar preço no navegador', async () => {
    mocks.invoke.mockResolvedValue({ data: { quoteId: 'nova-quote' }, error: null });
    const reordered = { id: 'nova-quote', quote_number: 'ORC-2', status: 'draft' };
    vi.spyOn(QuoteService, 'getById').mockResolvedValue(reordered as never);

    await expect(QuoteService.reorder('quote-aprovada', 'ator-1', 'org-1')).resolves.toBe(
      reordered,
    );
    expect(mocks.invoke).toHaveBeenCalledWith('sicoob-reorder', {
      body: {
        sourceQuoteId: 'quote-aprovada',
        idempotencyKey: expect.any(String),
      },
    });
  });

  it('expõe a mensagem comercial segura devolvida pela função', async () => {
    mocks.invoke.mockResolvedValue({
      data: { error: 'O preço venceu e precisa ser confirmado com o fornecedor.' },
      error: new Error('409'),
    });

    await expect(QuoteService.reorder('quote-aprovada', 'ator-1', null)).rejects.toThrow(
      'O preço venceu',
    );
  });
});
