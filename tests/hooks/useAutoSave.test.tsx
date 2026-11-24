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
    // Id de aba fixo: sem isso o primeiro salvamento grava no sessionStorage e
    // consome o mock de `setItem` usado nos testes de falha de persistência.
    sessionStorage.setItem('autosave-tab-id', 'aba-teste');
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

  it('grava o rascunho pendente quando a persistência é desligada', async () => {
    // Envio (ou aprovação) do orçamento torna a tela não editável e desliga o
    // rascunho automático. A edição feita durante a chamada ainda não tinha
    // entrado no intervalo de 2s: precisa ser gravada antes de parar.
    const onSave = vi.fn();
    const { rerender } = renderHook(
      ({ data, enabled }) => useAutoSave({ key: 'draft-desligado', data, enabled, onSave }),
      { initialProps: { data: { items: 10 }, enabled: true } },
    );

    rerender({ data: { items: 12 }, enabled: true });
    rerender({ data: { items: 12 }, enabled: false });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });

    expect(JSON.parse(localStorage.getItem('autosave_draft-desligado')!)).toMatchObject({
      version: 1,
      data: { items: 12 },
    });
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('grava a volta ao valor inicial quando ela acontece durante o envio', async () => {
    // A referência do rascunho é a última gravação, não o valor que foi enviado:
    // se o usuário voltou de 120 para 100 durante a chamada, o rascunho precisa
    // refletir a tela (100), senão a restauração traz uma quantidade que ele já
    // tinha desfeito.
    const { rerender } = renderHook(
      ({ data, enabled }) => useAutoSave({ key: 'draft-volta', data, enabled }),
      { initialProps: { data: { quantity: 100 }, enabled: true } },
    );

    rerender({ data: { quantity: 120 }, enabled: true });
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    expect(JSON.parse(localStorage.getItem('autosave_draft-volta')!)).toMatchObject({
      data: { quantity: 120 },
    });

    rerender({ data: { quantity: 100 }, enabled: true });
    rerender({ data: { quantity: 100 }, enabled: false });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });

    expect(JSON.parse(localStorage.getItem('autosave_draft-volta')!)).toMatchObject({
      data: { quantity: 100 },
    });
  });

  it('grava a tela atual quando a gravação anterior ainda está em curso', async () => {
    // Gravação lenta (envio em curso) + vendedor voltando ao valor anterior +
    // tela desligando: comparar com a última gravação *concluída* engoliria o
    // flush e o rascunho ficaria com o valor que ele já tinha desfeito.
    const pendentes: Array<() => void> = [];
    const onSave = vi.fn(
      () => new Promise<void>((resolve) => { pendentes.push(resolve); }),
    );
    const { rerender } = renderHook(
      ({ data, enabled }) => useAutoSave({ key: 'draft-em-curso', data, enabled, onSave }),
      { initialProps: { data: { quantity: 100 }, enabled: true } },
    );

    rerender({ data: { quantity: 120 }, enabled: true });
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    expect(onSave).toHaveBeenCalledTimes(1);

    rerender({ data: { quantity: 100 }, enabled: true });
    rerender({ data: { quantity: 100 }, enabled: false });
    await act(async () => { pendentes.shift()?.(); await vi.advanceTimersByTimeAsync(0); });
    await act(async () => { pendentes.shift()?.(); await vi.advanceTimersByTimeAsync(0); });

    expect(onSave).toHaveBeenCalledTimes(2);
    expect(JSON.parse(localStorage.getItem('autosave_draft-em-curso')!)).toMatchObject({
      data: { quantity: 100 },
    });
  });

  it('não trata como conflito o rascunho apagado por outra sessão', async () => {
    // A outra aba confirmou o descarte e apagou a chave. Aqui não há dado de
    // ninguém a proteger: gravar de novo é a resposta certa, e avisar conflito
    // pararia o rascunho desta aba para sempre.
    const onError = vi.fn();
    const { rerender } = renderHook(
      ({ data }) => useAutoSave({ key: 'draft-apagado', data, onError }),
      { initialProps: { data: { items: 1 } } },
    );

    rerender({ data: { items: 2 } });
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    expect(localStorage.getItem('autosave_draft-apagado')).not.toBeNull();

    localStorage.removeItem('autosave_draft-apagado');
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'autosave_draft-apagado',
        newValue: null,
        storageArea: localStorage,
      }),
    );
    rerender({ data: { items: 3 } });
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });

    expect(onError).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem('autosave_draft-apagado')!)).toMatchObject({
      data: { items: 3 },
    });
  });

  it('não grava nada ao desligar quando não há alteração pendente', async () => {
    const onSave = vi.fn();
    const { rerender } = renderHook(
      ({ enabled }) => useAutoSave({ key: 'draft-limpo', data: { items: 1 }, enabled, onSave }),
      { initialProps: { enabled: true } },
    );

    rerender({ enabled: false });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });

    expect(localStorage.getItem('autosave_draft-limpo')).toBeNull();
    expect(onSave).not.toHaveBeenCalled();
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

  it('continua sem quebrar quando o navegador bloqueia o acesso ao sessionStorage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Acesso ao armazenamento bloqueado', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Acesso ao armazenamento bloqueado', 'SecurityError');
    });

    expect(() => getQuoteDraftIdForScope('usuario-sem-storage')).not.toThrow();
    expect(getQuoteDraftIdForScope('usuario-sem-storage')).toMatch(/^[0-9a-f-]{36}$|^\d+-[a-z0-9]+$/i);
  });
});
