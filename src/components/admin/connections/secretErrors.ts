/**
 * Centralized translation of backend errors for credentials.
 * All Connections components must use these helpers so the user
 * always sees the same wording, tone and structure.
 *
 * Tone guidelines:
 * - Address the admin directly, second-person ("verifique", "tente").
 * - Keep messages action-oriented (what to do next).
 * - Avoid raw stack traces, HTTP codes or English jargon.
 */
import type { SecretError } from "@/hooks/useSecretsManager";

const RETRY_LATER_HINT = "Aguarde alguns segundos e tente novamente.";

export type SecretErrorCategory =
  | "permission"
  | "validation"
  | "whitelist"
  | "network"
  | "timeout"
  | "rate_limit"
  | "conflict"
  | "server"
  | "unknown";

export interface NormalizedSecretError {
  /** Short tag rendered as a chip ("Permissão", "Validação", ...). */
  category: SecretErrorCategory;
  /** Localized chip label. */
  categoryLabel: string;
  /** Single-sentence headline ("Falha ao salvar API_KEY"). */
  title: string;
  /** Plain-language description of what happened. */
  description: string;
  /** Optional action hint ("Tente novamente em alguns segundos."). */
  hint?: string;
  /** Stable code so callers can branch (e.g., disable retry on permission). */
  code: string;
  /** True for transient errors that benefit from a manual retry. */
  retryable: boolean;
}

const CATEGORY_LABELS: Record<SecretErrorCategory, string> = {
  permission: "Permissão",
  validation: "Validação",
  whitelist: "Bloqueado",
  network: "Conexão",
  timeout: "Tempo esgotado",
  rate_limit: "Muitas tentativas",
  conflict: "Conflito",
  server: "Servidor",
  unknown: "Erro",
};

function lower(s: string | undefined): string {
  return (s ?? "").toLowerCase();
}

type SecretAction = NonNullable<Parameters<typeof normalizeSecretError>[2]>["action"];
type ErrorOptions = { hint?: string; retryable?: boolean; title?: string };
type ErrorFactory = (category: SecretErrorCategory, description: string, options?: ErrorOptions) => NormalizedSecretError;

const ACTION_VERBS: Record<NonNullable<SecretAction>, string> = {
  save: "salvar",
  rotate: "rotacionar",
  delete: "remover",
  refresh: "atualizar",
  test: "testar",
};

function createErrorFactory(code: string, title: string): ErrorFactory {
  return (category, description, options = {}) => ({
    category,
    categoryLabel: CATEGORY_LABELS[category],
    title: options.title ?? title,
    description,
    hint: options.hint,
    code,
    retryable: options.retryable ?? false,
  });
}

function normalizeStructuredError(
  code: string,
  rawMessage: string | undefined,
  secretName: string,
  make: ErrorFactory,
): NormalizedSecretError | null {
  if (code === "forbidden" || code === "unauthorized") {
    return make("permission", "Apenas administradores podem alterar esta credencial.", {
      hint: "Peça acesso a um administrador antes de tentar novamente.",
    });
  }
  if (code === "not_whitelisted") {
    return make("whitelist", `O nome "${secretName}" não está na lista permitida de credenciais.`, {
      hint: "Confirme se o nome digitado está correto ou solicite a inclusão na whitelist.",
    });
  }
  if (code === "invalid_value" || code === "validation_error") {
    return make("validation", rawMessage?.trim() || "O valor informado não atende aos requisitos mínimos.", {
      hint: "Confira o formato esperado para esta credencial e tente novamente.",
    });
  }
  return normalizeTransientStructuredError(code, rawMessage, make);
}

