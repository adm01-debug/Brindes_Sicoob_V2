/**
 * Catraca: o "Salvar" manual do Kit Builder não pode apagar em silêncio o que
 * outra aba gravou.
 *
 * Origem: `docs/RECUPERACAO/kit-builder.md` (nuance dos itens 3 e 10) — a trava
 * otimista por `updated_at` existia só no autosave; `persistCustomKit` atualiza
 * por `id` + `user_id`, então duas abas no mesmo kit seguiam último-escreve-vence.
 */
import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  insert: vi.fn(),
  lista: vi.fn(),
  updateTerminal: vi.fn(),
  leituraVersao: vi.fn(),
  insertTerminal: vi.fn(),
  toastError: vi.fn(),
}));

/** Cadeia encadeável do Supabase: aceita qualquer `.eq()` e devolve o terminal. */
function cadeia(terminal: ReturnType<typeof vi.fn>) {
  const no: Record<string, unknown> = {};
  no.eq = vi.fn(() => no);
  no.select = vi.fn(() => no);
  no.maybeSingle = terminal;
  no.single = terminal;
  no.order = mocks.lista;
  return no;
}

mocks.update.mockImplementation(() => cadeia(mocks.updateTerminal));
mocks.insert.mockImplementation(() => cadeia(mocks.insertTerminal));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: mocks.update,
      insert: mocks.insert,
      select: vi.fn(() => cadeia(mocks.leituraVersao)),
    })),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'usuario-1' } }),
}));

vi.mock('sonner', () => ({ toast: { error: mocks.toastError, success: vi.fn() } }));

import { useCustomKitPersistence } from '@/hooks/useCustomKitPersistence';

const kitState = {
  name: 'Kit', kitType: 'montado' as const,
  box: { id: 'caixa-1', name: 'Caixa', sku: 'CX-1', imageUrl: null, price: 0, internalWidth: 1, internalHeight: 1, internalDepth: 1, internalVolume: 1 },
  items: [],
  personalization: { box: { enabled: false }, items: {} }, totalItemsVolume: 0,
  availableVolume: 0, volumeUsagePercent: 0, totalWeight: 0, boxPrice: 0,
  itemsPrice: 0, personalizationPrice: 0, totalPrice: 0, isValid: false,
  validationErrors: [],
};

function envolver() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

/** Filtros `.eq()` usados no n-esimo UPDATE. */
function filtrosDoUpdate(n: number): unknown[][] {
  const no = mocks.update.mock.results[n]?.value as { eq: { mock: { calls: unknown[][] } } };
  return no.eq.mock.calls;
}

describe('useCustomKitPersistence — trava do salvamento manual', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.lista.mockResolvedValue({ data: [], error: null });
  });

  it('recusa o "Salvar" quando outra aba gravou depois da abertura', async () => {
    mocks.updateTerminal.mockResolvedValue({ data: null, error: null });
    mocks.leituraVersao.mockResolvedValue({ data: { updated_at: 'v2' }, error: null });

    const { result } = renderHook(() => useCustomKitPersistence(), { wrapper: envolver() });

    await act(async () => {
      await expect(
        result.current.saveKit(kitState, 1, 'kit-1', 'v1'),
      ).rejects.toThrow(/alterado em outro lugar/);
    });

    expect(filtrosDoUpdate(0)).toContainEqual(['updated_at', 'v1']);
  });

  it('grava contra a versão conhecida e devolve a versão nova', async () => {
    mocks.updateTerminal.mockResolvedValue({
      data: { id: 'kit-1', updated_at: 'v2' }, error: null,
    });

    const { result } = renderHook(() => useCustomKitPersistence(), { wrapper: envolver() });

    let salvo: { id: string; updated_at: string | null } | undefined;
    await act(async () => {
      salvo = await result.current.saveKit(kitState, 1, 'kit-1', 'v1');
    });

    expect(salvo).toEqual({ id: 'kit-1', updated_at: 'v2' });
    expect(filtrosDoUpdate(0)).toContainEqual(['updated_at', 'v1']);
  });

  it('sem versão conhecida (kit novo nesta aba) não trava a gravação', async () => {
    mocks.updateTerminal.mockResolvedValue({
      data: { id: 'kit-1', updated_at: 'v1' }, error: null,
    });

    const { result } = renderHook(() => useCustomKitPersistence(), { wrapper: envolver() });

    await act(async () => {
      await result.current.saveKit(kitState, 1, 'kit-1');
    });

    expect(filtrosDoUpdate(0).map(([campo]) => campo)).not.toContain('updated_at');
  });
});
