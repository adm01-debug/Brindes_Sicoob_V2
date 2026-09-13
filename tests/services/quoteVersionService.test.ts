import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc },
}));

import { quoteVersionService } from '@/services/quotes/quoteVersionService';

describe('quoteVersionService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('delega a cópia da versão para o RPC transacional', async () => {
    rpc.mockResolvedValue({ data: 'versao-2', error: null });

    await expect(quoteVersionService.createAtomicVersion('versao-1')).resolves.toBe('versao-2');

    expect(rpc).toHaveBeenCalledExactlyOnceWith('create_quote_version_atomic', {
      p_source_quote_id: 'versao-1',
    });
  });

  it('propaga a falha sem declarar uma nova versão', async () => {
    const failure = new Error('Uma versão mais recente já foi criada.');
    rpc.mockResolvedValue({ data: null, error: failure });

    await expect(quoteVersionService.createAtomicVersion('versao-1')).rejects.toBe(failure);
  });

  it('normaliza o erro simples retornado pelo PostgREST para preservar a mensagem na interface', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: '40001', message: 'Uma versão mais recente já foi criada.', details: null, hint: null },
    });

    await expect(quoteVersionService.createAtomicVersion('versao-1')).rejects.toThrow(
      /versão mais recente já foi criada/i,
    );
  });

  it('recusa resposta vazia do banco', async () => {
    rpc.mockResolvedValue({ data: null, error: null });

    await expect(quoteVersionService.createAtomicVersion('versao-1')).rejects.toThrow(
      /não retornou um orçamento válido/i,
    );
  });
});
