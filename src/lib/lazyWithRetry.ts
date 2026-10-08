import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { logger } from "@/lib/logger";
import { attemptChunkRecovery, isChunkLoadError } from "@/lib/chunk-recovery";

function isRetryableImportError(error: unknown): boolean {
  if (isChunkLoadError(error)) return true;
  if (!(error instanceof Error)) return false;
  return error.message.includes("Network request failed") || error.message.includes("Timeout");
}

async function handleImportFailure(
  error: unknown,
  attempt: number,
  retries: number,
  interval: number,
): Promise<boolean> {
  if (!isRetryableImportError(error)) throw error;
  const delay = interval * (attempt + 1);
  logger.warn(`Chunk load failed (attempt ${attempt + 1}/${retries}), retrying in ${delay}ms...`, error);
  await new Promise((resolve) => setTimeout(resolve, delay));
  if (attempt !== retries - 1) return false;
  const reloaded = await attemptChunkRecovery(error);
  if (!reloaded) throw error;
  return true;
}

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
// `ComponentType<any>` acompanha a assinatura de `React.lazy`: qualquer outro
// constraint quebra a inferência das props reais de cada componente lazy.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<M extends { default: ComponentType<any> }>(
  componentImport: () => Promise<M>,
  retries = 3,
  interval = 1000
): LazyExoticComponent<M["default"]> {
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
        const recoveryStarted = await handleImportFailure(error, i, retries, interval);
        if (recoveryStarted) return new Promise<LoadedModule>(() => {});
      }
    }

    // Should never reach here, but just in case
    throw lastError;
  });
}
