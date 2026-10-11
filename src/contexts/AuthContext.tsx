import { createContext, useContext, useEffect, useState, useRef, useCallback, type ReactNode, useMemo, type Dispatch, type SetStateAction } from "react";
import { type User, type Session, type AuthChangeEvent } from "@supabase/supabase-js";
import { supabase, supabaseUrl } from "@/integrations/supabase/client";
import { createClientLogger } from "@/lib/telemetry/structuredLogger";
import { checkLoginAllowed, recordFailedAttempt, clearLoginAttempts } from "@/hooks/useLoginRateLimit";
import { authDebug, authDebugError, summarizeSession, summarizeUser } from "@/lib/auth/auth-debug";
import { getRandomGreeting, getHighestRole } from "@/lib/auth/auth-utils";
import { useUserRoles } from "@/hooks/auth/useUserRoles";
import { useUserProfile } from "@/hooks/auth/useUserProfile";
import { useAuthAAL } from "@/hooks/auth/useAuthAAL";
import { useRecentlyViewedStore } from "@/stores/useRecentlyViewedStore";
import { useNavigationStore } from "@/stores/useNavigationStore";


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

interface SicoobAccessState {
  active: boolean;
  reason: string;
}

async function getSicoobAccessState(): Promise<SicoobAccessState> {
  const { data, error } = await supabase.rpc("get_sicoob_access_state" as never);
  if (error) throw error;
  const state = (data as unknown as SicoobAccessState[] | null)?.[0];
  return state ?? { active: false, reason: "missing_access_state" };
}

async function closeRevokedLocalSession(reason: string): Promise<void> {
  try {
    sessionStorage.setItem("sicoob_access_ended_reason", reason);
  } catch {
    // O encerramento da sessão não depende do armazenamento do navegador.
  }
  await supabase.auth.signOut({ scope: "local" });
  void import("sonner").then(({ toast }) => {
    toast.error("Seu vínculo de acesso não está mais ativo. Entre novamente ou fale com o gestor.");
  });
}

function hasPersistedSession(): boolean {
  if (typeof localStorage === "undefined") return true;

  try {
    const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
    return Boolean(localStorage.getItem(`sb-${projectRef}-auth-token`));
  } catch {
    // Em configuração não convencional, preserva o fluxo conservador.
    return true;
  }
}

function clearSensitiveBrowserData(): void {
  try {
    sessionStorage.clear();
    // Além da chave persistida, zera o histórico já hidratado na store —
    // logout seguido de login sem reload não pode mostrar páginas do usuário anterior.
    useNavigationStore.getState().clear();
    [
      "product-favorites",
      "product-comparison",
      "recently-viewed-products",
      "duplicate_product",
      // Histórico de navegação persiste títulos de páginas (nomes de
      // orçamentos/kits) e não pode vazar para o próximo usuário.
      "navigation-history",
    ].forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.warn("Falha ao limpar armazenamento local no logout", error);
  }
}

function notifySignedInUser(user: User): void {
  const displayName = user.user_metadata?.full_name
    || user.user_metadata?.name
    || user.email?.split('@')[0]
    || 'Usuário';
  void import("sonner").then(({ toast }) => {
    toast.success('🤖 Flow', {
      description: getRandomGreeting(displayName.split(' ')[0]),
      duration: 3000,
      closeButton: true,
    });
  });
}

interface AuthStateDependencies {
  setSession: Dispatch<SetStateAction<Session | null>>;
  setUser: Dispatch<SetStateAction<User | null>>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  fetchUserData: (userId: string) => Promise<void>;
  clearProfile: () => void;
  clearRoles: () => void;
  clearAAL: () => void;
}

function handleAuthenticatedState(event: AuthChangeEvent, session: Session, deps: AuthStateDependencies): void {
  useRecentlyViewedStore.getState().setScope(`user:${session.user.id}`);
  if (event === 'SIGNED_IN') notifySignedInUser(session.user);
  setTimeout(() => {
    void deps.fetchUserData(session.user.id);
    void import('@/lib/external-db-prewarm').then(module => module.prewarmExternalDb({ oncePerSession: true }));
  }, 0);
}

function handleAnonymousState(deps: AuthStateDependencies): void {
  authDebug("AuthContext.onAuthStateChange", "no session — clearing state");
  deps.clearProfile();
  deps.clearRoles();
  deps.clearAAL();
  deps.setIsLoading(false);
  useRecentlyViewedStore.getState().reset();
  clearSensitiveBrowserData();
}

function handleAuthStateChange(
  event: AuthChangeEvent,
  session: Session | null,
  deps: AuthStateDependencies,
): void {
  authDebug("AuthContext.onAuthStateChange", `event=${event}`, {
    hasSession: !!session,
    user: summarizeUser(session?.user ?? null),
    session: summarizeSession(session),
  });
  deps.setSession(session);
  deps.setUser(session?.user ?? null);
  if (session) handleAuthenticatedState(event, session, deps);
  else handleAnonymousState(deps);
}

type ClientLogger = ReturnType<typeof createClientLogger>;
const REFRESH_SESSION_LOG_CONTEXT = "AuthContext.refreshSession";
const FETCH_USER_DATA_LOG_CONTEXT = "AuthContext.fetchUserData";

