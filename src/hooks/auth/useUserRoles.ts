import { useState, useCallback, useRef } from 'react';
import type { AppRole } from '@/types/users';
import { authService } from '@/services/authService';
import { authDebugError } from '@/lib/auth/auth-debug';
import { normalizeAssignedRoles } from '@/lib/access/role-policy';

async function queryRolesWithRetry(userId: string, requestIsCurrent: () => boolean) {
  let result = await authService.queryRoles(userId);
  if (result.error || result.data?.length) return result;

  await new Promise(resolve => setTimeout(resolve, 500));
  if (!requestIsCurrent()) return null;
  result = await authService.queryRoles(userId);
  return result;
}

export function useUserRoles() {
  const [userRoles, setUserRoles] = useState<AppRole[]>([]);
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const generation = useRef(0);
  const pending = useRef<{ userId: string; promise: Promise<void> } | null>(null);

  const fetchRoles = useCallback((userId: string): Promise<void> => {
    if (!userId) return Promise.resolve();
    if (pending.current?.userId === userId) return pending.current.promise;
    const request = ++generation.current;
    setUserRoles([]);
    setRolesLoaded(false);
    setRolesError(null);

    const promise = (async () => {
      try {
        const result = await queryRolesWithRetry(userId, () => request === generation.current);
        if (!result) return;
        if (result.error) throw result.error;
        if (request !== generation.current) return;
        setUserRoles(normalizeAssignedRoles((result.data ?? []).map(row => row.role)));
      } catch (error) {
        if (request !== generation.current) return;
        authDebugError('useUserRoles', 'Falha ao consultar permissões', error);
        setRolesError('Não foi possível carregar suas permissões. Tente novamente.');
      } finally {
        if (request === generation.current) {
          setRolesLoaded(true);
          pending.current = null;
        }
      }
    })();
    pending.current = { userId, promise };
    return promise;
  }, []);

  const clearRoles = useCallback(() => {
    // Uma resposta da sessão anterior não pode restaurar seus privilégios.
    generation.current++;
    pending.current = null;
    setUserRoles([]);
    setRolesLoaded(false);
    setRolesError(null);
  }, []);

  return { userRoles, rolesLoaded, rolesError, fetchRoles, clearRoles };
}
