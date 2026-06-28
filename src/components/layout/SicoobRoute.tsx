import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

interface SicoobRouteProps {
  children?: React.ReactNode;
  allowedRoles?: string[];
}

export const SicoobRoute: React.FC<SicoobRouteProps> = ({ 
  children, 
  allowedRoles = ["admin", "vendedor", "gestor_compras", "gerente_pa"] 
}) => {
  const { user, userRoles, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/login?next=${location.pathname}`} replace />;
  }

  const hasAccess = userRoles.some(role => allowedRoles.includes(role));

  if (!hasAccess) {
    console.warn(`[SICOOB] Acesso negado para ${user.email}. Roles: ${userRoles}`);
    return <Navigate to="/" replace />;
  }

  return <>{children ?? <Outlet />}</>;
};