async function requestRefreshedSession(log: ClientLogger): Promise<Session | null> {
  const { data, error } = await supabase.auth.refreshSession();
  if (error) {
    authDebugError(REFRESH_SESSION_LOG_CONTEXT, "supabase.auth.refreshSession failed", error);
    log.warn('refresh_failed', { message: error.message });
  } else {
    authDebug(REFRESH_SESSION_LOG_CONTEXT, "refreshSession ok", summarizeSession(data?.session ?? null));
  }
  return data?.session ?? (await supabase.auth.getSession()).data.session;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  // Sem sessão persistida, o formulário público pode aparecer no primeiro
  // render; getSession continua confirmando o estado logo abaixo. Usuários com
  // token salvo mantêm o bloqueio até a sessão e os papéis serem validados.
  const [isLoading, setIsLoading] = useState(hasPersistedSession);
  
  const { userRoles, rolesLoaded, rolesError, fetchRoles, clearRoles } = useUserRoles();
  const { profile, fetchProfile, clearProfile } = useUserProfile();
  const { currentAAL, nextAAL, hasMFA, fetchAAL, clearAAL } = useAuthAAL();

  const mountedRef = useRef(true);

  const fetchUserData = useCallback(async (userId: string) => {
    authDebug(FETCH_USER_DATA_LOG_CONTEXT, "start", { userId });
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const sess = sessionData?.session ?? null;
      
      if (!sess || sess.user.id !== userId) {
        authDebugError(FETCH_USER_DATA_LOG_CONTEXT, "ABORT — session mismatch", { userId });
        return;
      }

      const accessState = await getSicoobAccessState();
      if (!accessState.active) {
        authDebug(FETCH_USER_DATA_LOG_CONTEXT, "access revoked", { reason: accessState.reason });
        await closeRevokedLocalSession(accessState.reason);
        return;
      }

      await Promise.all([
        fetchProfile(userId),
        fetchRoles(userId),
        fetchAAL()
      ]);
    } catch (error) {
      authDebugError(FETCH_USER_DATA_LOG_CONTEXT, "unexpected exception", error);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [fetchProfile, fetchRoles, fetchAAL]);

  // O JWT pode continuar criptograficamente válido por alguns minutos depois
  // de o vínculo ser removido. O banco já bloqueia o papel imediatamente; esta
  // revalidação encerra também a sessão local ao voltar para a aba ou, no
  // máximo, no próximo intervalo.
  useEffect(() => {
    if (!user?.id) return;
    let validating = false;
    const validateAccess = async () => {
      if (validating) return;
      validating = true;
      try {
        const state = await getSicoobAccessState();
        if (!state.active) await closeRevokedLocalSession(state.reason);
      } catch (error) {
        authDebugError("AuthContext.validateAccess", "revalidation failed", error);
      } finally {
        validating = false;
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void validateAccess();
    };
    const interval = globalThis.setInterval(() => void validateAccess(), 60_000);
    globalThis.addEventListener("focus", validateAccess);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      globalThis.clearInterval(interval);
      globalThis.removeEventListener("focus", validateAccess);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [user?.id]);


// Removed large monolithic fetchUserData in favor of modular hooks above

  useEffect(() => {
    mountedRef.current = true;
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        handleAuthStateChange(event, session, {
          setSession,
          setUser,
          setIsLoading,
          fetchUserData,
          clearProfile,
          clearRoles,
          clearAAL,
        });
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      authDebug("AuthContext.init", "initial getSession()", summarizeSession(session));
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        useRecentlyViewedStore.getState().setScope(`user:${session.user.id}`);
        fetchUserData(session.user.id);
      } else {
        useRecentlyViewedStore.getState().reset();
        setIsLoading(false);
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [clearAAL, clearProfile, clearRoles, fetchUserData, fetchAAL]);

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

  const signOut = useCallback(async () => {
    const log = createClientLogger('auth.signOut');
    log.info('start');
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      clearProfile();
      clearRoles();
      clearAAL();
      useRecentlyViewedStore.getState().reset();
      // Permite prewarm no próximo login (mesma aba)
      import('@/lib/external-db-prewarm').then(m => m.resetPrewarmSession()).catch(() => {});
      log.info('ok');
    } catch (err) {
      log.error('failed', { err });
      throw err;
    }
  }, [clearAAL, clearProfile, clearRoles]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  }, [fetchUserData, user]);

  /**
   * Força um refresh completo após login social ou mudança de papéis.
   */
  const refreshSession = useCallback(async () => {
    const log = createClientLogger('auth.refreshSession');
    log.info('start');
    authDebug(REFRESH_SESSION_LOG_CONTEXT, "start");
    try {
      const nextSession = await requestRefreshedSession(log);
      authDebug(REFRESH_SESSION_LOG_CONTEXT, "resolved nextSession", summarizeSession(nextSession));
      if (mountedRef.current) {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
      }
      const uid = nextSession?.user?.id ?? user?.id;
      if (uid) {
        await fetchUserData(uid);
      } else {
        authDebug(REFRESH_SESSION_LOG_CONTEXT, "no uid — skipping fetchUserData");
      }
      log.info('ok');
      authDebug(REFRESH_SESSION_LOG_CONTEXT, "done");
    } catch (err) {
      authDebugError(REFRESH_SESSION_LOG_CONTEXT, "unexpected exception", err);
      log.error('failed', { err: errorMessage(err) });
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
    fetchAAL, refreshProfile, refreshSession, signOut
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
