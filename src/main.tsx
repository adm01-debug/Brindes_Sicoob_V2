import { Fragment, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import EnhancedErrorBoundary from "@/components/errors/EnhancedErrorBoundary";
import AuthEntry from "./AuthEntry";
import { bootstrapErrorReporter } from "@/lib/error-reporter-bootstrap";
import { injectRequestId } from "@/lib/request-id-injection";
import "./index.css";


// Inject traceability headers
injectRequestId();

// Captura falhas do bootstrap sem promover o reporter completo (Supabase,
// Sentry e telemetria) para o caminho crítico do login. A fila é drenada assim
// que o módulo de observabilidade assume os listeners globais.
const earlyRuntimeErrors: Array<{
  error: Error;
  metadata: Record<string, unknown>;
}> = [];
const queueEarlyRuntimeError = (error: Error, metadata: Record<string, unknown>) => {
  if (earlyRuntimeErrors.length < 20) earlyRuntimeErrors.push({ error, metadata });
};
const onEarlyError = (event: ErrorEvent) => {
  queueEarlyRuntimeError(event.error instanceof Error ? event.error : new Error(event.message), {
    type: "unhandled_error",
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
};
const onEarlyRejection = (event: PromiseRejectionEvent) => {
  queueEarlyRuntimeError(
    event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
    { type: "unhandled_promise_rejection" },
  );
};
window.addEventListener("error", onEarlyError);
window.addEventListener("unhandledrejection", onEarlyRejection);

// A coleta usa PerformanceObserver com buffer e pode iniciar depois do paint.
// Isso impede que telemetria concorra com a tela de autenticação.
if (import.meta.env.PROD) {
  globalThis.setTimeout(() => {
    void import("@/lib/telemetry/webVitals").then(({ reportWebVitals }) => reportWebVitals());
  }, 3_000);
}

// Observabilidade, diagnóstico e recuperação de chunks entram depois do LCP.
// Os imports dinâmicos preservam a proteção sem onerar a primeira tela pública.
globalThis.setTimeout(() => {
  void import("@/lib/sentry").then(({ initSentry }) => initSentry());
  void bootstrapErrorReporter({
    load: () => import("@/lib/error-reporter"),
    queuedErrors: earlyRuntimeErrors,
    removeEarlyListeners: () => {
      window.removeEventListener("error", onEarlyError);
      window.removeEventListener("unhandledrejection", onEarlyRejection);
    },
  });
  void import("@/lib/preview-auto-reload").then(({ setupPreviewAutoReload }) => setupPreviewAutoReload());
  void import("@/lib/diagnostics");
}, 3_000);

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('❌ Elemento root não encontrado no DOM');
}

const authEntryPaths = new Set([
  "/login",
  "/reset-password",
  "/verificacao",
  "/sso/callback",
]);

// O shell público de autenticação fica isolado do aplicativo interno. Assim,
// login e recuperação não baixam módulos de catálogo, PDF, BI ou administração.
const RootApplication = authEntryPaths.has(window.location.pathname)
  ? AuthEntry
  : lazy(() => import("./App"));

createRoot(rootElement).render(
  <Fragment>
    <HelmetProvider>
      <EnhancedErrorBoundary>
        <Suspense
          fallback={(
            <main
              className="min-h-screen bg-[#003641]"
              role="status"
              aria-label="Carregando portal"
            />
          )}
        >
          <RootApplication />
        </Suspense>
      </EnhancedErrorBoundary>
    </HelmetProvider>
  </Fragment>
);

// Mantém o shell institucional por um paint completo enquanto o React conclui
// o primeiro commit. Remover no primeiro callback de rAF apaga o splash antes
// de ele ser pintado e cria um intervalo visual vazio em dispositivos lentos.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const splash = document.getElementById('initial-splash');
    splash?.remove();
  });
});

// Registrar Service Worker para PWA (apenas em produção para evitar cache issues no preview)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  globalThis.setTimeout(() => {
    void import("@/lib/sw-register")
      .then(({ registerServiceWorker }) => registerServiceWorker())
      .catch(() => {
        // Falha de registro não deve interromper a navegação.
      });
  }, 3_000);
} else if ('serviceWorker' in navigator && import.meta.env.DEV) {
  // Em dev, desregistrar SWs antigos que possam estar cacheando
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(r => r.unregister());
  });
}
