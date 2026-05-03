/**
 * Utilitários para contexto de requisição e propagação de headers.
 */

export function getRequestId(): string {
  // Tenta recuperar um requestId existente ou gera um novo
  return crypto.randomUUID();
}

export function getRequestHeaders(baseHeaders: Record<string, string> = {}): Record<string, string> {
  return {
    ...baseHeaders,
    'x-request-id': getRequestId(),
    'x-client-timestamp': new Date().toISOString(),
  };
}
