// Sondas de auditoria: cada cenário prova um estado (lacuna ainda aberta ou já corrigida) contra
// o código real; nenhum aprova comportamento por si só.
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';

const { from, rpc, listOrders } = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), listOrders: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from, rpc } }));
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
  // create()/update() passaram a gravar via RPC atômica (ver QuoteService.ts); o payload de itens
  // agora é construído por esta função antes de ir para a RPC.
  buildAtomicQuoteItems: (items: unknown) => items,
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
  it('lacuna corrigida: autosave exige scopeId (identidade do ator) — sem ele, nada persiste; com ele, sobrevive a desmontar/montar', async () => {
    vi.useFakeTimers();
    const restore = vi.fn();
    // Sem scopeId: a lacuna original gravava e restaurava sem saber de quem era o rascunho.
    const semEscopo = render(<QuoteAutoSave data={{ notes: '' }} onRestore={restore} />);
    semEscopo.rerender(<QuoteAutoSave data={{ notes: 'rascunho sintético' }} onRestore={restore} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(2100); });
    expect(Object.keys(localStorage)).toHaveLength(0);
    semEscopo.unmount();

    // Com scopeId: persiste isolado por ator e sobrevive a desmontar/montar a página.
    const comEscopo = render(<QuoteAutoSave scopeId="ator-sintetico" data={{ notes: '' }} onRestore={restore} />);
    comEscopo.rerender(<QuoteAutoSave scopeId="ator-sintetico" data={{ notes: 'rascunho sintético' }} onRestore={restore} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(2100); });
    const chaves = Object.keys(localStorage).filter((key) => key.startsWith('autosave_draft:ator-sintetico:'));
    expect(chaves).toHaveLength(1);
    expect(localStorage.getItem(chaves[0]!)).toContain('rascunho sintético');
  });

  it('lacuna corrigida: restaura orçamento existente só quando o scopeId do ator coincide com o da chave gravada', () => {
    localStorage.setItem('autosave_quote:ator-sintetico:orcamento-sintetico', JSON.stringify({ notes: 'sessão anterior' }));
    const restore = vi.fn();
    render(<QuoteAutoSave quoteId="orcamento-sintetico" data={{ notes: '' }} onRestore={restore} />);
    expect(restore).not.toHaveBeenCalled(); // sem scopeId, identidade desconhecida: não restaura
    render(<QuoteAutoSave scopeId="ator-sintetico" quoteId="orcamento-sintetico" data={{ notes: '' }} onRestore={restore} />);
    expect(restore).toHaveBeenCalledWith({ notes: 'sessão anterior' });
  });

  it('lacuna corrigida: percorre todas as páginas respeitando o total, não só a primeira', async () => {
    listOrders.mockResolvedValue({
      orders: Array.from({ length: 200 }, (_, id) => ({ id: String(id), status: 'draft' })),
      total: 450,
    });
    expect(await listSicoobLogisticsTracking()).toEqual([]);
    // 450 itens, 200 por página: (page-1)*200 < 450 é verdade para page=1,2,3 e falso para page=4.
    expect(listOrders).toHaveBeenCalledTimes(3);
    expect(listOrders).toHaveBeenNthCalledWith(1, expect.objectContaining({ page: 1, pageSize: 200 }));
    expect(listOrders).toHaveBeenNthCalledWith(3, expect.objectContaining({ page: 3, pageSize: 200 }));
    expect(from).not.toHaveBeenCalled(); // nenhum pedido com status logístico encontrado em nenhuma página
  });

  it('lacuna corrigida: create() grava numa única RPC atômica — falha não deixa cabeçalho gravado sem os itens', async () => {
    const falha = { message: 'itens inválidos para a RPC atômica' };
    rpc.mockResolvedValue({ data: null, error: falha });
    await expect(QuoteService.create({
      quote: { status: 'draft' }, items: [{ product_id: 'produto-sintetico' }] as any,
      userId: 'ator-sintetico', orgId: null, idempotencyKey: 'idem-sintetica',
    })).rejects.toThrow('itens inválidos para a RPC atômica');
    expect(rpc).toHaveBeenCalledWith('save_quote_atomic_idempotent', expect.objectContaining({
      p_idempotency_key: 'idem-sintetica',
    }));
    expect(from).not.toHaveBeenCalled(); // tudo numa RPC só — não há mais "cabeçalho" separado de "itens"
  });

  it('lacuna corrigida: update() propaga o erro da RPC atômica em vez de resolver como sucesso', async () => {
    vi.spyOn(QuoteService, 'getById').mockResolvedValue({ id: 'q', items: [] } as any);
    const falha = { message: 'itens recusados pela RPC atômica' };
    rpc.mockResolvedValue({ data: null, error: falha });
    await expect(QuoteService.update({
      quoteId: 'q', quote: {}, items: [], userId: 'ator-sintetico', expectedRowVersion: 7,
    })).rejects.toThrow('itens recusados pela RPC atômica');
    expect(rpc).toHaveBeenCalledWith('save_quote_atomic', expect.objectContaining({
      p_quote_id: 'q', p_expected_row_version: 7,
    }));
  });

  it('lacuna corrigida: logHistory() propaga erro da RPC em vez de resolver silenciosamente', async () => {
    const falha = { message: 'histórico recusado' };
    rpc.mockResolvedValue({ data: null, error: falha });
    await expect(QuoteService.logHistory({
      quoteId: 'q', userId: 'ator-sintetico', action: 'updated', description: 'Sonda de auditoria',
    })).rejects.toThrow('histórico recusado');
    expect(rpc).toHaveBeenCalledWith('append_quote_history_note', expect.objectContaining({ p_quote_id: 'q' }));
  });
});
