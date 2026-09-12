import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDevGate } from '@/hooks/useDevGate';
import { devInfraGate } from '@/lib/system/dev-gate/DevInfraGate';

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock devInfraGate.shouldShow
vi.mock('@/lib/system/dev-gate/DevInfraGate', () => ({
  devInfraGate: {
    shouldShow: vi.fn(),
    subscribe: vi.fn(() => () => {}),
  },
}));

describe('useDevGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar isAllowed true se devInfraGate.shouldShow retornar true', () => {
    mockUseAuth.mockReturnValue({ roles: ['dev'], isDev: true, isLoading: false });
    vi.mocked(devInfraGate.shouldShow).mockReturnValue(true);

    const { result } = renderHook(() => useDevGate());
    const { isAllowed, isDev } = result.current;

    expect(isAllowed).toBe(true);
    expect(isDev).toBe(true);
    expect(devInfraGate.shouldShow).toHaveBeenCalledWith(['dev']);
  });

  it('deve retornar isAllowed false se devInfraGate.shouldShow retornar false', () => {
    mockUseAuth.mockReturnValue({ roles: [], isDev: false, isLoading: false });
    vi.mocked(devInfraGate.shouldShow).mockReturnValue(false);

    const { result } = renderHook(() => useDevGate());
    const { isAllowed, isDev } = result.current;

    expect(isAllowed).toBe(false);
    expect(isDev).toBe(false);
    expect(devInfraGate.shouldShow).toHaveBeenCalledWith([]);
  });

  it('deve refletir o status isDev corretamente mesmo quando isAllowed é forçado', () => {
    mockUseAuth.mockReturnValue({ roles: [], isDev: false, isLoading: false });
    vi.mocked(devInfraGate.shouldShow).mockReturnValue(true); // Forçado por localStorage por exemplo

    const { result } = renderHook(() => useDevGate());
    const { isAllowed, isDev } = result.current;

    expect(isAllowed).toBe(true);
    expect(isDev).toBe(false);
  });
});
