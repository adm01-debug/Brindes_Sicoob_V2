import { PermissionsError } from "./PermissionsError";
import { type ReactNode, useState, useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { MfaEnrollmentDialog } from "@/components/security/MfaEnrollmentDialog";
import { MfaChallengeDialog } from "@/components/security/MfaChallengeDialog";
import { hasRequiredRole } from "@/lib/access/role-policy";

interface AdminRouteProps {
  children?: ReactNode;
  /** Administração técnica por padrão; papel de negócio deve ser explícito. */
  requiredRole?: "dev" | "gestor_compras" | "supervisor";
}

function AdminRouteLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function EnrollmentGate({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <>
      <AdminRouteLoader />
      <MfaEnrollmentDialog open={open} onOpenChange={onOpenChange} enforce />
    </>
  );
}

function ChallengeGate() {
  return (
    <>
      <AdminRouteLoader />
      <MfaChallengeDialog open />
    </>
  );
}

function auditDeniedAccess(requiredRole: AdminRouteProps["requiredRole"]) {
  void import("@/utils/adminAudit").then((module) => module.logAdminAction({
    event_type: "SECURITY_CONFIG_CHANGE",
    entity_type: "access_control",
    metadata: {
      action: "unauthorized_access_attempt",
      path: window.location.pathname,
      required_role: requiredRole || "admin",
    },
  }));
}

function isRouteLoading(isLoading: boolean, hasUser: boolean, rolesLoaded: boolean) {
  return isLoading || (hasUser && !rolesLoaded);
}

function hasRoleLoadError(hasUser: boolean, rolesError: unknown) {
  return hasUser && Boolean(rolesError);
}

function needsMfaChallenge(mfaRequired: boolean, currentAAL: string | null) {
  return mfaRequired && currentAAL === "aal1";
}

function routeContent(children: ReactNode) {
  return children ?? <Outlet />;
}

export function AdminRoute({ children, requiredRole }: AdminRouteProps) {
  const { user, roles, rolesLoaded, rolesError, isLoading, currentAAL, hasMFA, mfaRequired } = useAuth();
  const [enrollOpen, setEnrollOpen] = useState(false);
  const hasAccess = hasRequiredRole(roles, requiredRole ?? "supervisor");

  useEffect(() => {
    if (hasAccess && !hasMFA && !isLoading && rolesLoaded) setEnrollOpen(true);
  }, [hasAccess, hasMFA, isLoading, rolesLoaded]);

  if (isRouteLoading(isLoading, Boolean(user), rolesLoaded)) {
    return <AdminRouteLoader />;
  }

  if (hasRoleLoadError(Boolean(user), rolesError)) return <PermissionsError />;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasAccess) {
    auditDeniedAccess(requiredRole);
    return <Navigate to="/403" replace />;
  }

  // Admin/manager sem MFA → mostra dialog de enrollment obrigatório (não renderiza filhos)
  if (!hasMFA) {
    return <EnrollmentGate open={enrollOpen} onOpenChange={setEnrollOpen} />;
  }

  // Admin/manager com MFA mas sessão em aal1 → exige challenge antes de renderizar filhos
  if (needsMfaChallenge(mfaRequired, currentAAL)) {
    return <ChallengeGate />;
  }

  return routeContent(children);
}
