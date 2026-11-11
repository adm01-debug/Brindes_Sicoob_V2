// Sondas de auditoria: passar significa reproduzir a lacuna descrita, não aprovar a funcionalidade.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useAutoSave } from '@/hooks/useAutoSave';

vi.mock('@/lib/telemetry/structuredLogger', () => ({
  createClientLogger: () => ({ info: vi.fn(), error: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  localStorage.clear();
});

describe('Reprodução de lacunas no rascunho local de orçamento', () => {
  it('a mesma chave new restaura o rascunho da montagem anterior sem identificar usuário', async () => {
    vi.useFakeTimers();
    const anterior = renderHook(({ data }) => useAutoSave({ key: 'new', data }), {
      initialProps: { data: { clientId: '', internalNotes: '' } },
    });
    anterior.rerender({ data: { clientId: 'cliente-sintetico-a', internalNotes: 'nota-sintetica-a' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(2100); });
    anterior.unmount();
    // Outra montagem não recebe identidade, como o call-site QuoteAutoSave atual.
    const seguinte = renderHook(() => useAutoSave({ key: 'new', data: { clientId: '', internalNotes: '' } }));
    expect(seguinte.result.current.restore()).toEqual({ clientId: 'cliente-sintetico-a', internalNotes: 'nota-sintetica-a' });
  });

  it('lacuna corrigida: falha do armazenamento agora expõe lastError ao consumidor do hook', async () => {
    vi.useFakeTimers();
    const onSave = vi.fn();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota-sintetica'); });
    const hook = renderHook(({ data }) => useAutoSave({ key: 'new', data, onSave }), {
      initialProps: { data: { notes: '' } },
    });
    hook.rerender({ data: { notes: 'rascunho-sintetico' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(2100); });
    expect(onSave).not.toHaveBeenCalled();
    expect(Object.keys(hook.result.current).sort()).toEqual(['clear', 'lastError', 'lastSaved', 'restore']);
    expect(hook.result.current.lastError).toBeInstanceOf(Error);
    expect((hook.result.current.lastError as Error).message).toContain('quota-sintetica');
    expect(localStorage.getItem('autosave_new')).toBeNull();
  });
});
