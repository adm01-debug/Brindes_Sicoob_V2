import { createContext, useContext, useEffect, useState, useRef, useCallback, type ReactNode, useMemo } from "react";
import { type User, type Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { createClientLogger } from "@/lib/telemetry/structuredLogger";
import { checkLoginAllowed, recordFailedAttempt, clearLoginAttempts } from "@/hooks/useLoginRateLimit";
import { toast } from "sonner";
import { authDebug, authDebugError, summarizeSession, summarizeUser } from "@/lib/auth/auth-debug";
import { getRandomGreeting, getHighestRole } from "@/lib/auth/auth-utils";
import { authService } from "@/services/authService";
import { useUserRoles } from "@/hooks/auth/useUserRoles";
import { useUserProfile } from "@/hooks/auth/useUserProfile";
import { useAuthAAL } from "@/hooks/auth/useAuthAAL";


import { type AppRole, type Profile } from "@/types/users";

export type { AppRole, Profile };


interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  // Conjunto de todas as roles que o usuário possui em user_roles
  roles: AppRole[];
  // Role principal (mais alta na hierarquia) para exibição/legado
  role: AppRole | null;
  // Helpers da hierarquia Sicoob/Flow
  isDev: boolean;
  isGestorCompras: boolean;
  isCompradorSingular: boolean;
  isGerentePa: boolean;
  isVendedor: boolean;
  isSupervisor: boolean;
  isAgente: boolean;
  isSupervisorOrAbove: boolean; // dev OR supervisor OR gestor_compras
  canManage: boolean;
  // IDs organizacionais
  cooperativaId: string | null;
  paId: string | null;
  // Aliases retrocompatíveis
  isAdmin: boolean;
  isAuthenticated: boolean;
  // MFA / Authenticator Assurance Level
  currentAAL: 'aal1' | 'aal2' | null;
  nextAAL: 'aal1' | 'aal2' | null;
  hasMFA: boolean;
  mfaRequired: boolean;
  /** Consulta de papéis encerrada; rolesError diferencia falha de ausência de papéis. */
  rolesLoaded: boolean;
  rolesError: string | null;
  refreshAAL: () => Promise<void>;
  // Métodos
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** Força refresh do JWT + roles + AAL — usar após login social / mudança de papéis. */
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const { userRoles, rolesLoaded, rolesError, fetchRoles, clearRoles } = useUserRoles();
  const { profile, fetchProfile, clearProfile } = useUserProfile();
  const { currentAAL, nextAAL, hasMFA, fetchAAL, clearAAL } = useAuthAAL();

  const mountedRef = useRef(true);

  const fetchUserData = useCallback(async (userId: string) => {
    authDebug("AuthContext.fetchUserData", "start", { userId });
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const sess = sessionData?.session ?? null;
      
      if (!sess || sess.user.id !== userId) {
        authDebugError("AuthContext.fetchUserData", "ABORT — session mismatch", { userId });
        return;
      }

      await Promise.all([
        fetchProfile(userId),
        fetchRoles(userId),
        fetchAAL()
      ]);
    } catch (error) {
      authDebugError("AuthContext.fetchUserData", "unexpected exception", error);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [fetchProfile, fetchRoles, fetchAAL]);


// Removed large monolithic fetchUserData in favor of modular hooks above

  useEffect(() => {
    mountedRef.current = true;
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        authDebug("AuthContext.onAuthStateChange", `event=${event}`, {
          hasSession: !!session,
          user: summarizeUser(session?.user ?? null),
          session: summarizeSession(session),
        });
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Show greeting on login
          if (event === 'SIGNED_IN') {
            const displayName = session.user.user_metadata?.full_name
              || session.user.user_metadata?.name
              || session.user.email?.split('@')[0]
              || 'Usuário';
            const firstName = displayName.split(' ')[0];

            toast.success(`🤖 Flow`, {
              description: getRandomGreeting(firstName),
              duration: 3000,
              closeButton: true,
            });
          }


          // Defer Supabase calls with setTimeout to avoid deadlocks
          setTimeout(() => {
            fetchUserData(session.user.id);
            // Pre-warm external DB + CRM bridge to avoid cold starts (1x por sessão)
            import('@/lib/external-db-prewarm').then(m => m.prewarmExternalDb({ oncePerSession: true }));
          }, 0);
        } else {
          authDebug("AuthContext.onAuthStateChange", "no session — clearing state");
          clearProfile();
          clearRoles();
          clearAAL();
          setIsLoading(false);
          
          // Limpeza automática de dados sensíveis da sessão
          try {
            sessionStorage.clear();
            // Não limpamos localStorage.clear() para não perder o tema,
            // mas limpamos dados de produtos/negócio específicos.
            const keysToClear = [
              "product-favorites",
              "product-comparison",
              "recently-viewed-products",
              "duplicate_product"
            ];
            keysToClear.forEach(k => localStorage.removeItem(k));
          } catch (e) {
            console.warn("Falha ao limpar armazenamento local no logout", e);
          }
        }
        // NÃO seta isLoading=false aqui — espera fetchUserData terminar (#5)
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      authDebug("AuthContext.init", "initial getSession()", summarizeSession(session));
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [fetchUserData, fetchAAL]);

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const log = createClientLogger('auth.signIn', { base: { email_domain: email.split('@')[1] ?? 'unknown' } });
    log.info('start');

    // Client-side brute force protection
    const { allowed, remainingSeconds } = checkLoginAllowed(email);
    if (!allowed) {
      const minutes = Math.ceil(remainingSeconds / 60);
      log.warn('rate_limited_client', { remaining_seconds: remainingSeconds });
      return {
        error: {
          message: `Conta temporariamente bloqueada por excesso de tentativas. Tente novamente em ${minutes} minuto(s).`,
          name: 'RateLimitError',
          status: 429,
        } as { message: string; name: string; status: number },
      };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const { locked, remainingSeconds: lockSecs } = recordFailedAttempt(email);
      log.warn('signin_failed', { reason: error.message, locked });
      if (locked) {
        const mins = Math.ceil(lockSecs / 60);
        return {
          error: {
            message: `Muitas tentativas de login. Conta bloqueada por ${mins} minuto(s).`,
            name: 'RateLimitError',
            status: 429,
          } as { message: string; name: string; status: number },
        };
      }
    } else {
      // Successful login — clear attempts
      clearLoginAttempts(email);
      log.info('signin_ok');
    }

    // Log attempt server-side (fire-and-forget) — propaga X-Request-Id
    supabase.functions.invoke('log-login-attempt', {
      body: {
        email,
        user_id: error ? null : undefined,
        ip_address: 'client',
        success: !error,
        failure_reason: error?.message || null,
        user_agent: navigator.userAgent,
      },
      headers: log.headers(),
    }).catch(() => {});

    return { error };
  };

  const signOut = async () => {
    const log = createClientLogger('auth.signOut');
    log.info('start');
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      clearProfile();
      clearRoles();
      clearAAL();
      // Permite prewarm no próximo login (mesma aba)
      import('@/lib/external-db-prewarm').then(m => m.resetPrewarmSession()).catch(() => {});
      log.info('ok');
    } catch (err) {
      log.error('failed', { err });
      throw err;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  };

  /**
   * Força um refresh completo após login social ou mudança de papéis.
   */
  const refreshSession = useCallback(async () => {
    const log = createClientLogger('auth.refreshSession');
    log.info('start');
    authDebug("AuthContext.refreshSession", "start");
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        authDebugError("AuthContext.refreshSession", "supabase.auth.refreshSession failed", error);
        log.warn('refresh_failed', { message: error.message });
      } else {
        authDebug("AuthContext.refreshSession", "refreshSession ok", summarizeSession(data?.session ?? null));
      }
      const nextSession = data?.session ?? (await supabase.auth.getSession()).data.session;
      authDebug("AuthContext.refreshSession", "resolved nextSession", summarizeSession(nextSession));
      if (mountedRef.current) {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
      }
      const uid = nextSession?.user?.id ?? user?.id;
      if (uid) {
        await fetchUserData(uid);
      } else {
        authDebug("AuthContext.refreshSession", "no uid — skipping fetchUserData");
      }
      log.info('ok');
      authDebug("AuthContext.refreshSession", "done");
    } catch (err) {
      authDebugError("AuthContext.refreshSession", "unexpected exception", err);
      log.error('failed', { err: err instanceof Error ? err.message : String(err) });
    }
  }, [user, fetchUserData]);

  const role = useMemo(() => getHighestRole(userRoles), [userRoles]);
  const isDev = useMemo(() => userRoles.includes("dev"), [userRoles]);
  const isGestorCompras = useMemo(() => userRoles.includes("gestor_compras"), [userRoles]);
  const isGerentePa = useMemo(() => userRoles.includes("gerente_pa") || userRoles.includes("comprador_pac"), [userRoles]);
  const isVendedor = useMemo(() => userRoles.includes("vendedor"), [userRoles]);
  const isSupervisor = useMemo(() => userRoles.includes("supervisor"), [userRoles]);
  const isAgente = useMemo(() => userRoles.includes("agente"), [userRoles]);
  const isCompradorSingular = useMemo(() => userRoles.includes("comprador_singular"), [userRoles]);
  const isSupervisorOrAbove = useMemo(() => 
    isDev || isSupervisor || isGestorCompras || isCompradorSingular, 
    [isDev, isSupervisor, isGestorCompras, isCompradorSingular]
  );
  const canManage = useMemo(() => isSupervisorOrAbove, [isSupervisorOrAbove]);

  const cooperativaId = useMemo(() => profile?.cooperativa_id || null, [profile?.cooperativa_id]);
  const paId = useMemo(() => profile?.pa_id || null, [profile?.pa_id]);

  const value = useMemo((): AuthContextType => ({
    user,
    session,
    profile,
    isLoading,
    roles: userRoles,
    role,
    isDev,
    isGestorCompras,
    isCompradorSingular,
    isGerentePa,
    isVendedor,
    isSupervisor,
    isAgente,
    isSupervisorOrAbove,
    canManage,
    cooperativaId,
    paId,
    isAdmin: isSupervisorOrAbove,
    isAuthenticated: !!user,
    currentAAL,
    nextAAL,
    hasMFA,
    mfaRequired: nextAAL === 'aal2' && currentAAL !== 'aal2',
    rolesLoaded,
    rolesError,
    refreshAAL: fetchAAL,
    signUp,
    signIn,
    signOut,
    refreshProfile,
    refreshSession,
  }), [
    user, session, profile, isLoading, userRoles, role, isDev, isGestorCompras, isCompradorSingular, rolesError,
    isGerentePa, isVendedor, isSupervisor, isAgente, isSupervisorOrAbove,
    canManage, cooperativaId, paId, currentAAL, nextAAL, hasMFA, rolesLoaded,
    fetchAAL, refreshSession
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
