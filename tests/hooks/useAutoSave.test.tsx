import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/telemetry/structuredLogger', () => ({
  createClientLogger: () => ({ info: vi.fn(), error: vi.fn() }),
}));

import { useAutoSave } from '@/hooks/useAutoSave';

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
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
    rerender({ key: 'draft-b', data: { title: 'Rascunho B' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });

    expect(localStorage.getItem('autosave_draft-a')).toBe(JSON.stringify({ title: 'Rascunho A' }));
    expect(localStorage.getItem('autosave_draft-b')).toBe(JSON.stringify({ title: 'Rascunho B' }));
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
    expect(localStorage.getItem('autosave_draft-error')).toBe(JSON.stringify({ title: 'Tentativa nova' }));
  });
});
