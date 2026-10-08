import type { SecretMutationResult, SecretError } from "@/hooks/useSecretsManager";

/**
 * Detects retryable network errors: timeouts, fetch failures, 5xx responses.
 * Auth/validation errors are NOT retried (fail fast).
 */
export function isRetryableSecretError(err: SecretError | undefined): boolean {
  if (!err) return false;
  const message = (err.message || "").toLowerCase();
  const code = (err.code || "").toLowerCase();
  const forbiddenCodes = new Set(["forbidden", "not_whitelisted", "invalid_value", "unauthorized"]);
  if (forbiddenCodes.has(code)) return false;
  if (["network", "failed to fetch", "timeout", "timed out"].some(term => message.includes(term))) return true;
  if (message.includes("aborted")) return code === "db_error";
  const serverTerms = [" 500", " 502", " 503", " 504", "internal server error", "bad gateway", "service unavailable", "gateway timeout"];
  return serverTerms.some(term => message.includes(term)) || code === "db_error";
}

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  signal?: AbortSignal;
  onAttempt?: (attempt: number, nextDelayMs: number | null) => void;
}

export class CancelledError extends Error {
  constructor() {
    super("cancelled");
    this.name = "CancelledError";
  }
}

function throwIfCancelled(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw new CancelledError();
}

function notifyAttempt(callback: RetryOptions["onAttempt"], attempt: number, delay: number | null): void {
  callback?.(attempt, delay);
}

function waitForRetry(delay: number, signal: AbortSignal | undefined): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(new CancelledError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, delay);
    if (!signal) return;
    if (signal.aborted) {
      clearTimeout(timer);
      reject(new CancelledError());
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Runs `fn` with exponential backoff retries on retryable network/5xx errors.
 * Cancellable via AbortSignal — rejects with CancelledError immediately.
 */
export async function withRetryBackoff(
  fn: () => Promise<SecretMutationResult>,
  options: RetryOptions = {},
): Promise<SecretMutationResult> {
  const { maxAttempts = 3, baseDelayMs = 600, signal, onAttempt } = options;

  let lastResult: SecretMutationResult | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    throwIfCancelled(signal);
    notifyAttempt(onAttempt, attempt, null);
    const result = await fn();
    lastResult = result;

    if (result.ok) return result;
    if (!isRetryableSecretError(result.error)) return result;
    if (attempt === maxAttempts) return result;

    // Exponential backoff with small jitter: 600ms, 1200ms, 2400ms…
    const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 150);
    notifyAttempt(onAttempt, attempt, delay);
    await waitForRetry(delay, signal);
  }

  return (lastResult ?? { ok: false, error: { code: "unexpected", message: "Sem resultado" } });
}
