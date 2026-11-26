import { useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { MfaEnrollmentDialog } from "@/components/security/MfaEnrollmentDialog";
import { MfaChallengeDialog } from "@/components/security/MfaChallengeDialog";

function GateLoader() {
  return (
    <div
      data-route-pending="mfa"
      className="min-h-screen flex items-center justify-center bg-background"
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

/**
 * Telas de gestor que espelham telas administrativas exigem o mesmo segundo
 * fator do AdminRoute: alocar verba e ler canais de alerta são operações
 * equivalentes às de /admin/verbas e /admin/sicoob.
 */
export function MfaGate({ children }: { children: ReactNode }) {
  const { user, isLoading, rolesLoaded, hasMFA, mfaRequired, currentAAL } = useAuth();
  const [enrollOpen, setEnrollOpen] = useState(false);

  useEffect(() => {
    if (user && !hasMFA && !isLoading && rolesLoaded) setEnrollOpen(true);
  }, [user, hasMFA, isLoading, rolesLoaded]);

  if (isLoading || (user && !rolesLoaded)) return <GateLoader />;
  if (!user) return <>{children}</>;

  if (!hasMFA) {
    return (
      <>
        <GateLoader />
        <MfaEnrollmentDialog
          open={enrollOpen}
          onOpenChange={setEnrollOpen}
          enforce
        />
      </>
    );
  }

  if (mfaRequired && currentAAL === "aal1") {
    return (
      <>
        <GateLoader />
        <MfaChallengeDialog open />
      </>
    );
  }

  return <>{children}</>;
}
