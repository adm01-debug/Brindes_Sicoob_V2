import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Auth from "@/pages/Auth";

const Toaster = lazy(() => import("@/components/ui/toaster").then(module => ({ default: module.Toaster })));
const Sonner = lazy(() => import("@/components/ui/sonner").then(module => ({ default: module.Toaster })));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const VerificationPage = lazy(() => import("@/pages/VerificationPage"));
const SSOCallbackPage = lazy(() => import("@/pages/SSOCallbackPage"));

function RouteFallback() {
  return (
    <main
      className="min-h-screen bg-[#F7FAFA]"
      role="status"
      aria-label="Carregando página"
    />
  );
}

/**
 * Recarrega uma navegação concluída pelo login para que a aplicação interna,
 * isolada em outro chunk, assuma o controle com todos os providers privados.
 */
function EnterPortal() {
  useEffect(() => {
    window.location.reload();
  }, []);

  return <RouteFallback />;
}

function DeferredNotifications() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Toasts não participam do primeiro paint. A espera fixa impede que um
    // callback ocioso antecipado concorra com o LCP em dispositivos modestos.
    const id = globalThis.setTimeout(() => setReady(true), 3_000);
    return () => globalThis.clearTimeout(id);
  }, []);

  if (!ready) return null;
  return (
    <Suspense fallback={null}>
      <Toaster />
      <Sonner />
    </Suspense>
  );
}

/**
 * Shell mínimo das rotas de autenticação. Mantém PDF, gráficos, catálogos,
 * telemetria da bridge e layouts internos fora do caminho crítico do login.
 */
export default function AuthEntry() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <DeferredNotifications />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/login" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verificacao" element={<VerificationPage />} />
              <Route path="/sso/callback" element={<SSOCallbackPage />} />
              <Route path="*" element={<EnterPortal />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
