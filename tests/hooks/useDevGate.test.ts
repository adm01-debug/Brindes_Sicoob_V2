import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDevGate } from '@/hooks/useDevGate';
import { useAuth } from '@/contexts/AuthContext';
import { devInfraGate } from '@/lib/system/dev-gate/DevInfraGate';

// Mock do AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

describe('useDevGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    devInfraGate.invalidateCache();
    // Limpar localStorage para garantir isolamento
    localStorage.clear();
    // Reset any spying on devInfraGate.shouldShow
    vi.restoreAllMocks();
  });

  it('should reflect changes from devInfraGate automatically', async () => {
    (useAuth as any).mockReturnValue({ roles: [], isDev: false, isLoading: false });
    
    const { result } = renderHook(() => useDevGate());
    
    // Inicialmente false (não dev e sem override)
    expect(result.current.isAllowed).toBe(false);

    // Simular mudança externa via evento de storage
    act(() => {
      // Mockamos o shouldShow para simular o comportamento após a mudança no storage
      vi.spyOn(devInfraGate, 'shouldShow').mockReturnValue(true);
      
      // Disparar o evento que o DevInfraGate escuta
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'show_dev_infra_messages',
        newValue: 'true'
      }));
    });

    // O hook deve ter atualizado via useSyncExternalStore
    await waitFor(() => expect(result.current.isAllowed).toBe(true));
  });

  it('should react to isDev changes from auth context', () => {
    // Garantir que não há overrides bloqueando
    localStorage.removeItem('show_dev_infra_messages');

    const { rerender, result } = renderHook(
      ({ isDev }) => {
        (useAuth as any).mockReturnValue({ roles: isDev ? ['dev'] : [], isDev, isLoading: false });
        return useDevGate();
      },
      { initialProps: { isDev: false } }
    );

    // Sem override, isAllowed deve seguir isDev
    expect(result.current.isAllowed).toBe(false);

    rerender({ isDev: true });

    expect(result.current.isAllowed).toBe(true);
  });
});
