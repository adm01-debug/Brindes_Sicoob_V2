import { lazy, type ComponentType } from 'react';
import { logger } from "@/lib/logger";
import { attemptChunkRecovery, isChunkLoadError } from "@/lib/chunk-recovery";

/**
 * Wrapper around React.lazy that retries on chunk loading failures.
 * Handles stale cache issues after deployments and Vite 502 spikes.
 *
 * Camadas de defesa:
 *   1. Retry in-memory com backoff (até `retries` tentativas) — cobre
 *      blip de rede curto sem incomodar o usuário.
 *   2. Após retries esgotados, delega para `attemptChunkRecovery`, que faz
 *      hard-reload com cache-bust + purga de Service Worker / Cache API.
 *      Se já estourou o limite de reloads na janela, propaga o erro para
 *      a Error Boundary exibir tela estável (evita loop = tela branca).
 */
export function lazyWithRetry<M extends { default: ComponentType<never> }>(
  componentImport: () => Promise<M>,
  retries = 3,
  interval = 1000
): React.LazyExoticComponent<M["default"]> {
  type LoadedModule = Awaited<ReturnType<typeof componentImport>>;

  return lazy<M["default"]>(async () => {
    let lastError: Error | undefined;

    for (let i = 0; i < retries; i++) {
      try {
        const component = await componentImport();
        // Once loaded, clear any pending recovery state for this component
        if (i > 0) {
          logger.info(`Chunk recovered after ${i + 1} attempts`);
        }
        return component;
      } catch (error) {
        lastError = error as Error;

        // Cover silent fetch failures or timeout errors often seen on mobile/unstable networks
        const shouldRetry = isChunkLoadError(error) || 
                           (error instanceof Error && (
                             error.message.includes("Network request failed") ||
                             error.message.includes("Timeout")
                           ));

        if (shouldRetry) {
          const delay = interval * (i + 1);
          logger.warn(`Chunk load failed (attempt ${i + 1}/${retries}), retrying in ${delay}ms...`, error);
          await new Promise(resolve => setTimeout(resolve, delay));

          // Last attempt before giving up or doing hard reload
          if (i === retries - 1) {
            const reloaded = await attemptChunkRecovery(error);
            if (reloaded) {
              // Navigation triggered, return a never-resolving promise to keep Suspense active
              return new Promise<LoadedModule>(() => {});
            }
            throw error;
          }
        } else {
          // Immediate failure for logic/syntax errors
          throw error;
        }
      }
    }

    // Should never reach here, but just in case
    throw lastError;
  });
}
