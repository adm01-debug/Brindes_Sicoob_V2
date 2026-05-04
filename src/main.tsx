import { Fragment } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { registerServiceWorker } from "@/lib/sw-register";
import { installGlobalErrorHandlers } from "@/lib/error-reporter";
import { initSentry } from "@/lib/sentry";
import EnhancedErrorBoundary from "@/components/errors/EnhancedErrorBoundary";
import { Http412Inspector } from "@/components/debug/Http412Inspector";
import "@/lib/diagnostics"; // Initialize diagnostics early
import { setupPreviewAutoReload } from "@/lib/preview-auto-reload";
import { installHttp412Interceptor } from "@/lib/http-412-logger";
import { injectRequestId } from "@/lib/request-id-injection";
import { reportWebVitals } from "@/lib/telemetry/webVitals";
import App from "./App.tsx";
import "./index.css";


// Initialize Sentry FIRST (no-op if VITE_SENTRY_DSN is unset)
initSentry();

// Install global error handlers for unhandled errors/rejections
installGlobalErrorHandlers();

// Inject traceability headers
injectRequestId();

// Start Core Web Vitals monitoring
reportWebVitals();

// Captura HTTP 412/428 (Precondition Failed) e expõe na UI via Http412Inspector
installHttp412Interceptor();

// Inicializa auto-reload para erros de pré-condição (412) no preview
setupPreviewAutoReload();

const root = document.getElementById("root");

if (!root) {
  throw new Error('❌ Elemento root não encontrado no DOM');
}

// O overlay BridgeMetrics agora é montado DENTRO do <App /> (após o
// AuthProvider) para poder ser gateado por papel `dev` + SSOT
// `shouldShowDevInfraMessages`. Em build de produção, o componente
// retorna null no topo e o chunk é tree-shaken pelo bundler.
createRoot(root).render(
  <Fragment>
    <HelmetProvider>
      <EnhancedErrorBoundary>
        <App />
      </EnhancedErrorBoundary>
    </HelmetProvider>
  </Fragment>
);

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
