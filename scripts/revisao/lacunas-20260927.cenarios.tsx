// Sondas de auditoria: passar reproduz uma limitação, não aprova o comportamento.
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';

const { from, listOrders } = vi.hoisted(() => ({ from: vi.fn(), listOrders: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from } }));
vi.mock('@/services/sicoob/orderService', () => ({ sicoobOrderService: { listOrders } }));
vi.mock('@/lib/telemetry/structuredLogger', () => ({
  createClientLogger: () => ({ info: vi.fn(), error: vi.fn() }),
}));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('@/lib/auth/apply-seller-scope', () => ({ applySellerScope: vi.fn() }));
vi.mock('@/hooks/quotes/quoteHelpers', () => ({
  calculateQuoteTotals: () => ({}),
  buildInsertPayload: (quote: unknown) => quote,
  buildUpdatePayload: (quote: unknown) => quote,
  buildItemsInsertPayload: (items: unknown) => items,
  buildPersonalizationsInsertPayload: (items: unknown) => items,
}));
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children }: any) => <>{children}</>,
  TooltipContent: ({ children }: any) => <>{children}</>,
}));
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: any) => <>{children}</>,
  motion: { div: ({ children }: any) => <div>{children}</div> },
}));

import { QuoteAutoSave } from '@/components/quotes/QuoteAutoSave';
import { listSicoobLogisticsTracking } from '@/services/sicoob/logisticsReportService';
import { QuoteService } from '@/services/QuoteService';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.useRealTimers();
  localStorage.clear();
});

describe('Lacunas remanescentes após os PRs #32–#41', () => {
  it('não reencontra rascunho novo depois de desmontar e montar a página', async () => {
    vi.useFakeTimers();
    const restore = vi.fn();
    const primeiro = render(<QuoteAutoSave data={{ notes: '' }} onRestore={restore} />);
    primeiro.rerender(<QuoteAutoSave data={{ notes: 'rascunho sintético' }} onRestore={restore} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(2100); });
    const chaves = Object.keys(localStorage).filter((key) => key.startsWith('autosave_draft:'));
    expect(chaves).toHaveLength(1);
    expect(localStorage.getItem(chaves[0])).toContain('rascunho sintético');
    primeiro.unmount();
    restore.mockClear();
    render(<QuoteAutoSave data={{ notes: '' }} onRestore={restore} />);
    expect(restore).not.toHaveBeenCalled();
  });

  it('restaura orçamento existente sem receber identidade do ator', () => {
    localStorage.setItem('autosave_quote:orcamento-sintetico', JSON.stringify({ notes: 'sessão anterior' }));
    const restore = vi.fn();
    render(<QuoteAutoSave quoteId="orcamento-sintetico" data={{ notes: '' }} onRestore={restore} />);
    expect(restore).toHaveBeenCalledWith({ notes: 'sessão anterior' });
  });

  it('retorna logística vazia se a primeira página não contém pedido logístico, ignorando o total', async () => {
    listOrders.mockResolvedValue({
      orders: Array.from({ length: 500 }, (_, id) => ({ id: String(id), status: 'draft' })),
      total: 501,
    });
    expect(await listSicoobLogisticsTracking()).toEqual([]);
    expect(listOrders).toHaveBeenCalledTimes(1);
    expect(listOrders).toHaveBeenCalledWith({ page: 1, pageSize: 500 });
    expect(from).not.toHaveBeenCalled();
  });

  it('rejeita criação após gravar cabeçalho, sem compensação quando itens falham', async () => {
    const gravados: unknown[] = [];
    const falha = new Error('falha sintética dos itens');
    from.mockImplementation((table: string) => table === 'quotes'
      ? { insert: (payload: unknown) => ({ select: () => ({ single: async () => {
          gravados.push(payload);
          return { data: { id: 'orcamento-sintetico' }, error: null };
        } }) }) }
      : { insert: () => ({ select: async () => ({ data: null, error: falha }) }) });
    await expect(QuoteService.create({
      quote: { status: 'draft' }, items: [{ product_id: 'produto-sintetico' }] as any,
      userId: 'ator-sintetico', orgId: null,
    })).rejects.toBe(falha);
    expect(gravados).toHaveLength(1);
    expect(from).toHaveBeenCalledTimes(2);
  });

  it('ignora erro REST de exclusão dos itens e retorna atualização como sucesso', async () => {
    vi.spyOn(QuoteService, 'getById').mockResolvedValue({ id: 'q', row_version: 7, items: [] } as any);
    const eq = vi.fn().mockReturnThis();
    const query = { eq, select: () => ({ single: async () => ({ data: { id: 'q' }, error: null }) }) };
    eq.mockReturnValue(query);
    from.mockImplementation((table: string) => table === 'quotes'
      ? { update: () => query }
      : {
          delete: () => ({ eq: async () => ({ error: new Error('exclusão recusada') }) }),
          insert: () => ({ select: async () => ({ data: [], error: null }) }),
        });
    await expect(QuoteService.update({
      quoteId: 'q', quote: { row_version: 1 }, items: [], userId: 'ator-sintetico',
    })).resolves.toEqual({ id: 'q' });
    // A versão do formulário (1) é substituída pela leitura nova (7).
    expect(eq).toHaveBeenCalledWith('row_version', 7);
  });

  it('resolve gravação de histórico mesmo quando a API retorna erro', async () => {
    from.mockReturnValue({ insert: async () => ({ error: new Error('histórico recusado') }) });
    await expect(QuoteService.logHistory({
      quoteId: 'q', userId: 'ator-sintetico', action: 'updated', description: 'Sonda de auditoria',
    })).resolves.toBeUndefined();
  });
});
