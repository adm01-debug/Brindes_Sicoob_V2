/**
 * HTTP 412 (Precondition Failed) Logger
 * --------------------------------------
 * Captura globalmente respostas HTTP 412 (e correlatos de pré-condição)
 * via fetch interceptor, armazena em memória + sessionStorage e expõe
 * um pub/sub para a UI (`Http412Inspector`) renderizar em tempo real.
 *
 * Headers capturados (request + response): preserva apenas headers
 * relevantes para diagnóstico (sem expor Authorization).
 */

export interface Http412Entry {
  id: string;
  timestamp: number;
  url: string;
  method: string;
  status: number;
  statusText: string;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  responseBodyPreview?: string;
}

const STORAGE_KEY = "__http412_log__";
const MAX_ENTRIES = 50;

const SENSITIVE_HEADERS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "apikey",
  "x-api-key",
]);

function sanitizeHeaders(input: HeadersInit | Headers | undefined | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!input) return out;
  const append = (k: string, v: string) => {
    const key = k.toLowerCase();
    out[key] = SENSITIVE_HEADERS.has(key) ? "[REDACTED]" : v;
  };
  if (input instanceof Headers) {
    input.forEach((v, k) => append(k, v));
  } else if (Array.isArray(input)) {
    input.forEach(([k, v]) => append(k, String(v)));
  } else {
    Object.entries(input).forEach(([k, v]) => append(k, String(v)));
  }
  return out;
}

class Http412LoggerImpl {
  private entries: Http412Entry[] = [];
  private subscribers = new Set<(entries: Http412Entry[]) => void>();

  constructor() {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) this.entries = JSON.parse(raw);
    } catch {
      /* ignore */
    }
  }

  getEntries(): Http412Entry[] {
    return [...this.entries];
  }

  subscribe(cb: (entries: Http412Entry[]) => void): () => void {
    this.subscribers.add(cb);
    return () => this.subscribers.delete(cb);
  }

  clear(): void {
    this.entries = [];
    this.persist();
    this.notify();
  }

  add(entry: Http412Entry): void {
    this.entries = [entry, ...this.entries].slice(0, MAX_ENTRIES);
    this.persist();
    this.notify();
  }

  private persist(): void {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries));
    } catch {
      /* quota exceeded */
    }
  }

  private notify(): void {
    const snapshot = this.getEntries();
    this.subscribers.forEach((s) => s(snapshot));
  }
}

export const http412Logger = new Http412LoggerImpl();

let installed = false;

export function installHttp412Interceptor(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
    const reqHeaders =
      init?.headers ?? (input instanceof Request ? input.headers : undefined);

    let response: Response;
    try {
      response = await originalFetch(input as RequestInfo, init);
    } catch (err) {
      throw err;
    }

    // Captura status 412 (Precondition Failed) e variantes de pré-condição
    if (response.status === 412 || response.status === 428) {
      try {
        const cloned = response.clone();
        let bodyPreview: string | undefined;
        try {
          const text = await cloned.text();
          bodyPreview = text.slice(0, 500);
        } catch {
          /* ignore body parse errors */
        }

        const entry: Http412Entry = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          url,
          method,
          status: response.status,
          statusText: response.statusText,
          requestHeaders: sanitizeHeaders(reqHeaders),
          responseHeaders: sanitizeHeaders(response.headers),
          responseBodyPreview: bodyPreview,
        };
        http412Logger.add(entry);

        if (import.meta.env.DEV) {
          console.warn(
            `%c[HTTP ${response.status}] %c${method} ${url}`,
            "color:#ef4444;font-weight:bold;",
            "color:#6b7280;",
            entry,
          );
        }
      } catch {
        /* never throw from interceptor */
      }
    }

    return response;
  };
}
