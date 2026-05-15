import { useState, useCallback, useRef } from 'react';
import { type AppRole } from '@/contexts/AuthContext';
import { authService } from '@/services/authService';
import { authDebug, authDebugError } from '@/lib/auth/auth-debug';

export function useUserRoles() {
  const [userRoles, setUserRoles] = useState<AppRole[]>([]);
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const fetchPromiseRef = useRef<Promise<void> | null>(null);

  const fetchRoles = useCallback(async (userId: string) => {
    if (!userId) return;
    if (fetchPromiseRef.current) return fetchPromiseRef.current;

    const doFetch = async () => {
      try {
        let result = await authService.queryRoles(userId);
        
        // Retry logic for potential eventual consistency in Edge Auth
        if (!result.error && (!result.data || result.data.length === 0)) {
          await new Promise((r) => setTimeout(r, 500));
          result = await authService.queryRoles(userId);
        }

        if (result.data && result.data.length > 0) {
          const roles = result.data.map((r) => r.role as AppRole);
          setUserRoles(prev => {
             if (prev.length === roles.length && prev.every((v, i) => v === roles[i])) return prev;
             return roles;
          });
          setRolesLoaded(true);
        }
      } catch (error) {
        authDebugError("useUserRoles", "Failed to fetch roles", error);
      } finally {
        fetchPromiseRef.current = null;
      }
    };

    fetchPromiseRef.current = doFetch();
    return fetchPromiseRef.current;
  }, []);

  const clearRoles = useCallback(() => {
    setUserRoles([]);
    setRolesLoaded(false);
  }, []);

  return { userRoles, rolesLoaded, fetchRoles, clearRoles };
}
