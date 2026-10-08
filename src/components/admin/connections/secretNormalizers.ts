/**
 * Pure normalizers applied BEFORE validation to fix common copy/paste mistakes.
 *
 * Rules:
 *  - Never change semantics (don't swap http→https, don't decode base64, etc.)
 *  - Always idempotent: normalize(normalize(x)) === normalize(x)
 *  - Return a list of human-readable change descriptions for UI feedback
 */

export interface NormalizationResult {
  value: string;
  changes: string[];
}

const TRAILING_SLASH_REMOVED = "barra final removida";
const QUERY_REMOVED = "query removida";
const FRAGMENT_REMOVED = "fragmento removido";

function stripQuotes(s: string, changes: string[]): string {
  if (s.length >= 2) {
    const first = s[0];
    const last = s[s.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      changes.push("aspas envolventes removidas");
      return s.slice(1, -1);
    }
  }
  return s;
}

function trimEdges(s: string, changes: string[]): string {
  const t = s.trim();
  if (t !== s) changes.push("espaços removidos");
  return t;
}

function stripAllWhitespace(s: string, changes: string[]): string {
  if (/\s/.test(s)) {
    changes.push("quebras de linha removidas");
    return s.replace(/\s+/g, "");
  }
  return s;
}

function stripBearer(s: string, changes: string[]): string {
  const m = s.match(/^Bearer\s+(.+)$/i);
  if (m) {
    changes.push("prefixo Bearer removido");
    return m[1] ?? s;
  }
  return s;
}

function recordSupabaseUrlChanges(url: URL, raw: string, rebuilt: string, changes: string[]): void {
  if (url.hostname.toLowerCase() !== url.hostname) changes.push("host normalizado para minúsculas");
  const originalUrl = `${url.protocol}//${url.hostname}${url.pathname.replace(/\/$/, "")}${url.search}${url.hash}`;
  if (rebuilt === originalUrl) {
    if (raw.endsWith("/")) changes.push(TRAILING_SLASH_REMOVED);
    return;
  }
  if (url.pathname && url.pathname !== "/") changes.push("caminho removido");
  if (url.search) changes.push(QUERY_REMOVED);
  if (url.hash) changes.push(FRAGMENT_REMOVED);
  if (raw.endsWith("/") && rebuilt !== raw) changes.push(TRAILING_SLASH_REMOVED);
}

function normalizeSupabaseUrl(raw: string): NormalizationResult {
  const changes: string[] = [];
  let v = trimEdges(raw, changes);
  v = stripQuotes(v, changes);
  v = trimEdges(v, changes);
  try {
    const u = new URL(v);
    const host = u.hostname.toLowerCase();
    const rebuilt = `${u.protocol}//${host}`;
    recordSupabaseUrlChanges(u, v, rebuilt, changes);
    return { value: rebuilt, changes };
  } catch {
    // Not a parseable URL — leave as-is, validator will catch it.
    return { value: v, changes };
  }
}

function normalizeJwt(raw: string): NormalizationResult {
  const changes: string[] = [];
  let v = trimEdges(raw, changes);
  v = stripQuotes(v, changes);
  v = stripBearer(v, changes);
  v = stripAllWhitespace(v, changes);
  return { value: v, changes };
}

function normalizeBitrixWebhook(raw: string): NormalizationResult {
  const changes: string[] = [];
  let v = trimEdges(raw, changes);
  v = stripQuotes(v, changes);
  try {
    const u = new URL(v);
    if (u.search) changes.push(QUERY_REMOVED);
    if (u.hash) changes.push(FRAGMENT_REMOVED);
    let path = u.pathname;
    if (!path.endsWith("/")) {
      path += "/";
      changes.push("barra final adicionada");
    }
    return { value: `${u.protocol}//${u.hostname.toLowerCase()}${path}`, changes };
  } catch {
    return { value: v, changes };
  }
}

function normalizeBitrixDomain(raw: string): NormalizationResult {
  const changes: string[] = [];
  let v = trimEdges(raw, changes);
  v = stripQuotes(v, changes);
  const before = v;
  v = v.replace(/^https?:\/\//i, "");
  if (v !== before) changes.push("protocolo removido");
  if (v.endsWith("/")) {
    v = v.replace(/\/+$/, "");
    changes.push(TRAILING_SLASH_REMOVED);
  }
  const lower = v.toLowerCase();
  if (lower !== v) changes.push("host normalizado para minúsculas");
  return { value: lower, changes };
}

function normalizeDigitsOnly(raw: string): NormalizationResult {
  const changes: string[] = [];
  const v = trimEdges(raw, changes);
  const stripped = v.replace(/\D+/g, "");
  if (stripped !== v) changes.push("caracteres não-numéricos removidos");
  return { value: stripped, changes };
}

function normalizeN8nBaseUrl(raw: string): NormalizationResult {
  const changes: string[] = [];
  let v = trimEdges(raw, changes);
  v = stripQuotes(v, changes);
  try {
    const u = new URL(v);
    if (u.pathname && u.pathname !== "/" && u.pathname !== "") changes.push("caminho removido");
    if (u.search) changes.push(QUERY_REMOVED);
    if (u.hash) changes.push(FRAGMENT_REMOVED);
    if (v.endsWith("/")) changes.push(TRAILING_SLASH_REMOVED);
    return { value: `${u.protocol}//${u.hostname.toLowerCase()}`, changes };
  } catch {
    return { value: v, changes };
  }
}

function normalizeMcpUrl(raw: string): NormalizationResult {
  const changes: string[] = [];
  let v = trimEdges(raw, changes);
  v = stripQuotes(v, changes);
  return { value: v, changes };
}

function normalizeSecretToken(raw: string): NormalizationResult {
  const changes: string[] = [];
  let v = trimEdges(raw, changes);
  v = stripQuotes(v, changes);
  v = stripAllWhitespace(v, changes);
  return { value: v, changes };
}

function normalizeDefault(raw: string): NormalizationResult {
  const changes: string[] = [];
  const v = trimEdges(raw, changes);
  return { value: v, changes };
}

type SecretNormalizer = (raw: string) => NormalizationResult;

const SECRET_NORMALIZERS: Record<string, SecretNormalizer> = {
  EXTERNAL_PROMOBRIND_URL: normalizeSupabaseUrl,
  EXTERNAL_CRM_URL: normalizeSupabaseUrl,
  EXTERNAL_PROMOBRIND_ANON_KEY: normalizeJwt,
  EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY: normalizeJwt,
  EXTERNAL_CRM_ANON_KEY: normalizeJwt,
  EXTERNAL_CRM_SERVICE_ROLE_KEY: normalizeJwt,
  BITRIX24_WEBHOOK_URL: normalizeBitrixWebhook,
  BITRIX24_DOMAIN: normalizeBitrixDomain,
  BITRIX24_USER_ID: normalizeDigitsOnly,
  BITRIX24_TOKEN: normalizeSecretToken,
  N8N_BASE_URL: normalizeN8nBaseUrl,
  N8N_API_KEY: normalizeJwt,
  MCP_SERVER_URL: normalizeMcpUrl,
  MCP_SHARED_SECRET: normalizeSecretToken,
};

export function normalizeSecret(name: string, raw: string): NormalizationResult {
  const normalizer = SECRET_NORMALIZERS[name];
  if (normalizer) return normalizer(raw);
  if (/_HMAC_|_SECRET_|_HMAC$|_SECRET$/.test(name)) return normalizeSecretToken(raw);
  return normalizeDefault(raw);
}
