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
  buildAtomicQuoteItems: (items: unknown) => items,
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

vi.mock('@tanstack/react-query', () => ({ useQuery: (options: unknown) => options }));
vi.mock('@/lib/external-db', () => ({ invokeExternalDb: vi.fn() }));
import { useKitStockForecast } from '@/hooks/useKitStockForecast';
import type { KitItem } from '@/lib/kit-builder';

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

describe('Lacunas verificadas em main 8028c879 em 28/09/2026', () => {
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

  it('substitui a versão conhecida pelo editor pela recém-consultada', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { id: 'q' }, error: null });
    Object.assign((await import('@/integrations/supabase/client')).supabase, { rpc });
    vi.spyOn(QuoteService, 'getById').mockResolvedValue({ id: 'q', row_version: 7, items: [] } as any);
    await QuoteService.update({ quoteId: 'q', quote: { row_version: 1 }, items: [], userId: 'ator' });
    expect(rpc).toHaveBeenCalledWith('save_quote_atomic', expect.objectContaining({ p_expected_row_version: 7 }));
  });

  it('duas criações repetidas não fornecem chave idempotente à RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { id: 'q' }, error: null });
    Object.assign((await import('@/integrations/supabase/client')).supabase, { rpc });
    const entrada = { quote: { status: 'draft' as const }, items: [], userId: 'ator', orgId: null };
    await QuoteService.create(entrada);
    await QuoteService.create(entrada);
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc.mock.calls[0][1]).toEqual(rpc.mock.calls[1][1]);
    expect(rpc.mock.calls[0][1]).not.toHaveProperty('p_idempotency_key');
    expect(rpc.mock.calls[0][1].p_quote_id).toBeNull();
  });
  it('usa a mesma chave de previsão ao mudar unidades por item mantendo os mesmos produtos', () => {
    const base = { id: 'produto', name: 'Caneca', quantity: 1 } as KitItem;
    const antes = useKitStockForecast([base], 10) as unknown as { queryKey: unknown[] };
    const depois = useKitStockForecast([{ ...base, quantity: 100 }], 10) as unknown as { queryKey: unknown[] };
    expect(antes.queryKey).toEqual(depois.queryKey);
  });
});
