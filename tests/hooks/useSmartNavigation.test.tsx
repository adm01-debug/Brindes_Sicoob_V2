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
      locationRef.current = useLocation().pathname;
      return useSmartNavigation();
    },
    { wrapper },
  );
  return { result, locationRef };
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

async function answerGuard(leave: boolean) {
  await act(async () => {
    useNavigationGuardStore.getState().resolve(leave);
    await Promise.resolve();
  });
}

describe('useSmartNavigation.goBack', () => {
  beforeEach(() => {
    useNavigationStore.setState({ history: [], direction: 'forward' });
    useNavigationGuardStore.setState({ request: null, dirtyScopes: {} });
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

  it.each([
    ['rota crítica', '/simulador', '/', false],
    ['rota com escopo sujo', '/pedidos/123', '/pedidos', true],
  ])('%s pede confirmação no guard global', async (_label, path, expected, dirty) => {
    if (dirty) {
      useNavigationGuardStore.getState().setDirty('kit-builder', true);
    }
    const { result, locationRef } = setup(path);

    act(() => result.current.goBack());
    expect(useNavigationGuardStore.getState().request).not.toBeNull();

    await answerGuard(false);
    expect(locationRef.current).toBe(path);

    act(() => result.current.goBack());
    await answerGuard(true);
    expect(locationRef.current).toBe(expected);
  });

  it('force=true ignora dialog e confirmação', async () => {
    openRoleOverlay('dialog');
    const { result, locationRef } = setup('/simulador');
    await act(async () => {
      result.current.goBack(undefined, true);
      await Promise.resolve();
    });
    expect(useNavigationGuardStore.getState().request).toBeNull();
    expect(locationRef.current).toBe('/');
  });
});
