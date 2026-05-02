import { createContext, useContext, useEffect, useState, useRef, useCallback, type ReactNode } from "react";
import { type User, type Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { createClientLogger } from "@/lib/telemetry/structuredLogger";
import { checkLoginAllowed, recordFailedAttempt, clearLoginAttempts } from "@/hooks/useLoginRateLimit";
import { toast } from "sonner";
import { authDebug, authDebugError, summarizeSession, summarizeUser } from "@/lib/auth/auth-debug";
import { getRandomGreeting, getHighestRole } from "@/lib/auth/auth-utils";
import { authService } from "@/services/authService";


// Tipos de role conforme app_role enum no banco.
// 'admin', 'manager' e 'vendedor' permanecem por compatibilidade com dados legados,
// mas a nova hierarquia oficial é: dev > supervisor > agente.
export type AppRole =
  | "dev"
  | "gestor_compras"
  | "gerente_pa"
  | "vendedor"
  | "supervisor"
  | "agente"
  | "admin"      // legado (alias de supervisor)
  | "manager";    // legado

// Interface do Profile
export interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;           // Auto-synced from user_roles via DB trigger
  cooperativa_id: string | null; // Sicoob: Singular
  pa_id: string | null;          // Sicoob: PA
  avatar_url: string | null;
  phone: string | null;
  department: string | null;
  is_active: boolean | null;
  last_login_at: string | null;
  preferences: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

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
  isGerentePa: boolean;
  isVendedor: boolean;
  isSupervisor: boolean;
  isAgente: boolean;
  isSupervisorOrAbove: boolean; // dev OR supervisor OR gestor_compras
  canManage: boolean;           // Alias para isSupervisorOrAbove
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
  /** True quando user_roles foi carregado com sucesso (≥1 role). False = ainda carregando ou falhou. */
  rolesLoaded: boolean;
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRoles, setUserRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentAAL, setCurrentAAL] = useState<'aal1' | 'aal2' | null>(null);
  const [nextAAL, setNextAAL] = useState<'aal1' | 'aal2' | null>(null);
  const [hasMFA, setHasMFA] = useState(false);

  // Guards contra race conditions (#4) — usando Promise para coordenar chamadores
  const fetchPromiseRef = useRef<Promise<void> | null>(null);
  const mountedRef = useRef(true);

  const fetchAAL = useCallback(async () => {
    try {
      const data = await authService.fetchAAL();
      if (!mountedRef.current) return;
      setCurrentAAL(data.currentLevel);
      setNextAAL(data.nextLevel);
      setHasMFA(data.hasMFA);
    } catch (e) {
      if (import.meta.env.DEV) logger.warn('AAL fetch failed', e instanceof Error ? e.message : String(e));
    }
  }, []);


  const fetchUserData = useCallback(async (userId: string) => {
    // Se já existe um fetch em andamento para este userId, aguardar ao invés de ignorar
    if (fetchPromiseRef.current) {
      await fetchPromiseRef.current;
      return;
    }
    
    const doFetch = async () => {
      authDebug("AuthContext.fetchUserData", "start", { userId });
      try {
        // Garante que o cliente Supabase já tem a sessão hidratada antes de consultar
        // tabelas com RLS (evita query como anon retornando 0 linhas → fallback "agente").
        const { data: sessionData } = await supabase.auth.getSession();
        const sess = sessionData?.session ?? null;
        const sessUserId = sess?.user?.id ?? null;
        const provider =
          (sess?.user?.app_metadata as { provider?: string } | undefined)?.provider ?? null;
        const sessionMatchesTarget = sessUserId === userId;

        // Asserção: NUNCA consultar user_roles como anon. Se a sessão estiver ausente
        // ou pertencer a outro usuário, abortar antes da query (evita resultado [] enganoso).
        if (!sess || !sessUserId) {
          authDebugError(
            "AuthContext.fetchUserData",
            "ABORT — no active session (would query as anon)",
            { requestedUserId: userId, hasSession: !!sess },
          );
          if (import.meta.env.DEV) {
            console.warn(
              "[AUTH-DEBUG] fetchUserData abortado: sem sessão ativa. Não consultando user_roles como anon.",
            );
          }
          return;
        }
        if (!sessionMatchesTarget) {
          authDebugError("AuthContext.fetchUserData", "ABORT — session user mismatch", {
            requestedUserId: userId,
            sessionUserId: sessUserId,
          });
          return;
        }

        authDebug("AuthContext.fetchUserData", "session asserted", {
          sessionUserId: sessUserId,
          provider,
          tokenType: sess.token_type ?? null,
          expiresAt: sess.expires_at ?? null,
          targetUserId: userId,
          match: sessionMatchesTarget,
        });

        // Buscar profile e TODAS as roles em paralelo
        const [profileResult, firstRoles] = await Promise.all([
          authService.fetchProfile(userId),
          authService.queryRoles(userId),
        ]);

        let rolesResult = firstRoles;
        if (!rolesResult.error && (!rolesResult.data || rolesResult.data.length === 0)) {
          authDebug("AuthContext.fetchUserData", "user_roles empty \u2014 retrying once", { userId });
          await new Promise((r) => setTimeout(r, 250));
          rolesResult = await authService.queryRoles(userId);
          authDebug("AuthContext.fetchUserData", "user_roles retry result", {
            count: rolesResult.data?.length ?? 0,
            error: rolesResult.error?.message,
          });
        }


        if (!mountedRef.current) return;

        if (profileResult.error) {
          authDebugError("AuthContext.fetchUserData", "profile query failed", profileResult.error);
          if (import.meta.env.DEV) {
            console.error("Error fetching profile:", profileResult.error);
          }
        } else if (profileResult.data) {
          authDebug("AuthContext.fetchUserData", "profile loaded", {
            id: profileResult.data.id,
            role_mirror: profileResult.data.role,
            is_active: profileResult.data.is_active,
          });
          setProfile(profileResult.data as Profile);

          // Atualizar last_login_at (não bloqueia)
          supabase
            .from("profiles")
            .update({ last_login_at: new Date().toISOString() })
            .eq("user_id", userId)
            .then(({ error }) => {
              if (error && import.meta.env.DEV) {
                logger.warn("Failed to update last_login_at:", error.message);
              }
            });
        }

        if (rolesResult.error) {
          authDebugError("AuthContext.fetchUserData", "user_roles query failed", rolesResult.error);
          if (import.meta.env.DEV) {
            console.error("Error fetching user roles:", rolesResult.error);
          }
          // Não chutar fallback "agente" — deixa userRoles vazio (estado indeterminado);
          // consumidores devem usar `rolesLoaded` para diferenciar carregando/falha de "sem role".
        } else if (rolesResult.data) {
          const roles = rolesResult.data.map((r) => r.role as AppRole);
          authDebug("AuthContext.fetchUserData", "user_roles loaded", {
            count: roles.length,
            roles,
          });
          // Só atualiza se vieram roles reais. Lista vazia mantém o estado anterior
          // (provavelmente sessão ainda hidratando — o retry acima já cobre o caso normal).
          if (roles.length > 0) {
            setUserRoles(roles);
          }
        }
      } catch (error) {
        authDebugError("AuthContext.fetchUserData", "unexpected exception", error);
        if (import.meta.env.DEV) {
          console.error("Error fetching user data:", error);
        }
        // Não chutar fallback "agente" — manter userRoles como está (vazio = indeterminado).
      } finally {
        fetchPromiseRef.current = null;
        // isLoading só fica false APÓS os dados carregarem (#5)
        if (mountedRef.current) {
          setIsLoading(false);
        }
        authDebug("AuthContext.fetchUserData", "done");
      }
    };

    fetchPromiseRef.current = doFetch();
    await fetchPromiseRef.current;
  }, []);

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
            fetchAAL();
            // Pre-warm external DB + CRM bridge to avoid cold starts (1x por sessão)
            import('@/lib/external-db-prewarm').then(m => m.prewarmExternalDb({ oncePerSession: true }));
          }, 0);
        } else {
          authDebug("AuthContext.onAuthStateChange", "no session — clearing state");
          setProfile(null);
          setUserRoles([]);
          setCurrentAAL(null);
          setNextAAL(null);
          setHasMFA(false);
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
        fetchAAL();
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
      setProfile(null);
      setUserRoles([]);
      setCurrentAAL(null);
      setNextAAL(null);
      setHasMFA(false);
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
      fetchPromiseRef.current = null; // Forçar refresh
      await fetchUserData(user.id);
    }
  };

  /**
   * Força um refresh completo após login social ou mudança de papéis:
   *  1. Renova o JWT (`supabase.auth.refreshSession`) para trazer claims atuais.
   *  2. Re-busca profile + user_roles (bypassando o cache do fetchPromiseRef).
   *  3. Atualiza AAL/MFA.
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
        fetchPromiseRef.current = null;
        await Promise.all([fetchUserData(uid), fetchAAL()]);
      } else {
        authDebug("AuthContext.refreshSession", "no uid — skipping fetchUserData");
      }
      log.info('ok');
      authDebug("AuthContext.refreshSession", "done");
    } catch (err) {
      authDebugError("AuthContext.refreshSession", "unexpected exception", err);
      log.error('failed', { err: err instanceof Error ? err.message : String(err) });
    }
  }, [user, fetchUserData, fetchAAL]);

  const has = (r: AppRole) => userRoles.includes(r);
  const isDev = has("dev");
  const isGestorCompras = has("gestor_compras");
  const isGerentePa = has("gerente_pa");
  const isVendedor = has("vendedor");
  const isSupervisor = has("supervisor") || has("admin") || has("manager");
  const isAgente = has("agente");
  const isSupervisorOrAbove = isDev || isGestorCompras || isSupervisor;

  const primaryRole = getHighestRole(userRoles);
  const isAdmin = isSupervisorOrAbove;
  const mfaRequired = isSupervisorOrAbove && currentAAL !== 'aal2';

  const cooperativaId = profile?.cooperativa_id || null;
  const paId = profile?.pa_id || null;


  const value: AuthContextType = {
    user,
    session,
    profile,
    isLoading,
    roles: userRoles,
    role: primaryRole,
    isDev,
    isGestorCompras,
    isGerentePa,
    isVendedor,
    isSupervisor,
    isAgente,
    isSupervisorOrAbove,
    canManage: isSupervisorOrAbove,
    cooperativaId,
    paId,
    isAdmin: isSupervisorOrAbove,
    isAuthenticated: !!user,
    currentAAL,
    nextAAL,
    hasMFA,
    mfaRequired,
    rolesLoaded: userRoles.length > 0,
    refreshAAL: fetchAAL,
    signUp,
    signIn,
    signOut,
    refreshProfile,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
