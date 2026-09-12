import { PermissionsError } from "./PermissionsError";
import { type ReactNode, useState, useEffect, forwardRef } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { MfaEnrollmentDialog } from "@/components/security/MfaEnrollmentDialog";
import { MfaChallengeDialog } from "@/components/security/MfaChallengeDialog";
import { toast } from "sonner";
import { hasRequiredRole } from "@/lib/access/role-policy";

interface AdminRouteProps {
  children?: ReactNode;
  /** Administração técnica por padrão; papel de negócio deve ser explícito. */
  requiredRole?: "dev" | "gestor_compras" | "supervisor";
}

export const AdminRoute = forwardRef<HTMLDivElement, AdminRouteProps>(function AdminRoute({ children, requiredRole }, ref) {
  const { user, roles, rolesLoaded, rolesError, isLoading, currentAAL, hasMFA, mfaRequired } = useAuth();
  const [enrollOpen, setEnrollOpen] = useState(false);
  const hasAccess = hasRequiredRole(roles, requiredRole ?? "supervisor");

  useEffect(() => {
    if (hasAccess && !hasMFA && !isLoading && rolesLoaded) setEnrollOpen(true);
  }, [hasAccess, hasMFA, isLoading, rolesLoaded]);

  if (isLoading || (user && !rolesLoaded)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user && rolesError) return <PermissionsError />;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasAccess) {
    // Audit failed access attempt
    import("@/utils/adminAudit").then(m => m.logAdminAction({
      event_type: 'SECURITY_CONFIG_CHANGE',
      entity_type: 'access_control',
      metadata: { 
        action: 'unauthorized_access_attempt',
        path: window.location.pathname,
        required_role: requiredRole || 'admin'
      }
    }));
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

  return children ? <div ref={ref}>{children}</div> : <div ref={ref}><Outlet /></div>;
});

AdminRoute.displayName = 'AdminRoute';
