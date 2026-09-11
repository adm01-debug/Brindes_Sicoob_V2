import { Fragment, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { registerServiceWorker } from "@/lib/sw-register";
import { installGlobalErrorHandlers } from "@/lib/error-reporter";
import { initSentry } from "@/lib/sentry";
import EnhancedErrorBoundary from "@/components/errors/EnhancedErrorBoundary";
import AuthEntry from "./AuthEntry";
import "@/lib/diagnostics"; // Initialize diagnostics early
import { setupPreviewAutoReload } from "@/lib/preview-auto-reload";
import { injectRequestId } from "@/lib/request-id-injection";
import "./index.css";


// Initialize Sentry FIRST (no-op if VITE_SENTRY_DSN is unset)
initSentry();

// Install global error handlers for unhandled errors/rejections
installGlobalErrorHandlers();

// Inject traceability headers
injectRequestId();

// A coleta usa PerformanceObserver com buffer e pode iniciar depois do paint.
// Isso impede que telemetria concorra com a tela de autenticação.
if (import.meta.env.PROD) {
  const startWebVitals = () => {
    import("@/lib/telemetry/webVitals").then(({ reportWebVitals }) => reportWebVitals());
  };
  const requestIdleCallback = Reflect.get(window, "requestIdleCallback") as Window["requestIdleCallback"] | undefined;
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback.call(window, startWebVitals, { timeout: 5_000 });
  } else {
    globalThis.setTimeout(startWebVitals, 3_000);
  }
}

// Inicializa auto-reload para erros de pré-condição (412) no preview
setupPreviewAutoReload();

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

// Sinalizar que a renderização inicial ocorreu para remover o splash screen do HTML
requestAnimationFrame(() => {
  const splash = document.getElementById('initial-splash');
  splash?.remove();
});

// Registrar Service Worker para PWA (apenas em produção para evitar cache issues no preview)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  registerServiceWorker()
    .catch(() => {
      // SW registration failed silently
    });
} else if ('serviceWorker' in navigator && import.meta.env.DEV) {
  // Em dev, desregistrar SWs antigos que possam estar cacheando
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(r => r.unregister());
  });
}
