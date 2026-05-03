import { type ReactNode, useState, useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { MfaEnrollmentDialog } from "@/components/security/MfaEnrollmentDialog";
import { MfaChallengeDialog } from "@/components/security/MfaChallengeDialog";

interface AdminRouteProps {
  children?: ReactNode;
  /** Papel mínimo para acessar. Se omitido, qualquer um com canManage acessa. */
  requiredRole?: "dev" | "gestor_compras" | "supervisor";
}

/**
 * Wrapper para rotas administrativas.
 * Suporta Layout Routes (Outlet) e children diretos.
 * Redireciona para / se o usuário não for admin ou manager.
 *
 * Hardening: exige sessão em AAL2 (MFA verificado).
 *  - Sem MFA cadastrado → abre fluxo de enrollment obrigatório
 *  - Com MFA mas sessão em aal1 → abre challenge para elevar sessão
 */
export function AdminRoute({ children, requiredRole }: AdminRouteProps) {
  const { user, canManage, isDev, isGestorCompras, isSupervisor, isLoading, currentAAL, hasMFA, mfaRequired } = useAuth();
  const [enrollOpen, setEnrollOpen] = useState(false);

  useEffect(() => {
    if (canManage && !hasMFA && !isLoading) setEnrollOpen(true);
  }, [canManage, hasMFA, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Verificação de permissão baseada no role exigido ou canManage genérico
  const hasAccess = requiredRole 
    ? (requiredRole === "dev" ? isDev : 
       requiredRole === "gestor_compras" ? (isGestorCompras || isDev) : 
       (isSupervisor || isGestorCompras || isDev))
    : canManage;

  if (!hasAccess) {
    return <Navigate to="/403" replace />;
  }

  // Admin/manager sem MFA → mostra dialog de enrollment obrigatório (não renderiza filhos)
  if (!hasMFA) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <MfaEnrollmentDialog open={enrollOpen} onOpenChange={setEnrollOpen} enforce />
      </>
    );
  }

  // Admin/manager com MFA mas sessão em aal1 → exige challenge antes de renderizar filhos
  if (mfaRequired && currentAAL === "aal1") {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <MfaChallengeDialog open />
      </>
    );
  }

  // Retorno único: Outlet (Layout Route) ou children. Sem forwardRef:
  // Router não passa refs para `element={<AdminRoute />}`.
  return children ? <>{children}</> : <Outlet />;
}
