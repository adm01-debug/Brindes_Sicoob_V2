/**
 * "Voltar" do portal: fecha o overlay aberto antes de sair da página, pede
 * confirmação por diálogo do design system nas rotas críticas, e atende o
 * atalho `smart-back` UMA vez, mesmo com várias instâncias do hook montadas.
 *
 * Recuperado da PR #100 (fechada sem merge), com a confirmação ligada ao
 * store global que entrou na #306 em vez do guard de rota, que depende de
 * data router.
 */
import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useSmartNavigation } from '@/hooks/useSmartNavigation';
import { useConfirmDialogStore } from '@/stores/useConfirmDialogStore';
import { useNavigationStore } from '@/stores/useNavigationStore';

function setup(initialPath: string) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>
  );
  const locationRef = { current: '' };
  const { result, unmount } = renderHook(
    () => {
      locationRef.current = useLocation().pathname;
      return useSmartNavigation();
    },
    { wrapper },
  );
  return { result, locationRef, unmount };
}

function openRoleOverlay(role: string) {
  const overlay = document.createElement('div');
  overlay.setAttribute('role', role);
  overlay.setAttribute('data-state', 'open');
  document.body.appendChild(overlay);
  return overlay;
}

function openPopperWrapper(child?: HTMLElement) {
  const wrapper = document.createElement('div');
  wrapper.setAttribute('data-radix-popper-content-wrapper', '');
  if (child) wrapper.appendChild(child);
  document.body.appendChild(wrapper);
  return wrapper;
}

async function goBackAndFlush(result: { current: ReturnType<typeof useSmartNavigation> }) {
  await act(async () => {
    result.current.goBack();
    await Promise.resolve();
  });
}

async function answerConfirm(leave: boolean) {
  await act(async () => {
    const pending = useConfirmDialogStore.getState().request;
    useConfirmDialogStore.getState().resolve(pending?.id, leave);
    await Promise.resolve();
  });
}

describe('useSmartNavigation.goBack', () => {
  beforeEach(() => {
    useNavigationStore.setState({ history: [], direction: 'forward' });
    useConfirmDialogStore.setState({ request: null });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it.each(['dialog', 'alertdialog', 'menu', 'listbox'])(
    'fecha overlay role=%s aberto em vez de navegar',
    (role) => {
      openRoleOverlay(role);
      const { result, locationRef } = setup('/pedidos/123');
      act(() => result.current.goBack());
      expect(locationRef.current).toBe('/pedidos/123');
    },
  );

  it('fecha conteúdo popper (select/popover) aberto em vez de navegar', () => {
    openPopperWrapper();
    const { result, locationRef } = setup('/pedidos/123');
    act(() => result.current.goBack());
    expect(locationRef.current).toBe('/pedidos/123');
  });

  it('tooltip aberto NÃO bloqueia a navegação', async () => {
    const tooltip = document.createElement('div');
    tooltip.setAttribute('role', 'tooltip');
    openPopperWrapper(tooltip);
    const { result, locationRef } = setup('/pedidos/123');
    await goBackAndFlush(result);
    expect(locationRef.current).toBe('/pedidos');
  });

  it('navega para o pai hierárquico quando não há histórico', async () => {
    const { result, locationRef } = setup('/pedidos/123');
    await goBackAndFlush(result);
    expect(locationRef.current).toBe('/pedidos');
  });

  it('rota crítica pede confirmação no diálogo global, não no window.confirm', async () => {
    const { result, locationRef } = setup('/simulador');

    act(() => result.current.goBack());
    expect(useConfirmDialogStore.getState().request?.title).toBe('Sair sem salvar?');

    await answerConfirm(false);
    expect(locationRef.current).toBe('/simulador');

    act(() => result.current.goBack());
    await answerConfirm(true);
    expect(locationRef.current).toBe('/');
  });

  it('force=true ignora overlay e confirmação', async () => {
    openRoleOverlay('dialog');
    const { result, locationRef } = setup('/simulador');
    await act(async () => {
      result.current.goBack(undefined, true);
      await Promise.resolve();
    });
    expect(useConfirmDialogStore.getState().request).toBeNull();
    expect(locationRef.current).toBe('/');
  });

  it('smart-back com duas instâncias montadas volta um passo, não dois', async () => {
    // BackButton, Breadcrumbs e useSwipeBack instanciam o hook ao mesmo tempo:
    // cada um registrava o seu listener e um único atalho voltava N passos.
    const primeira = setup('/pedidos/123/itens');
    const segunda = setup('/pedidos/123/itens');

    await act(async () => {
      window.dispatchEvent(new CustomEvent('smart-back'));
      await Promise.resolve();
    });

    expect(segunda.locationRef.current).toBe('/pedidos/123');
    primeira.unmount();
    segunda.unmount();
  });
});
