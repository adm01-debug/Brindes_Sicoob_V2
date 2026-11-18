/** Sanitiza e limita somente o contexto auxiliar enviado ao assistente. */
export function normalizeAssistantContext(value: unknown): unknown {
  if (typeof value !== "string") return value;
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").slice(0, 500);
}
