import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), rpc: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: mocks.invoke },
    from: vi.fn(),
    rpc: mocks.rpc,
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

  it('envia a chave estável de criação para a RPC idempotente', async () => {
    mocks.rpc.mockResolvedValue({ data: { id: 'quote-new', row_version: 1 }, error: null });

    await QuoteService.create({
      quote: {},
      items: [],
      userId: 'ator-1',
      orgId: null,
      idempotencyKey: '9a02c962-4f44-4f1b-8bcc-6fa80faac199',
    });

    expect(mocks.rpc).toHaveBeenCalledWith('save_quote_atomic_idempotent', expect.objectContaining({
      p_idempotency_key: '9a02c962-4f44-4f1b-8bcc-6fa80faac199',
    }));
  });

  it('preserva a versão aberta pelo editor ao atualizar, mesmo que a leitura auxiliar seja mais nova', async () => {
    const currentInDatabase = {
      id: 'quote-1',
      row_version: 9,
      discount_percent: 0,
      negotiation_markup_percent: 0,
      items: [],
    };
    vi.spyOn(QuoteService, 'getById').mockResolvedValue(currentInDatabase as never);
    mocks.rpc.mockResolvedValue({ data: { id: 'quote-1', row_version: 3 }, error: null });

    await QuoteService.update({
      quoteId: 'quote-1',
      quote: { notes: 'alteração local' },
      items: [],
      userId: 'ator-1',
      expectedRowVersion: 2,
    });

    expect(mocks.rpc).toHaveBeenCalledWith('save_quote_atomic', expect.objectContaining({
      p_expected_row_version: 2,
      p_quote: expect.objectContaining({ row_version: 3 }),
    }));
  });
});
