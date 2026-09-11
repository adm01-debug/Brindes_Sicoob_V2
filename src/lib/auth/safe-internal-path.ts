const PORTAL_ORIGIN = "https://portal.invalid";

function containsForbiddenCharacter(value: string): boolean {
  for (const character of value) {
    if (character === "\\" || character.charCodeAt(0) <= 32) return true;
  }
  return false;
}

function isUnsafeCandidate(value: string): boolean {
  return !value.startsWith("/") || value.startsWith("//") || containsForbiddenCharacter(value);
}

/** Aceita apenas caminhos internos, inclusive ao restaurar a rota após login. */
export function safeInternalPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || isUnsafeCandidate(value)) return fallback;
  try {
    const decoded = decodeURIComponent(value);
    if (isUnsafeCandidate(decoded)) return fallback;
    const url = new URL(value, PORTAL_ORIGIN);
    if (url.origin !== PORTAL_ORIGIN || ["/login", "/auth"].includes(url.pathname)) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
