import { attemptChunkRecovery, isChunkLoadError } from "@/lib/chunk-recovery";
import { logger } from "@/lib/logger";

/**
 * Interceptador global de erros de rede que disparam falha de pré-condição (412)
 * ou erros de chunk no ambiente de preview.
 */
export function setupPreviewAutoReload() {
  if (typeof window === "undefined") return;

  // Interceptar erros não tratados de carregamento de recursos
  window.addEventListener("error", (event) => {
    const error = event.error || event.message;
    // Se o erro for de chunk ou contiver 412, tentamos o recovery
    if (isChunkLoadError(error) || String(error).includes("412") || String(error).includes("Precondition Failed")) {
      logger.warn("[preview-reload] Erro detectado no window.error", { error });
      attemptChunkRecovery(error);
    }
  }, true);

  // Interceptar rejeições de promessas (comum em import() dinâmico)
  window.addEventListener("unhandledrejection", (event) => {
    const error = event.reason;
    if (isChunkLoadError(error) || String(error).includes("412") || String(error).includes("Precondition Failed")) {
      logger.warn("[preview-reload] Rejeição detectada", { error });
      attemptChunkRecovery(error);
    }
  });

  // Forçar limpeza agressiva se detectarmos falha de handshake no bridge
  if (window.location.search.includes("error=412") || window.location.search.includes("precondition_failed")) {
     logger.warn("[preview-reload] Detectado erro 412 na URL, limpando armazenamento...");
     sessionStorage.clear();
     // Remove cache-bust para evitar loop infinito na URL se o hard reload falhar
     const cleanUrl = new URL(window.location.href);
     cleanUrl.searchParams.delete("error");
     window.history.replaceState({}, "", cleanUrl.toString());
  }

  logger.info("[preview-reload] Sistema de auto-reload para Erro 412 inicializado.");
}
