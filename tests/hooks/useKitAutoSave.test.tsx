import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';

const maybeSingle = vi.fn();
const select = vi.fn(() => ({ maybeSingle }));
const secondEq = vi.fn(() => ({ select }));
const update = vi.fn(() => ({
  eq: vi.fn(() => ({ eq: secondEq })),
}));
const single = vi.fn();
const insert = vi.fn(() => ({
  select: vi.fn(() => ({ single })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(() => ({ update, insert })) },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'usuario-1' } }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}));

vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn() } }));

import { useKitAutoSave } from '@/hooks/useKitAutoSave';

const initialKit = {
  name: 'Kit', kitType: 'montado' as const,
  box: { id: 'caixa-1', name: 'Caixa', sku: 'CX-1', imageUrl: null, price: 0, internalWidth: 1, internalHeight: 1, internalDepth: 1, internalVolume: 1 },
  items: [],
  personalization: { box: { enabled: false }, items: {} }, totalItemsVolume: 0,
  availableVolume: 0, volumeUsagePercent: 0, totalWeight: 0, boxPrice: 0,
  itemsPrice: 0, personalizationPrice: 0, totalPrice: 0, isValid: false,
  validationErrors: [],
};

describe('useKitAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => vi.useRealTimers());

  it('não confirma salvamento quando o Supabase retorna erro e permite nova tentativa', async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: new Error('banco indisponível') });
    maybeSingle.mockResolvedValueOnce({ data: { id: 'kit-1' }, error: null });

    const { result, rerender } = renderHook(
      ({ kit }) => useKitAutoSave(kit, 1, 'kit-1'),
      { initialProps: { kit: initialKit } },
    );

    rerender({ kit: { ...initialKit, name: 'Kit atualizado' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });

    expect(result.current.lastSaveError).toContain('banco indisponível');
    expect(result.current.lastSavedAt).toBeNull();

    await act(async () => { result.current.retry(); await Promise.resolve(); });
    expect(result.current.lastSaveError).toBeNull();
    expect(result.current.lastSavedAt).toBeInstanceOf(Date);
  });

  it('trata zero linhas atualizadas como falha de permissão ou concorrência', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });

    const { result, rerender } = renderHook(
      ({ kit }) => useKitAutoSave(kit, 1, 'kit-inexistente'),
      { initialProps: { kit: initialKit } },
    );

    rerender({ kit: { ...initialKit, name: 'Alteração sem persistência' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });

    expect(result.current.lastSaveError).toContain('não foi encontrado');
    expect(result.current.lastSavedAt).toBeNull();
  });

  it('serializa gravações concorrentes e persiste por último o estado mais recente', async () => {
    let resolveFirst: ((value: { data: { id: string }; error: null }) => void) | undefined;
    maybeSingle.mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve; }));
    maybeSingle.mockResolvedValueOnce({ data: { id: 'kit-1' }, error: null });

    const { result, rerender } = renderHook(
      ({ kit }) => useKitAutoSave(kit, 1, 'kit-1'),
      { initialProps: { kit: initialKit } },
    );

    rerender({ kit: { ...initialKit, name: 'Primeira alteração' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    expect(update).toHaveBeenCalledTimes(1);

    rerender({ kit: { ...initialKit, name: 'Estado mais recente' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    expect(update).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFirst?.({ data: { id: 'kit-1' }, error: null });
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(update).toHaveBeenCalledTimes(2);
    expect(update.mock.calls[1]?.[0]).toMatchObject({ name: 'Estado mais recente' });
    expect(result.current.lastSaveError).toBeNull();
  });

  it('preserva a edição enfileirada quando o pai adota o ID recém-criado', async () => {
    let resolveCreation: ((value: { data: { id: string }; error: null }) => void) | undefined;
    single.mockImplementationOnce(() => new Promise(resolve => { resolveCreation = resolve; }));
    maybeSingle.mockResolvedValueOnce({ data: { id: 'kit-criado' }, error: null });

    const { result, rerender } = renderHook(
      ({ kit }) => {
        const [kitId, setKitId] = useState<string>();
        return {
          kitId,
          autoSave: useKitAutoSave(kit, 1, kitId, setKitId),
        };
      },
      { initialProps: { kit: initialKit } },
    );

    rerender({ kit: { ...initialKit, name: 'Estado inicial enviado' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    expect(insert).toHaveBeenCalledTimes(1);

    rerender({ kit: { ...initialKit, name: 'Edição feita durante a criação' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    expect(update).not.toHaveBeenCalled();

    await act(async () => {
      resolveCreation?.({ data: { id: 'kit-criado' }, error: null });
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.kitId).toBe('kit-criado');
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0]?.[0]).toMatchObject({ name: 'Edição feita durante a criação' });
    expect(result.current.autoSave.lastSaveError).toBeNull();
  });
});
