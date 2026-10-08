import { type ReactNode, useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { MfaEnrollmentDialog } from '@/components/security/MfaEnrollmentDialog';
import { MfaChallengeDialog } from '@/components/security/MfaChallengeDialog';
import { logAccessDenied } from '@/lib/access/log-access-denied';
import { DevAccessDeniedPage } from '@/components/access/DevAccessDeniedPage';

interface DevRouteProps {
  children?: ReactNode;
}

/**
 * Guarda para rotas técnicas restritas ao papel `dev`.
 *
 * Cobre telemetria, conexões externas, secrets, audit técnico, MCP,
 * rate-limit, login-attempts, external-db, status do sistema.
 *
 * Hierarquia: dev > supervisor > agente. Apenas `dev` passa.
 *
 * Hardening (paridade com AdminRoute): exige sessão em **AAL2** para `dev`.
 *  - Dev sem MFA cadastrado → abre fluxo de enrollment obrigatório.
 *  - Dev com MFA mas sessão em `aal1` → abre challenge para elevar sessão.
 *  - Não-dev nunca chega na exigência de MFA aqui — vê a tela de bloqueio
 *    com ações contextuais (solicitar acesso, copiar link, e-mail).
 *
 * Comportamento ao bloquear:
 *  - Não autenticado → redireciona para /login preservando `from`.
 *  - Autenticado sem `dev` → exibe tela de aviso com:
 *      • CTA "Solicitar acesso a Dev" (notificação pessoal + mailto).
 *      • CTA "Copiar link da página" para encaminhar manualmente.
 *      • Retorno para destino seguro (supervisor → /admin/usuarios, agente → /).
 */
export function DevRoute({ children }: DevRouteProps) {
  const auth = useAuth();
  const location = useLocation();
  const [enrollOpen, setEnrollOpen] = useState(false);
  const blockedPath = location.pathname;
  const blockedTarget = useBlockedTarget(location);
  const blockedFullPath = `${blockedTarget.pathname}${blockedTarget.search}${blockedTarget.hash}`;
  useEffect(() => {
    if (!auth.isLoading && auth.user && auth.isDev && !auth.hasMFA) {
      setEnrollOpen(true);
    }
  }, [auth.isLoading, auth.user, auth.isDev, auth.hasMFA]);
  useDevAccessDeniedNotice({
    isLoading: auth.isLoading,
    user: auth.user,
    isDev: auth.isDev,
    blockedPath,
    role: auth.role,
  });
  return (
    <DevRouteResult
      auth={auth}
      location={location}
      blockedTarget={blockedTarget}
      blockedFullPath={blockedFullPath}
      enrollOpen={enrollOpen}
      setEnrollOpen={setEnrollOpen}
    >
      {children}
    </DevRouteResult>
  );
}

interface DevRouteResultProps {
  auth: ReturnType<typeof useAuth>;
  location: ReturnType<typeof useLocation>;
  blockedTarget: ReturnType<typeof useBlockedTarget>;
  blockedFullPath: string;
  enrollOpen: boolean;
  setEnrollOpen: (open: boolean) => void;
  children?: ReactNode;
}

function DevRouteResult({
  auth,
  location,
  blockedTarget,
  blockedFullPath,
  enrollOpen,
  setEnrollOpen,
  children,
}: DevRouteResultProps) {
  const { user, isDev, isLoading, currentAAL, hasMFA, mfaRequired, role } = auth;
  const blockedPath = location.pathname;

  if (isLoading) return <RouteLoader />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Hardening MFA/AAL2 — só aplicável a usuários `dev` (que efetivamente passariam).
  // Não-dev segue para a tela de bloqueio com ações contextuais (sem pedir MFA).
  if (isDev && (!hasMFA || (mfaRequired && currentAAL === 'aal1'))) {
    return <DevMfaGate hasMFA={hasMFA} enrollOpen={enrollOpen} setEnrollOpen={setEnrollOpen} />;
  }

  if (!isDev) {
    return (
      <DeniedDevRoute
        user={user}
        role={role}
        blockedPath={blockedPath}
        blockedFullPath={blockedFullPath}
        blockedState={blockedTarget.state}
      />
    );
  }

  return children ?? <Outlet />;
}

function DevMfaGate({ hasMFA, enrollOpen, setEnrollOpen }: { hasMFA: boolean; enrollOpen: boolean; setEnrollOpen: (open: boolean) => void }) {
  return (
    <>
      <RouteLoader />
      {hasMFA ? <MfaChallengeDialog open /> : <MfaEnrollmentDialog open={enrollOpen} onOpenChange={setEnrollOpen} enforce />}
    </>
  );
}

function DeniedDevRoute({
  user,
  role,
  blockedPath,
  blockedFullPath,
  blockedState,
}: Pick<DevRouteResultProps, 'blockedFullPath'> & {
  user: NonNullable<ReturnType<typeof useAuth>['user']>;
  role: ReturnType<typeof useAuth>['role'];
  blockedPath: string;
  blockedState: unknown;
}) {
  return (
    <DevAccessDeniedPage
      user={{ id: user.id, email: user.email }}
      role={role}
      blockedPath={blockedPath}
      blockedFullPath={blockedFullPath}
      blockedState={blockedState}
    />
  );
}

function useBlockedTarget(location: ReturnType<typeof useLocation>) {
  const [target] = useState(() => ({
    pathname: location.pathname,
    search: location.search,
    hash: location.hash,
    state: location.state,
  }));
  return target;
}

function RouteLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function shouldShowBlockedToast(userId: string) {
  const storageKey = `dev-route-toast:${userId}`;
  try {
    const last = Number(sessionStorage.getItem(storageKey) ?? '0');
    if (last && Date.now() - last < 60_000) return false;
    sessionStorage.setItem(storageKey, String(Date.now()));
  } catch {
    return true;
  }
  return true;
}

function useDevAccessDeniedNotice({
  isLoading,
  user,
  isDev,
  blockedPath,
  role,
}: Pick<ReturnType<typeof useAuth>, 'isLoading' | 'user' | 'isDev' | 'role'> & {
  blockedPath: string;
}) {
  useEffect(() => {
    if (isLoading || !user || isDev) return;
    if (shouldShowBlockedToast(user.id)) {
      toast.error('Acesso restrito', {
        id: 'dev-route-blocked',
        description: 'Área exclusiva da equipe técnica.',
        duration: 4000,
      });
    }
    void logAccessDenied({ userId: user.id, blockedPath, requiredRole: 'dev', userRole: role });
  }, [isLoading, user, isDev, blockedPath, role]);
}
