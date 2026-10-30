/**
 * withRetry — Retries an async operation with exponential backoff.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelay?: number; shouldRetry?: (error: unknown) => boolean } = {}
): Promise<T> {
  const { maxRetries = 2, baseDelay = 500, shouldRetry = isRetryableError } = options;

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries && shouldRetry(err)) {
        await new Promise((r) => setTimeout(r, baseDelay * Math.pow(2, attempt)));
      } else {
        break;
      }
    }
  }
  throw lastError;
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("network") ||
      msg.includes("timeout") ||
      msg.includes("fetch") ||
      msg.includes("500") ||
      msg.includes("503") ||
      msg.includes("429")
    );
  }
  return false;
}

const VOICE_CONNECTION_ERROR = "Não foi possível conectar ao serviço de voz. Tente novamente.";

const FRIENDLY_ERROR_PATTERNS: Array<{ patterns: string[]; message: string }> = [
  { patterns: ["microphone", "microfone", "permission"], message: "Permissão do microfone negada. Habilite o microfone nas configurações do navegador." },
  { patterns: ["token"], message: "Não foi possível iniciar a transcrição. Tente novamente." },
  { patterns: ["timeout"], message: "A conexão de voz demorou demais para responder. Tente novamente." },
  { patterns: ["429", "rate limit"], message: "Muitas requisições. Aguarde alguns segundos e tente novamente." },
  { patterns: ["402", "credits"], message: "Créditos de IA esgotados. Contate o administrador." },
  { patterns: ["websocket", "scribe", "closed unexpectedly", "no reason provided"], message: VOICE_CONNECTION_ERROR },
  { patterns: ["network", "fetch"], message: "Erro de conexão. Verifique sua internet e tente novamente." },
  { patterns: ["tts", "audio"], message: "Não foi possível reproduzir o áudio. O comando foi executado silenciosamente." },
];

/**
 * Translates technical error messages to user-friendly Portuguese messages.
 */
export function friendlyErrorMessage(error: unknown): string {
  if (error instanceof Event) {
    return VOICE_CONNECTION_ERROR;
  }

  if (!(error instanceof Error)) return "Erro desconhecido. Tente novamente.";

  const rawMessage = error.message?.trim();
  if (!rawMessage) {
    return VOICE_CONNECTION_ERROR;
  }

  const msg = rawMessage.toLowerCase();

  return FRIENDLY_ERROR_PATTERNS.find(entry => entry.patterns.some(pattern => msg.includes(pattern)))?.message ?? rawMessage;
}
