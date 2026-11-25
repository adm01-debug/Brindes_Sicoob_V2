/**
 * Sair do montador com trabalho que não chegou ao banco.
 *
 * O autosave cobre o caso normal, mas não a janela do debounce nem — o que
 * importa de verdade — o autosave que falhou ou bateu em conflito: nesse
 * estado o kit existe só na tela. Antes desta guarda, só `QuoteBuilderPage`
 * avisava; fechar a aba em `/montar-kit` apagava o trabalho em silêncio.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { useScreenDirtyState } from '@/hooks/useScreenDirtyState';
import { rotaEstaSuja, rotaTemEstadoDeclarado } from '@/lib/navigation/dirty-registry';

function dispararBeforeUnload(): boolean {
  const evento = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(evento);
  return evento.defaultPrevented;
}

describe('guarda de saída do montador de kit', () => {
  afterEach(() => vi.restoreAllMocks());

  it('segura a saída quando o autosave falhou', () => {
    renderHook(() => useUnsavedChangesGuard({ hasUnsavedChanges: true, message: 'falhou' }));
    expect(dispararBeforeUnload()).toBe(true);
  });

  it('nao atrapalha quando tudo esta salvo', () => {
    renderHook(() => useUnsavedChangesGuard({ hasUnsavedChanges: false }));
    expect(dispararBeforeUnload()).toBe(false);
  });

  it('para de segurar assim que o estado deixa de ter pendencia', () => {
    const { rerender } = renderHook(
      ({ pendente }) => useUnsavedChangesGuard({ hasUnsavedChanges: pendente }),
      { initialProps: { pendente: true } },
    );
    expect(dispararBeforeUnload()).toBe(true);

    rerender({ pendente: false });
    expect(dispararBeforeUnload()).toBe(false);
  });

  it('segura a saida por dentro do app (Biblioteca) ate a confirmacao', () => {
    // `beforeunload` nao alcanca navegacao do SPA: o botao "Biblioteca" do
    // cabecalho sai da tela por `guardNavigation`, e era por ali que a edicao
    // do template se perdia sem pergunta.
    const acao = vi.fn();
    const { result } = renderHook(() => useUnsavedChangesGuard({ hasUnsavedChanges: true }));

    act(() => result.current.guardNavigation(acao));
    expect(acao).not.toHaveBeenCalled();
    expect(result.current.showDialog).toBe(true);

    act(() => result.current.confirmLeave());
    expect(acao).toHaveBeenCalledTimes(1);
    expect(result.current.showDialog).toBe(false);
  });

  it('descarta o trabalho local so quando o usuario confirma sair', () => {
    const descartar = vi.fn();
    const { result } = renderHook(() =>
      useUnsavedChangesGuard({ hasUnsavedChanges: true, aoDescartar: descartar }),
    );

    act(() => result.current.guardNavigation(vi.fn()));
    act(() => result.current.cancelLeave());
    expect(descartar).not.toHaveBeenCalled();

    act(() => result.current.guardNavigation(vi.fn()));
    act(() => result.current.confirmLeave());
    expect(descartar).toHaveBeenCalledTimes(1);
  });

  it('sai direto quando nao ha nada pendente', () => {
    const acao = vi.fn();
    const { result } = renderHook(() => useUnsavedChangesGuard({ hasUnsavedChanges: false }));

    act(() => result.current.guardNavigation(acao));
    expect(acao).toHaveBeenCalledTimes(1);
    expect(result.current.showDialog).toBe(false);
  });

  it('declara o estado da rota para o voltar global consultar', () => {
    // O voltar do app decide pelo registro de rota; sem esta declaracao a tela
    // ficava fora das rotas criticas e o voltar saia sem perguntar.
    const { unmount } = renderHook(() => useScreenDirtyState(true, 'pendente'), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/montar-kit']}>{children}</MemoryRouter>
      ),
    });

    expect(rotaTemEstadoDeclarado('/montar-kit')).toBe(true);
    expect(rotaEstaSuja('/montar-kit')).toBe(true);

    unmount();
    expect(rotaTemEstadoDeclarado('/montar-kit')).toBe(false);
  });
});
