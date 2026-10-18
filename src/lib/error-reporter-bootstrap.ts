export interface ErrorReporterModule {
  installGlobalErrorHandlers: () => void;
  reportError: (error: Error, metadata: Record<string, unknown>) => void;
}

interface QueuedRuntimeError {
  error: Error;
  metadata: Record<string, unknown>;
}

interface BootstrapErrorReporterOptions {
  load: () => Promise<ErrorReporterModule>;
  queuedErrors: QueuedRuntimeError[];
  removeEarlyListeners: () => void;
  retries?: number;
  retryDelayMs?: number;
  wait?: (delayMs: number) => Promise<void>;
}

const waitFor = (delayMs: number) => new Promise<void>((resolve) => {
  globalThis.setTimeout(resolve, delayMs);
});

/**
 * Carrega o reporter fora do caminho crítico. Os listeners precoces só são
 * removidos depois que o módulo definitivo estiver pronto, evitando uma janela
 * sem captura quando um chunk falha durante um deploy.
 */
export async function bootstrapErrorReporter({
  load,
  queuedErrors,
  removeEarlyListeners,
  retries = 2,
  retryDelayMs = 500,
  wait = waitFor,
}: BootstrapErrorReporterOptions): Promise<boolean> {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const { installGlobalErrorHandlers, reportError } = await load();
      installGlobalErrorHandlers();
      removeEarlyListeners();
      queuedErrors.splice(0).forEach(({ error, metadata }) => reportError(error, metadata));
      return true;
    } catch (error) {
      if (attempt === retries) {
        console.error('[bootstrap] Não foi possível carregar o reporter de erros.', error);
        return false;
      }
      await wait(retryDelayMs * (attempt + 1));
    }
  }
  return false;
}
