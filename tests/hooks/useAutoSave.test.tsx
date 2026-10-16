import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/telemetry/structuredLogger', () => ({
  createClientLogger: () => ({ info: vi.fn(), error: vi.fn() }),
}));

import { useAutoSave } from '@/hooks/useAutoSave';
import { getQuoteDraftIdForScope } from '@/components/quotes/QuoteAutoSave';

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('persiste apenas no namespace informado, preservando rascunhos simultâneos', async () => {
    const { rerender } = renderHook(
      ({ key, data }) => useAutoSave({ key, data }),
      { initialProps: { key: 'draft-a', data: { title: 'Inicial' } } },
    );

    rerender({ key: 'draft-a', data: { title: 'Rascunho A' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    rerender({ key: 'draft-b', data: { title: 'Inicial B' } });
    rerender({ key: 'draft-b', data: { title: 'Rascunho B' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });

    expect(JSON.parse(localStorage.getItem('autosave_draft-a')!)).toMatchObject({ version: 1, data: { title: 'Rascunho A' } });
    expect(JSON.parse(localStorage.getItem('autosave_draft-b')!)).toMatchObject({ version: 1, data: { title: 'Rascunho B' } });
  });

  it('reinicia a comparação ao trocar de rascunho e não cruza payload idêntico', async () => {
    const { rerender } = renderHook(
      ({ key, data }) => useAutoSave({ key, data }),
      { initialProps: { key: 'quote-a', data: { title: 'Mesmo conteúdo' } } },
    );

    rerender({ key: 'quote-b', data: { title: 'Mesmo conteúdo' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });

    expect(localStorage.getItem('autosave_quote-a')).toBeNull();
    expect(localStorage.getItem('autosave_quote-b')).toBeNull();
  });

  it('expõe falha de persistência para a interface e permite nova tentativa', async () => {
    const onError = vi.fn();
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
      .mockImplementationOnce(() => { throw new Error('quota excedida'); });
    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave({ key: 'draft-error', data, onError }),
      { initialProps: { data: { title: 'Inicial' } } },
    );

    rerender({ data: { title: 'Alterado' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });

    expect(result.current.lastError?.message).toBe('quota excedida');
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'quota excedida' }));

    rerender({ data: { title: 'Tentativa nova' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });

    expect(setItem).toHaveBeenCalledTimes(2);
    expect(result.current.lastError).toBeNull();
    expect(JSON.parse(localStorage.getItem('autosave_draft-error')!)).toMatchObject({ version: 1, data: { title: 'Tentativa nova' } });
  });

  it('restaura rascunho legado e descarta envelope vencido', () => {
    localStorage.setItem('autosave_legado', JSON.stringify({ title: 'compatível' }));
    localStorage.setItem('autosave_vencido', JSON.stringify({
      version: 1,
      savedAt: '2020-01-01T00:00:00.000Z',
      data: { title: 'expirado' },
    }));

    const legacy = renderHook(() => useAutoSave({ key: 'legado', data: {} }));
    const expired = renderHook(() => useAutoSave({ key: 'vencido', data: {} }));

    expect(legacy.result.current.restore()).toEqual({ title: 'compatível' });
    expect(expired.result.current.restore()).toBeNull();
  });

  it('grava a última alteração ao desmontar antes do debounce', () => {
    const { rerender, unmount } = renderHook(
      ({ data }) => useAutoSave({ key: 'draft-unmount', data, interval: 2_000 }),
      { initialProps: { data: { title: 'Inicial' } } },
    );

    rerender({ data: { title: 'Última edição' } });
    unmount();

    expect(JSON.parse(localStorage.getItem('autosave_draft-unmount')!)).toMatchObject({
      version: 1,
      data: { title: 'Última edição' },
    });
  });

  it('mantém o mesmo rascunho novo por sessão e o separa por usuário', () => {
    const firstUserDraft = getQuoteDraftIdForScope('usuario-1');

    expect(getQuoteDraftIdForScope('usuario-1')).toBe(firstUserDraft);
    expect(getQuoteDraftIdForScope('usuario-2')).not.toBe(firstUserDraft);
  });
});
