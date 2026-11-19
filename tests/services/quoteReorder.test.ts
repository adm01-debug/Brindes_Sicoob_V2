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
    vi.resetAllMocks();
    sessionStorage.clear();
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

  it('reutiliza a chave após perda de resposta e encerra a intenção após sucesso', async () => {
    mocks.invoke
      .mockResolvedValueOnce({ data: null, error: new Error('timeout') })
      .mockResolvedValueOnce({ data: { quoteId: 'nova-quote' }, error: null })
      .mockResolvedValueOnce({ data: { quoteId: 'outra-quote' }, error: null });
    vi.spyOn(QuoteService, 'getById')
      .mockResolvedValueOnce({ id: 'nova-quote' } as never)
      .mockResolvedValueOnce({ id: 'outra-quote' } as never);

    await expect(QuoteService.reorder('quote-aprovada', 'ator-1', null)).rejects.toThrow('timeout');
    await expect(QuoteService.reorder('quote-aprovada', 'ator-1', null)).resolves.toMatchObject({ id: 'nova-quote' });
    await expect(QuoteService.reorder('quote-aprovada', 'ator-1', null)).resolves.toMatchObject({ id: 'outra-quote' });

    const keys = mocks.invoke.mock.calls.map((call) => call[1].body.idempotencyKey);
    expect(keys[1]).toBe(keys[0]);
    expect(keys[2]).not.toBe(keys[1]);
  });

  it('envia a chave estável de criação para a RPC idempotente', async () => {
    mocks.invoke.mockResolvedValue({ data: { attestationId: 'atestado-preco' }, error: null });
    mocks.rpc
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { id: 'quote-new', row_version: 1 }, error: null });

    await QuoteService.create({
      quote: {},
      items: [],
      userId: 'ator-1',
      orgId: null,
      idempotencyKey: 'chave-idempotente-de-teste',
    });

    expect(mocks.rpc).toHaveBeenNthCalledWith(1, 'get_quote_save_idempotent_replay', expect.objectContaining({
      p_idempotency_key: 'chave-idempotente-de-teste',
    }));
    expect(mocks.invoke).toHaveBeenCalledWith('quote-price-attestation', expect.objectContaining({
      body: expect.objectContaining({ quoteId: null, expectedRowVersion: null }),
    }));
    expect(mocks.rpc).toHaveBeenCalledWith('save_quote_atomic_idempotent_attested', expect.objectContaining({
      p_idempotency_key: 'chave-idempotente-de-teste',
      p_quote: expect.objectContaining({ price_attestation_id: 'atestado-preco' }),
    }));
  });

  it('não chama a RPC de criação quando o atestado de preços falha', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: null });
    mocks.invoke.mockResolvedValue({
      data: { error: 'O preço do catálogo mudou. Atualize o orçamento.' },
      error: new Error('409'),
    });

    await expect(QuoteService.create({
      quote: {},
      items: [],
      userId: 'ator-1',
      orgId: null,
      idempotencyKey: 'chave-idempotente-de-teste',
    })).rejects.toThrow('O preço do catálogo mudou');
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith('get_quote_save_idempotent_replay', expect.any(Object));
  });

  it('recupera criação já persistida sem chamar catálogo nem RPC de gravação', async () => {
    const persisted = { id: 'quote-replay', row_version: 1 };
    mocks.rpc.mockResolvedValueOnce({ data: persisted, error: null });

    await expect(QuoteService.create({
      quote: {},
      items: [],
      userId: 'ator-1',
      orgId: null,
      idempotencyKey: 'chave-idempotente-de-teste',
    })).resolves.toBe(persisted);

    expect(mocks.invoke).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith('get_quote_save_idempotent_replay', expect.objectContaining({
      p_idempotency_key: 'chave-idempotente-de-teste',
    }));
  });

  it('preserva a versão aberta pelo editor ao atualizar, mesmo que a leitura auxiliar seja mais nova', async () => {
    mocks.invoke.mockResolvedValue({ data: { attestationId: 'atestado-preco' }, error: null });
    mocks.rpc.mockResolvedValue({ data: { id: 'quote-1', row_version: 3 }, error: null });
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

    expect(mocks.invoke).toHaveBeenCalledWith('quote-price-attestation', expect.objectContaining({
      body: expect.objectContaining({ quoteId: 'quote-1', expectedRowVersion: 2 }),
    }));
    expect(mocks.rpc).toHaveBeenCalledWith('save_quote_atomic_attested', expect.objectContaining({
      p_expected_row_version: 2,
      p_quote: expect.objectContaining({ row_version: 3, price_attestation_id: 'atestado-preco' }),
    }));
  });
});
