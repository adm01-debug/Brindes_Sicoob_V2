import type { ErrorKind } from "@/hooks/useConnectionTester";

const MESSAGE_KIND_PATTERNS: ReadonlyArray<[RegExp, ErrorKind]> = [
  [/timeout|timed?\s?out|abort/, "timeout"],
  [/dns|enotfound|getaddrinfo|name not resolved/, "dns"],
  [/network|fetch failed|econnrefused|econnreset|socket|tls|ssl/, "network"],
  [/unauthor|forbidden|invalid.*(token|key|secret|credential)|expired.*(token|key)/, "auth"],
];

function inferMessageKind(message: string): ErrorKind | null {
  return MESSAGE_KIND_PATTERNS.find(([pattern]) => pattern.test(message))?.[1] ?? null;
}

function inferConfigOrUnknown(message: string): ErrorKind {
  return /config|missing.*(url|secret|key|env)/.test(message) ? "config" : "unknown";
}

/**
 * Infere `error_kind` a partir de `error_message` + `status_code` para registros
 * antigos do `connection_test_history` que foram persistidos antes do backend
 * passar a gravar `error_kind`. Quando o backend já gravou um kind (novos
 * registros), retorna-o como-está. Sucessos retornam `null`.
 *
 * SSOT do fallback no client — não duplicar no edge (lá usamos detecção direta
 * via `err.name === "AbortError"` e HTTP status no momento do erro).
 */
export function inferErrorKind(opts: {
  errorKind?: string | null;
  errorMessage?: string | null;
  statusCode?: number | null;
  success?: boolean | null;
}): ErrorKind | null {
  if (opts.success) return null;
  if (opts.errorKind) return opts.errorKind as ErrorKind;

  const msg = (opts.errorMessage ?? "").toLowerCase();
  const status = opts.statusCode ?? null;
  const hasAuthStatus = [401, 403].includes(status ?? 0);
  const messageKind = inferMessageKind(msg);

  if (messageKind) return messageKind;
  if (hasAuthStatus) return "auth";
  if (typeof status === "number" && status >= 400) return "http";
  return inferConfigOrUnknown(msg);
}
