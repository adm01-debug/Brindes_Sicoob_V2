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
    rerender({ key: 'draft-b', data: { title: 'Rascunho B' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });

    expect(JSON.parse(localStorage.getItem('autosave_draft-a')!)).toMatchObject({ version: 1, data: { title: 'Rascunho A' } });
    expect(JSON.parse(localStorage.getItem('autosave_draft-b')!)).toMatchObject({ version: 1, data: { title: 'Rascunho B' } });
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

  it('detecta edição concorrente em outra aba e não sobrescreve o rascunho mais recente', async () => {
    const onError = vi.fn();
    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave({ key: 'draft-shared', data, onError }),
      { initialProps: { data: { title: 'Versão carregada' } } },
    );

    rerender({ data: { title: 'Edição desta aba' } });

    const externalDraft = JSON.stringify({
      version: 1,
      savedAt: new Date().toISOString(),
      data: { title: 'Edição da outra aba' },
    });
    localStorage.setItem('autosave_draft-shared', externalDraft);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'autosave_draft-shared',
        newValue: externalDraft,
        storageArea: localStorage,
      }));
    });

    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });

    expect(result.current.lastError?.message).toContain('alterado em outra aba');
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('alterado em outra aba') }));
    expect(JSON.parse(localStorage.getItem('autosave_draft-shared')!)).toMatchObject({
      data: { title: 'Edição da outra aba' },
    });
  });

  it('revalida a revisão armazenada antes de gravar quando o evento entre abas ainda não chegou', async () => {
    const { result, rerender } = renderHook(
      ({ data }) => useAutoSave({ key: 'draft-race', data }),
      { initialProps: { data: { title: 'Versão carregada' } } },
    );

    rerender({ data: { title: 'Edição desta aba' } });
    localStorage.setItem('autosave_draft-race', JSON.stringify({
      version: 1,
      savedAt: new Date().toISOString(),
      data: { title: 'Edição gravada em paralelo' },
    }));

    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });

    expect(result.current.lastError?.message).toContain('alterado em outra aba');
    expect(JSON.parse(localStorage.getItem('autosave_draft-race')!)).toMatchObject({
      data: { title: 'Edição gravada em paralelo' },
    });
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

  it('mantém o mesmo rascunho novo por sessão e o separa por usuário', () => {
    const firstUserDraft = getQuoteDraftIdForScope('usuario-1');

    expect(getQuoteDraftIdForScope('usuario-1')).toBe(firstUserDraft);
    expect(getQuoteDraftIdForScope('usuario-2')).not.toBe(firstUserDraft);
  });
});
