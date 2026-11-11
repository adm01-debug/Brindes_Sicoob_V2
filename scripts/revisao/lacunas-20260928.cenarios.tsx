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
  it('lacuna corrigida: autosave exige scopeId (identidade do ator) — sem ele, nada persiste; com ele, sobrevive a desmontar/montar', async () => {
    vi.useFakeTimers();
    const restore = vi.fn();
    const semEscopo = render(<QuoteAutoSave data={{ notes: '' }} onRestore={restore} />);
    semEscopo.rerender(<QuoteAutoSave data={{ notes: 'rascunho sintético' }} onRestore={restore} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(2100); });
    expect(Object.keys(localStorage)).toHaveLength(0);
    semEscopo.unmount();

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
    expect(restore).not.toHaveBeenCalled();
    render(<QuoteAutoSave scopeId="ator-sintetico" quoteId="orcamento-sintetico" data={{ notes: '' }} onRestore={restore} />);
    expect(restore).toHaveBeenCalledWith({ notes: 'sessão anterior' });
  });

  it('lacuna corrigida: percorre todas as páginas respeitando o total, não só a primeira', async () => {
    listOrders.mockResolvedValue({
      orders: Array.from({ length: 200 }, (_, id) => ({ id: String(id), status: 'draft' })),
      total: 450,
    });
    expect(await listSicoobLogisticsTracking()).toEqual([]);
    expect(listOrders).toHaveBeenCalledTimes(3);
    expect(listOrders).toHaveBeenNthCalledWith(1, expect.objectContaining({ page: 1, pageSize: 200 }));
    expect(listOrders).toHaveBeenNthCalledWith(3, expect.objectContaining({ page: 3, pageSize: 200 }));
    expect(from).not.toHaveBeenCalled();
  });

  it('lacuna corrigida: update() não troca a versão silenciosamente — exige expectedRowVersion explícito do chamador', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { id: 'q' }, error: null });
    Object.assign((await import('@/integrations/supabase/client')).supabase, { rpc });
    vi.spyOn(QuoteService, 'getById').mockResolvedValue({ id: 'q', row_version: 7, items: [] } as any);
    // Sem expectedRowVersion: recusa em vez de usar o row_version do formulário (1) ou trocar
    // silenciosamente pelo recém-lido (7) — a lacuna original fazia a troca sem avisar ninguém.
    await expect(QuoteService.update({ quoteId: 'q', quote: { row_version: 1 }, items: [], userId: 'ator' } as any))
      .rejects.toThrow('A versão do orçamento não está disponível');
    expect(rpc).not.toHaveBeenCalled();
    // Com expectedRowVersion explícito, grava normalmente — a versão é responsabilidade do chamador.
    await QuoteService.update({ quoteId: 'q', quote: { row_version: 1 }, items: [], userId: 'ator', expectedRowVersion: 7 });
    expect(rpc).toHaveBeenCalledWith('save_quote_atomic', expect.objectContaining({ p_expected_row_version: 7 }));
  });

  it('duas criações sem idempotencyKey (contornando o tipo) ainda viram 2 RPCs idênticas — defesa só em tempo de compilação', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { id: 'q' }, error: null });
    Object.assign((await import('@/integrations/supabase/client')).supabase, { rpc });
    // idempotencyKey é obrigatório na assinatura de create() — TS recusa compilar sem ele. Este
    // teste contorna isso de propósito (as any) para checar se há alguma defesa em runtime
    // também: não há — as duas chamadas produzem o mesmo payload (p_idempotency_key: undefined).
    const entrada = { quote: { status: 'draft' as const }, items: [], userId: 'ator', orgId: null } as any;
    await QuoteService.create(entrada);
    await QuoteService.create(entrada);
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc.mock.calls[0]![1]).toEqual(rpc.mock.calls[1]![1]);
    expect((rpc.mock.calls[0]![1] as Record<string, unknown>).p_idempotency_key).toBeUndefined();
  });

  it('lacuna corrigida: a chave de previsão agora varia com a quantidade — não reaproveita cache desatualizado ao trocar unidades', () => {
    const base = { id: 'produto', name: 'Caneca', quantity: 1 } as KitItem;
    const antes = useKitStockForecast([base], 10) as unknown as { queryKey: unknown[] };
    const depois = useKitStockForecast([{ ...base, quantity: 100 }], 10) as unknown as { queryKey: unknown[] };
    expect(antes.queryKey).not.toEqual(depois.queryKey);
    expect(depois.queryKey).toContain('produto:produto:100');
  });
});
