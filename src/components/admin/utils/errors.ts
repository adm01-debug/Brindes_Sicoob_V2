/** Extrai uma mensagem segura de valores capturados em blocos `catch`. */
export function getErrorMessage(error: unknown, fallback = "Erro desconhecido"): string {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = error.message;
    if (typeof message === "string" && message) return message;
  }
  return fallback;
}
