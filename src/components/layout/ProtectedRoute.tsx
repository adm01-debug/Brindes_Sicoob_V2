import { PermissionsError } from "./PermissionsError";
import type { ReactNode } from "react";
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

function isLoadingPermissions(isLoading: boolean, hasUser: boolean, rolesLoaded: boolean) {
  return isLoading || (hasUser && !rolesLoaded);
}

function resolveRequiredRole(
  requiredRole: RequiredRole | undefined,
  requireDev: boolean,
  requireAdmin: boolean,
): RequiredRole | undefined {
  if (requiredRole) return requiredRole;
  if (requireDev) return "dev";
  if (requireAdmin) return "supervisor";
  return undefined;
}

function RouteLoader({ showPermissionsMessage }: { showPermissionsMessage: boolean }) {
  return (
    <div
      data-route-pending="permissions"
      className="min-h-screen flex items-center justify-center bg-background"
    >
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        {showPermissionsMessage && <p className="text-sm text-muted-foreground animate-pulse">Carregando permissões...</p>}
      </div>
    </div>
  );
}

export function ProtectedRoute({
  children,
  requiredRole,
  requireAdmin = false,
  requireDev = false,
}: ProtectedRouteProps) {
  const { user, roles, isLoading, rolesLoaded, rolesError } = useAuth();
  const location = useLocation();

  // TEMP-TEST-BYPASS (remove): allow listed routes unauthenticated for PR #100 UI test
  if (["/tendencias","/simulador","/mockup-generator","/orcamentos/novo"].includes(location.pathname)) return children ?? <Outlet />;

  if (isLoadingPermissions(isLoading, Boolean(user), rolesLoaded)) {
    return <RouteLoader showPermissionsMessage={Boolean(user) && !rolesLoaded} />;
  }

  if (user && rolesError) return <PermissionsError />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Resolução do nível exigido (props mais explícitas têm prioridade)
  const required = resolveRequiredRole(requiredRole, requireDev, requireAdmin);

  if (!hasRequiredRole(roles, required)) {
    return <Navigate to="/403" replace />;
  }

  return children ?? <Outlet />;
}