function normalizeTransientStructuredError(
  code: string,
  rawMessage: string | undefined,
  make: ErrorFactory,
): NormalizedSecretError | null {
  const entries: Record<string, () => NormalizedSecretError> = {
    rate_limited: () => make("rate_limit", "Muitas tentativas em pouco tempo.", { hint: "Aguarde alguns segundos antes de tentar novamente.", retryable: true }),
    timeout: () => make("timeout", "O servidor demorou demais para responder.", { hint: "Verifique sua conexão e tente novamente em instantes.", retryable: true }),
    network_error: () => make("network", "Não foi possível alcançar o servidor.", { hint: "Verifique sua conexão e tente novamente.", retryable: true }),
    conflict: () => make("conflict", "Outra alteração foi feita em paralelo.", { hint: "Recarregue a credencial e refaça a operação." }),
    db_error: () => make("server", rawMessage?.trim() || "Erro interno ao gravar no banco.", { hint: RETRY_LATER_HINT, retryable: true }),
    server_error: () => make("server", rawMessage?.trim() || "Erro interno ao gravar no banco.", { hint: RETRY_LATER_HINT, retryable: true }),
  };
  return entries[code]?.() ?? null;
}

function containsAny(message: string, fragments: string[]): boolean {
  return fragments.some(fragment => message.includes(fragment));
}

function normalizeMessageError(message: string, secretName: string, make: ErrorFactory): NormalizedSecretError | null {
  if (containsAny(message, ["not allowed", "forbidden", "permission"])) {
    return make("permission", "Apenas administradores podem alterar esta credencial.", { hint: "Peça acesso a um administrador antes de tentar novamente." });
  }
  if (containsAny(message, ["whitelist", "não permitido"])) {
    return make("whitelist", `O nome "${secretName}" não está na lista permitida.`, { hint: "Confirme o nome ou solicite a inclusão na whitelist." });
  }
  if (containsAny(message, ["timeout", "aborted", "timed out"])) {
    return make("timeout", "O servidor demorou demais para responder.", { hint: "Tente novamente em instantes.", retryable: true });
  }
  return normalizeNetworkMessageError(message, make);
}

function normalizeNetworkMessageError(message: string, make: ErrorFactory): NormalizedSecretError | null {
  if (containsAny(message, ["network", "failed to fetch", "fetch failed"])) {
    return make("network", "Não foi possível alcançar o servidor.", { hint: "Verifique sua conexão e tente novamente.", retryable: true });
  }
  if (containsAny(message, ["rate", "too many"])) {
    return make("rate_limit", "Muitas tentativas em pouco tempo.", { hint: "Aguarde alguns segundos antes de tentar novamente.", retryable: true });
  }
  if (/\b5\d\d\b/.test(message) || message.includes("internal server")) {
    return make("server", "Erro interno do servidor.", { hint: RETRY_LATER_HINT, retryable: true });
  }
  return null;
}

function getErrorCode(error: SecretError | null | undefined): string {
  return error?.code ?? "unexpected";
}

function getErrorMessage(error: SecretError | null | undefined): string | undefined {
  return error?.message;
}

function getSecretAction(action: SecretAction): NonNullable<SecretAction> {
  return action ?? "save";
}

/**
 * Translates a raw backend error into a fully-localized, user-friendly shape.
 * Always pass the secret name so messages can mention it ("API_KEY").
 */
export function normalizeSecretError(
  err: SecretError | null | undefined,
  secretName: string,
  context: { action?: "save" | "rotate" | "delete" | "refresh" | "test" } = {},
): NormalizedSecretError {
  const code = getErrorCode(err);
  const rawMessage = getErrorMessage(err);
  const msg = lower(rawMessage);
  const action = getSecretAction(context.action);
  const actionVerb = ACTION_VERBS[action];
  const titleBase = `Falha ao ${actionVerb} ${secretName}`;
  const make = createErrorFactory(code, titleBase);
  const structured = normalizeStructuredError(code, rawMessage, secretName, make);
  if (structured) return structured;
  const inferred = normalizeMessageError(msg, secretName, make);
  if (inferred) return inferred;
  return make(
    "unknown",
    rawMessage?.trim() || "Não foi possível concluir a operação.",
    { hint: "Se o problema persistir, contate o suporte." },
  );
}

/**
 * Backwards-compatible single-line description for places that only need a string
 * (e.g. inline `setLastError(...)` banners).
 */
export function describeSecretError(
  err: SecretError | null | undefined,
  secretName: string,
  context?: { action?: "save" | "rotate" | "delete" | "refresh" | "test" },
): string {
  const n = normalizeSecretError(err, secretName, context);
  return n.hint ? `${n.description} ${n.hint}` : n.description;
}
