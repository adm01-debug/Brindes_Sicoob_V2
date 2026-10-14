import { PermissionsError } from "./PermissionsError";
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { normalizeAssignedRoles, rolesForSicoobPath } from "@/lib/access/role-policy";
import { Skeleton } from "@/components/ui/skeleton";

interface SicoobRouteProps {
  children?: React.ReactNode;
  allowedRoles?: readonly string[];
}

function routeRolesFor(pathname: string, explicitRoles?: readonly string[]): readonly string[] {
  if (explicitRoles) return explicitRoles;
  return rolesForSicoobPath(pathname);
}

function isRoleResolutionPending(isLoading: boolean, hasUser: boolean, rolesLoaded: boolean): boolean {
  return isLoading || (hasUser && !rolesLoaded);
}

export const SicoobRoute: React.FC<SicoobRouteProps> = ({ children, allowedRoles }) => {
  const { user, roles, isLoading, rolesLoaded, rolesError } = useAuth();
  const location = useLocation();

  if (isRoleResolutionPending(isLoading, Boolean(user), rolesLoaded)) {
    return (
      <div data-route-pending="permissions" className="p-8 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (user && rolesError) return <PermissionsError />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const routeRoles = routeRolesFor(location.pathname, allowedRoles);
  const hasAccess = normalizeAssignedRoles(roles).some(role => routeRoles.includes(role));
  if (!hasAccess) return <Navigate to="/403" replace />;

  return <>{children ?? <Outlet />}</>;
};
