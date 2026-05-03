
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import React from 'react';

// Mock useAuth
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('Admin Permissions & Guards', () => {
  it('should allow access to users for dev role', () => {
    (useAuth as any).mockReturnValue({
      userRoles: ['dev'],
      isDev: true,
      isSupervisor: false,
      isGestorCompras: false,
    });

    const { result } = renderHook(() => useAdminPermissions());
    expect(result.current.canAccessUsers).toBe(true);
    expect(result.current.canAccessTelemetry).toBe(true);
  });

  it('should block telemetry for non-dev roles', () => {
    (useAuth as any).mockReturnValue({
      userRoles: ['supervisor'],
      isDev: false,
      isSupervisor: true,
      isGestorCompras: false,
    });

    const { result } = renderHook(() => useAdminPermissions());
    expect(result.current.canAccessUsers).toBe(true);
    expect(result.current.canAccessTelemetry).toBe(false);
  });

  it('should allow product access for gestor_compras', () => {
    (useAuth as any).mockReturnValue({
      userRoles: ['gestor_compras'],
      isDev: false,
      isSupervisor: false,
      isGestorCompras: true,
    });

    const { result } = renderHook(() => useAdminPermissions());
    expect(result.current.canAccessProducts).toBe(true);
    expect(result.current.canAccessUsers).toBe(false);
  });
});

// Helper to test hooks
function renderHook<T>(hook: () => T) {
  let result: { current: T } = { current: null as any };
  function TestComponent() {
    result.current = hook();
    return null;
  }
  render(<TestComponent />);
  return { result };
}
