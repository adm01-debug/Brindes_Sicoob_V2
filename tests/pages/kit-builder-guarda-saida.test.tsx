/**
 * Sair do montador com trabalho que não chegou ao banco.
 *
 * O autosave cobre o caso normal, mas não a janela do debounce nem — o que
 * importa de verdade — o autosave que falhou ou bateu em conflito: nesse
 * estado o kit existe só na tela. Antes desta guarda, só `QuoteBuilderPage`
 * avisava; fechar a aba em `/montar-kit` apagava o trabalho em silêncio.
 */
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';

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
});
