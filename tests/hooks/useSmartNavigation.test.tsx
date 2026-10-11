import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useSmartNavigation } from '@/hooks/useSmartNavigation';
import { useNavigationGuardStore } from '@/stores/useNavigationGuardStore';
import { useNavigationStore } from '@/stores/useNavigationStore';

function setup(initialPath: string) {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>
  );
  const locationRef = { current: '' };
  const { result } = renderHook(
    () => {
      const location = useLocation();
      locationRef.current = location.pathname;
      return useSmartNavigation();
    },
    { wrapper },
  );
  return { result, locationRef };
}

function openFakeOverlay(role = 'dialog') {
  const overlay = document.createElement('div');
  overlay.setAttribute('role', role);
  overlay.setAttribute('data-state', 'open');
  document.body.appendChild(overlay);
  return overlay;
}

describe('useSmartNavigation.goBack', () => {
  beforeEach(() => {
    useNavigationStore.setState({ history: [], direction: 'forward' });
    useNavigationGuardStore.setState({ request: null });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('fecha dialog aberto em vez de navegar', () => {
    const dialog = openFakeOverlay('dialog');
    const { result, locationRef } = setup('/pedidos/123');

    act(() => result.current.goBack());

    expect(locationRef.current).toBe('/pedidos/123');
    expect(document.querySelector('[data-state="open"]')).toBe(dialog);
  });

  it('fecha dropdown/menu aberto em vez de navegar', () => {
    openFakeOverlay('menu');
    const { result, locationRef } = setup('/pedidos/123');

    act(() => result.current.goBack());

    expect(locationRef.current).toBe('/pedidos/123');
  });

  it('fecha conteúdo popper (select/popover) aberto em vez de navegar', () => {
    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-radix-popper-content-wrapper', '');
    document.body.appendChild(wrapper);
    const { result, locationRef } = setup('/pedidos/123');

    act(() => result.current.goBack());

    expect(locationRef.current).toBe('/pedidos/123');
  });

  it('navega para o pai hierárquico quando não há histórico', async () => {
    const { result, locationRef } = setup('/pedidos/123');

    await act(async () => {
      result.current.goBack();
      await Promise.resolve();
    });

    expect(locationRef.current).toBe('/pedidos');
  });

  it('em rota crítica, pede confirmação no guard global e respeita o cancelamento', async () => {
    const { result, locationRef } = setup('/simulador');

    act(() => result.current.goBack());
    expect(useNavigationGuardStore.getState().request).not.toBeNull();

    await act(async () => {
      useNavigationGuardStore.getState().resolve(false);
      await Promise.resolve();
    });
    expect(locationRef.current).toBe('/simulador');

    act(() => result.current.goBack());
    await act(async () => {
      useNavigationGuardStore.getState().resolve(true);
      await Promise.resolve();
    });
    expect(locationRef.current).toBe('/');
  });

  it('force=true ignora dialog e confirmação', async () => {
    openFakeOverlay('dialog');
    const { result, locationRef } = setup('/simulador');

    await act(async () => {
      result.current.goBack(undefined, true);
      await Promise.resolve();
    });

    expect(useNavigationGuardStore.getState().request).toBeNull();
    expect(locationRef.current).toBe('/');
  });
});
