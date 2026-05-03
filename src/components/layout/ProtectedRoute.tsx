import { type ReactNode } from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type RequiredRole = "dev" | "supervisor" | "agente" | "gestor_compras" | "gerente_pa" | "vendedor";

interface ProtectedRouteProps {
  children?: ReactNode;
  /** Hierarquia: 'dev' (somente dev), 'supervisor' (dev OU supervisor), 'agente' (qualquer autenticado). */
  requiredRole?: RequiredRole;
  /** @deprecated Use requiredRole="supervisor" — mantido para compatibilidade. */
  requireAdmin?: boolean;
  /** Marca rotas técnicas (telemetria, MCP, hardening, etc.) — equivale a requiredRole="dev". */
  requireDev?: boolean;
}

export function ProtectedRoute({
  children,
  requiredRole,
  requireAdmin = false,
  requireDev = false,
}: ProtectedRouteProps) {
  const { user, isDev, isSupervisorOrAbove, isLoading, profile } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Resolução do nível exigido (props mais explícitas têm prioridade)
  const required: RequiredRole | undefined =
    requiredRole ?? (requireDev ? "dev" : requireAdmin ? "supervisor" : undefined);

  if (required === "dev" && !isDev) {
    return <Navigate to="/403" replace />;
  }
  
  const role = profile?.role;

  if (required === "gestor_compras" && role !== "gestor_compras" && !isDev) {
    return <Navigate to="/403" replace />;
  }
  if (required === "supervisor" && !isSupervisorOrAbove) {
    return <Navigate to="/403" replace />;
  }
  if (required === "gerente_pa" && role !== "gerente_pa" && !isSupervisorOrAbove) {
    return <Navigate to="/403" replace />;
  }
  if (required === "vendedor" && role !== "vendedor" && role !== "gerente_pa" && !isSupervisorOrAbove) {
    return <Navigate to="/403" replace />;
  }

  // 'agente' = qualquer usuário autenticado, sem checagem extra.

  // Retorno único: Outlet (Layout Route) ou children. Sem forwardRef:
  // Router não passa refs para `element={<ProtectedRoute />}`.
  return children ? <>{children}</> : <Outlet />;
}
