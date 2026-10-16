import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useSmartNavigation } from '@/hooks/useSmartNavigation';
import { getUxMetrics, resetUxMetrics } from '@/lib/uxMetrics';
import { useNavigationStore } from '@/stores/useNavigationStore';

function setup(initialPath: string) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>
  );
  const locationRef = { current: '' };
  const hook = renderHook(() => {
    locationRef.current = useLocation().pathname;
    return useSmartNavigation();
  }, { wrapper });
  return { ...hook, locationRef };
}

function explicitOverlay(hidden = false) {
  const overlay = document.createElement('div');
  overlay.dataset.navigationOverlay = 'blocking';
  if (hidden) overlay.setAttribute('aria-hidden', 'true');
  document.body.appendChild(overlay);
  return overlay;
}

describe('useSmartNavigation', () => {
  beforeEach(() => {
    useNavigationStore.setState({ history: [], direction: 'forward' });
    resetUxMetrics();
  });
  afterEach(() => { document.body.innerHTML = ''; });

  it('fecha o overlay superior antes de navegar', () => {
    explicitOverlay();
    const { result, locationRef } = setup('/pedidos/123');
    act(() => result.current.goBack());
    expect(locationRef.current).toBe('/pedidos/123');
    expect(getUxMetrics()['nav.overlay-dismiss']).toBe(1);
    expect(getUxMetrics()['nav.back']).toBeUndefined();
  });

  it('ignora overlay explícito oculto e navega para o pai', async () => {
    explicitOverlay(true);
    const { result, locationRef } = setup('/pedidos/123');
    await act(async () => { result.current.goBack(); await Promise.resolve(); });
    expect(locationRef.current).toBe('/pedidos');
    expect(getUxMetrics()['nav.back']).toBe(1);
  });

  it('mantém somente a instância montada mais recentemente no evento global', async () => {
    const first = setup('/primeiro/detalhe');
    const second = setup('/segundo/detalhe');
    await act(async () => { window.dispatchEvent(new Event('smart-back')); await Promise.resolve(); });
    expect(first.locationRef.current).toBe('/primeiro/detalhe');
    expect(second.locationRef.current).toBe('/segundo');
    second.unmount();
    await act(async () => { window.dispatchEvent(new Event('smart-back')); await Promise.resolve(); });
    expect(first.locationRef.current).toBe('/primeiro');
  });
});
