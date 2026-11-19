/**
 * "Atualizar template" no Kit Maker não pode destruir a curadoria do admin.
 *
 * buildTemplatePayload nasceu para CRIAR template, então fixava
 * category: 'Geral' e is_active: true. Usado no UPDATE, um clique em
 * "Atualizar template" reclassificava o template curado e reativava template
 * que o admin tinha desativado — e ele voltava a aparecer para todo vendedor,
 * porque useKitTemplates e useSimilarKits filtram por is_active.
 */
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const single = vi.fn().mockResolvedValue({ data: { id: 'tpl-1' }, error: null });
const select = vi.fn(() => ({ single }));
const eq = vi.fn(() => ({ select }));
const update = vi.fn((_payload: Record<string, unknown>) => ({ eq }));
const insert = vi.fn((_payload: Record<string, unknown>) => ({ select }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(() => ({ update, insert })) },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useTemplateSnapshot } from '@/hooks/useTemplateSnapshot';

const kitState = {
  name: 'Kit de Natal', kitType: 'montado' as const,
  box: { id: 'cx', name: 'Caixa', sku: 'CX', imageUrl: null, price: 1, internalWidth: 1, internalHeight: 1, internalDepth: 1, internalVolume: 1 },
  items: [], personalization: { box: { enabled: false }, items: {} },
  totalItemsVolume: 0, availableVolume: 0, volumeUsagePercent: 10, totalWeight: 0,
  boxPrice: 1, itemsPrice: 0, personalizationPrice: 0, totalPrice: 1,
  isValid: true, validationErrors: [],
} as never;

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useTemplateSnapshot', () => {
  beforeEach(() => vi.clearAllMocks());

  it('atualizar template não reativa template que o admin desativou', async () => {
    const { result } = renderHook(() => useTemplateSnapshot(), { wrapper });

    await act(async () => { await result.current.saveAsTemplate({ kitState, templateId: 'tpl-1' }); });

    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0]?.[0]).not.toHaveProperty('is_active');
  });

  it('atualizar template não reclassifica a categoria curada como "Geral"', async () => {
    const { result } = renderHook(() => useTemplateSnapshot(), { wrapper });

    await act(async () => { await result.current.saveAsTemplate({ kitState, templateId: 'tpl-1' }); });

    expect(update.mock.calls[0]?.[0]).not.toHaveProperty('category');
  });

  it('atualizar template ainda grava o conteúdo do kit', async () => {
    const { result } = renderHook(() => useTemplateSnapshot(), { wrapper });

    await act(async () => { await result.current.saveAsTemplate({ kitState, templateId: 'tpl-1' }); });

    expect(update.mock.calls[0]?.[0]).toMatchObject({
      name: 'Kit de Natal',
      total_price: 1,
      volume_usage_percent: 10,
    });
  });

  it('categoria muda quando o chamador pede explicitamente', async () => {
    const { result } = renderHook(() => useTemplateSnapshot(), { wrapper });

    await act(async () => {
      await result.current.saveAsTemplate({ kitState, templateId: 'tpl-1', category: 'Natal' });
    });

    expect(update.mock.calls[0]?.[0]).toMatchObject({ category: 'Natal' });
    expect(update.mock.calls[0]?.[0]).not.toHaveProperty('is_active');
  });

  it('criar template novo continua nascendo ativo e com categoria padrão', async () => {
    const { result } = renderHook(() => useTemplateSnapshot(), { wrapper });

    await act(async () => { await result.current.saveAsTemplate({ kitState }); });

    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.calls[0]?.[0]).toMatchObject({ is_active: true, category: 'Geral' });
  });
});
