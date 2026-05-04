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
    if (isChunkLoadError(error) || String(error).includes("412")) {
      logger.warn("[preview-reload] Erro detectado no window.error", { error });
      attemptChunkRecovery(error);
    }
  }, true);

  // Interceptar rejeições de promessas (comum em import() dinâmico)
  window.addEventListener("unhandledrejection", (event) => {
    const error = event.reason;
    if (isChunkLoadError(error) || String(error).includes("412")) {
      logger.warn("[preview-reload] Rejeição detectada", { error });
      attemptChunkRecovery(error);
    }
  });

  // Monitorar mudanças de visibilidade (re-validar quando o usuário volta para a aba)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      // Se houver algum indicativo de 412 no console ou estado, podemos forçar aqui
      // mas por enquanto confiamos nos interceptadores de erro
    }
  });

  logger.info("[preview-reload] Sistema de auto-reload para Erro 412 inicializado.");
}
