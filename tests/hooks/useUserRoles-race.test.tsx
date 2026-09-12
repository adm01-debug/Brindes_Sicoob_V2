import { act, renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useUserRoles } from '@/hooks/auth/useUserRoles';

const queryRoles = vi.hoisted(() => vi.fn());
vi.mock('@/services/authService', () => ({ authService: { queryRoles } }));
vi.mock('@/lib/auth/auth-debug', () => ({ authDebugError: vi.fn() }));
beforeEach(() => queryRoles.mockReset());
const response = (role: string) => ({ data: [{ role }], error: null });

describe('Carregamento de papéis por sessão', () => {
  it('não restaura privilégio quando uma consulta antiga termina após sair', async () => {
    let resolve!: (value: ReturnType<typeof response>) => void;
    queryRoles.mockReturnValue(new Promise(r => { resolve = r; }));
    const { result } = renderHook(() => useUserRoles());
    let pending!: Promise<void>;
    act(() => { pending = result.current.fetchRoles('sessao-antiga'); });
    act(() => result.current.clearRoles());
    await act(async () => { resolve(response('dev')); await pending; });
    expect(result.current.userRoles).toEqual([]);
    expect(result.current.rolesLoaded).toBe(false);
  });
  it('mantém os papéis da nova sessão quando a resposta antiga chega por último', async () => {
    let resolve!: (value: ReturnType<typeof response>) => void;
    queryRoles.mockImplementation((id: string) => id === 'antiga' ? new Promise(r => { resolve = r; }) : Promise.resolve(response('comprador_pac')));
    const { result } = renderHook(() => useUserRoles());
    let antiga!: Promise<void>;
    act(() => { antiga = result.current.fetchRoles('antiga'); });
    await act(async () => { await result.current.fetchRoles('nova'); });
    await act(async () => { resolve(response('dev')); await antiga; });
    expect(result.current.userRoles).toEqual(['comprador_pac']);
    expect(result.current.rolesLoaded).toBe(true);
  });
  it('encerra o carregamento com erro e permite recuperação', async () => {
    queryRoles.mockResolvedValueOnce({ data: null, error: new Error('Falha simulada') }).mockResolvedValueOnce(response('gerente_pa'));
    const { result } = renderHook(() => useUserRoles());
    await act(async () => { await result.current.fetchRoles('usuario'); });
    expect(result.current.rolesLoaded).toBe(true);
    expect(result.current.rolesError).toBeTruthy();
    expect(result.current.userRoles).toEqual([]);
    await act(async () => { await result.current.fetchRoles('usuario'); });
    expect(result.current.rolesError).toBeNull();
    expect(result.current.userRoles).toEqual(['gerente_pa']);
  });
});
