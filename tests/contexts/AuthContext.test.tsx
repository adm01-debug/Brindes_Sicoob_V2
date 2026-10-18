import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';

// ── Supabase mock — must be defined inside vi.mock factory ───────────────────
vi.mock('@/integrations/supabase/client', () => {
  const mockFrom = vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        then: vi.fn((cb: any) => cb({ error: null })),
      }),
    }),
  }));

  return {
    supabase: {
      auth: {
        mfa: {
          getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal1' } }),
          listFactors: vi.fn().mockResolvedValue({ data: { totp: [] } }),
        },
        onAuthStateChange: vi.fn((cb: any) => {
          // Store callback in module-scoped variable
          (globalThis as any).__authCb = cb;
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        }),
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        signUp: vi.fn(),
        signInWithPassword: vi.fn(),
        signOut: vi.fn().mockResolvedValue({}),
      },
      from: mockFrom,
      rpc: vi.fn().mockResolvedValue({ data: [{ active: true, reason: 'active' }], error: null }),
    },
  };
});

// Dynamic import to get the mocked module
import { supabase } from '@/integrations/supabase/client';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

// Also mock the prewarm import
vi.mock('@/lib/external-db-prewarm', () => ({
  prewarmExternalDb: vi.fn(),
}));

// ── Test consumer ────────────────────────────────────────────────────────────
function AuthConsumer() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(auth.isLoading)}</span>
      <span data-testid="authenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="role">{auth.role ?? 'none'}</span>
      <span data-testid="isAdmin">{String(auth.isAdmin)}</span>
      <span data-testid="canManage">{String(auth.canManage)}</span>
      <span data-testid="isSeller">{String(auth.isVendedor)}</span>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).__authCb = null;
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null } } as any);
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [{ active: true, reason: 'active' }], error: null } as any);
  });

  it('throws error when useAuth is used outside AuthProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<AuthConsumer />)).toThrow('useAuth must be used within an AuthProvider');
    spy.mockRestore();
  });

  it('starts with isLoading=true then sets false when no session', async () => {
    await act(async () => {
      render(<AuthProvider><AuthConsumer /></AuthProvider>);
    });

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(screen.getByTestId('role').textContent).toBe('none');
  });

  it('sets up auth listener and calls getSession', async () => {
    await act(async () => {
      render(<AuthProvider><AuthConsumer /></AuthProvider>);
    });

    expect(supabase.auth.onAuthStateChange).toHaveBeenCalledTimes(1);
    expect(supabase.auth.getSession).toHaveBeenCalledTimes(1);
  });

  it('authenticates and loads admin role', async () => {
    const mockUser = { id: 'user-1', email: 'admin@test.com' };
    const mockSession = { user: mockUser };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'p1', user_id: 'user-1', email: 'admin@test.com', full_name: 'Admin' },
            error: null,
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              then: vi.fn((cb: any) => { cb({ error: null }); return Promise.resolve(); }),
            }),
          }),
        } as any;
      }
      if (table === 'user_roles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [{ role: 'admin' }], error: null }),
        } as any;
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: null }) } as any;
    });

    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: mockSession } } as any);

    await act(async () => {
      render(<AuthProvider><AuthConsumer /></AuthProvider>);
    });

    // Trigger auth state
    await act(async () => {
      const cb = (globalThis as any).__authCb;
      cb?.('SIGNED_IN', mockSession);
      await new Promise(r => setTimeout(r, 100));
    });

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(screen.getByTestId('isAdmin').textContent).toBe('true');
      expect(screen.getByTestId('canManage').textContent).toBe('true');
    });
  });

  it('carrega perfil e papéis em paralelo com a validação sem liberar acesso antes do RPC', async () => {
    const mockUser = { id: 'user-parallel', email: 'admin@test.com' };
    const mockSession = { user: mockUser };
    let resolveAccess!: (result: unknown) => void;

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { user_id: mockUser.id }, error: null }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        } as any;
      }
      if (table === 'user_roles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [{ role: 'admin' }], error: null }),
        } as any;
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: null }) } as any;
    });
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: mockSession } } as any);
    vi.mocked(supabase.rpc).mockImplementation(() => new Promise(resolve => { resolveAccess = resolve; }) as any);

    await act(async () => {
      render(<AuthProvider><AuthConsumer /></AuthProvider>);
    });

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(supabase.from).toHaveBeenCalledWith('user_roles');
    });
    expect(screen.getByTestId('loading').textContent).toBe('true');
    expect(screen.getByTestId('authenticated').textContent).toBe('true');

    await act(async () => {
      resolveAccess({ data: [{ active: true, reason: 'active' }], error: null });
    });
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('isAdmin').textContent).toBe('true');
  });

  it('encerra a sessão se o banco não conseguir validar o acesso', async () => {
    const mockSession = { user: { id: 'user-no-validation', email: 'admin@test.com' } };
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: mockSession } } as any);
    vi.mocked(supabase.rpc).mockRejectedValueOnce(new Error('indisponível'));

    await act(async () => {
      render(<AuthProvider><AuthConsumer /></AuthProvider>);
    });

    await waitFor(() => expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'local' }));
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(screen.getByTestId('role').textContent).toBe('none');
  });

  it('falha de forma fechada quando a consulta de papéis falha', async () => {
    const mockUser = { id: 'user-2', email: 'seller@test.com' };
    const mockSession = { user: mockUser };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'p2', user_id: 'user-2', email: 'seller@test.com' },
            error: null,
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              then: vi.fn((cb: any) => { cb({ error: null }); return Promise.resolve(); }),
            }),
          }),
        } as any;
      }
      if (table === 'user_roles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
        } as any;
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: null }) } as any;
    });

    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: mockSession } } as any);

    await act(async () => {
      render(<AuthProvider><AuthConsumer /></AuthProvider>);
    });

    await act(async () => {
      const cb = (globalThis as any).__authCb;
      cb?.('SIGNED_IN', mockSession);
      await new Promise(r => setTimeout(r, 100));
    });

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
      expect(screen.getByTestId('role').textContent).toBe('none');
      expect(screen.getByTestId('isSeller').textContent).toBe('false');
    }, { timeout: 3000 });
  });

  it('encerra a sessão local quando o vínculo foi revogado', async () => {
    const mockUser = { id: 'user-revoked', email: 'revoked@test.com' };
    const mockSession = { user: mockUser };
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: mockSession } } as any);
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [{ active: false, reason: 'membership_revoked' }],
      error: null,
    } as any);

    await act(async () => {
      render(<AuthProvider><AuthConsumer /></AuthProvider>);
    });

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    });
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(screen.getByTestId('role').textContent).toBe('none');
  });
});
