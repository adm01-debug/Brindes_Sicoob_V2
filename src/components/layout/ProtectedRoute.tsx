import { PermissionsError } from "./PermissionsError";
import { type ReactNode, forwardRef } from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

import { hasRequiredRole, type RequiredRole } from "@/lib/access/role-policy";

interface ProtectedRouteProps {
  children?: ReactNode;
  /** Hierarquia: 'dev' (somente dev), 'supervisor' (dev OU supervisor), 'agente' (qualquer autenticado). */
  requiredRole?: RequiredRole;
  /** @deprecated Use requiredRole="supervisor" — mantido para compatibilidade. */
  requireAdmin?: boolean;
  /** Marca rotas técnicas (telemetria, MCP, hardening, etc.) — equivale a requiredRole="dev". */
  requireDev?: boolean;
}

export const ProtectedRoute = forwardRef<HTMLDivElement, ProtectedRouteProps>(function ProtectedRoute({
  children,
  requiredRole,
  requireAdmin = false,
  requireDev = false,
}, ref) {
  const { user, roles, isLoading, rolesLoaded, rolesError } = useAuth();
  const location = useLocation();

  if (isLoading || (user && !rolesLoaded)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          {user && !rolesLoaded && <p className="text-sm text-muted-foreground animate-pulse">Carregando permissões...</p>}
        </div>
      </div>
    );
  }

  if (user && rolesError) return <PermissionsError />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Resolução do nível exigido (props mais explícitas têm prioridade)
  const required: RequiredRole | undefined =
    requiredRole ?? (requireDev ? "dev" : requireAdmin ? "supervisor" : undefined);

  if (!hasRequiredRole(roles, required)) {
    return <Navigate to="/403" replace />;
  }

  // Retorno único: Outlet (Layout Route) ou children. Sem forwardRef:
  // Router não passa refs para `element={<ProtectedRoute />}`.
  return children ? <div ref={ref}>{children}</div> : <div ref={ref}><Outlet /></div>;
});

ProtectedRoute.displayName = 'ProtectedRoute';
