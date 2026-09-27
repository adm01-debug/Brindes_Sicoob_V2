/**
 * Wrapper resiliente para fetch a APIs externas com circuit breaker integrado.
 *
 * Uso:
 *   import { fetchWithBreaker } from "../_shared/external-fetch.ts";
 *   const res = await fetchWithBreaker("bitrix", "https://api.bitrix.com/...", { method: "POST" });
 *
 * Hardening defensivo:
 * - Rejeita URLs sem HTTPS e destinos locais/reservados (anti-SSRF). Em testes locais, `ALLOW_HTTP_FETCH=1` libera HTTP.
 * - Aplica timeout finito a toda chamada, inclusive quando o provedor não responde.
 * - Falhas HTTP 5xx/network contam como falha; 2xx/3xx/4xx contam como sucesso.
 * - Se circuito OPEN, lança `CircuitOpenError` imediatamente.
 */
import { getBreaker } from "./circuit-breaker.ts";

export class CircuitOpenError extends Error {
  constructor(public service: string) {
    super(`circuit_open:${service}`);
    this.name = "CircuitOpenError";
  }
}

export class InsecureUrlError extends Error {
  constructor(public url: string) {
    super(`insecure_url:${url}`);
    this.name = "InsecureUrlError";
  }
}

export class ExternalFetchTimeoutError extends Error {
  constructor(public timeoutMs: number) {
    super(`external_fetch_timeout:${timeoutMs}`);
    this.name = "ExternalFetchTimeoutError";
  }
}

const DEFAULT_TIMEOUT_MS = 15_000;

function isReservedIpv4(hostname: string): boolean {
  const octets = hostname.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return false;
  }
  const [first, second] = octets as [number, number, number, number];
  return first === 0 || first === 10 || first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168);
}

function isReservedIpv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return normalized === "::1" || normalized === "::" ||
    normalized.startsWith("fc") || normalized.startsWith("fd") ||
    normalized.startsWith("fe80:") || normalized.startsWith("::ffff:127.");
}

/** Valida protocolo e bloqueia destinos locais que poderiam expor a rede interna. */
export function assertExternalUrl(url: string | URL): void {
  const allowHttp = Deno.env.get("ALLOW_HTTP_FETCH") === "1";
  const rawUrl = typeof url === "string" ? url : url.toString();
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new InsecureUrlError(rawUrl);
  }
  if ((!allowHttp && parsed.protocol !== "https:") ||
      (allowHttp && parsed.protocol !== "https:" && parsed.protocol !== "http:") ||
      parsed.username || parsed.password ||
      parsed.hostname === "localhost" || parsed.hostname.endsWith(".localhost") ||
      isReservedIpv4(parsed.hostname) || isReservedIpv6(parsed.hostname)) {
    throw new InsecureUrlError(rawUrl);
  }
}

/**
 * Faz uma chamada externa com timeout. O sinal recebido pelo chamador continua
 * funcionando e encerra a requisição antes do prazo local quando necessário.
 */
export async function fetchExternal(
  url: string | URL,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  assertExternalUrl(url);
  const controller = new AbortController();
  const callerSignal = init.signal;
  const abortFromCaller = () => controller.abort(callerSignal?.reason);
  if (callerSignal?.aborted) abortFromCaller();
  else callerSignal?.addEventListener("abort", abortFromCaller, { once: true });

  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (timedOut) throw new ExternalFetchTimeoutError(timeoutMs);
    throw err;
  } finally {
    clearTimeout(timeout);
    callerSignal?.removeEventListener("abort", abortFromCaller);
  }
}

export async function fetchWithBreaker(
  service: string,
  url: string | URL,
  init?: RequestInit,
): Promise<Response> {
  const breaker = getBreaker(service);
  if (!breaker.canRequest()) {
    throw new CircuitOpenError(service);
  }

  try {
    const res = await fetchExternal(url, init);
    if (res.status >= 500) {
      breaker.recordFailure();
    } else {
      breaker.recordSuccess();
    }
    return res;
  } catch (err) {
    breaker.recordFailure();
    throw err;
  }
}

/**
 * Helper para responder 503 + Retry-After quando circuito aberto.
 * Use em catch blocks: `if (err instanceof CircuitOpenError) return circuitOpenResponse(err, corsHeaders);`
 */
export function circuitOpenResponse(
  err: CircuitOpenError,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({
      error: "Service temporarily unavailable",
      service: err.service,
      retry_after_seconds: 60,
    }),
    {
      status: 503,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": "60",
      },
    },
  );
}
