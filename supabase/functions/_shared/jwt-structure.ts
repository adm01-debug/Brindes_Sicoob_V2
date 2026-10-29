/**
 * Valida apenas a estrutura de um JWT antes da consulta remota de identidade.
 * Não verifica assinatura, expiração ou claims; essa validação continua sendo
 * responsabilidade do Auth por meio de `getUser`.
 */
export function hasJwtStructure(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
    return false;
  }

  const decodeJsonObject = (segment: string): boolean => {
    if (!/^[A-Za-z0-9_-]+$/.test(segment)) return false;
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");

    try {
      const decoded: unknown = JSON.parse(atob(padded));
      return typeof decoded === "object" && decoded !== null &&
        !Array.isArray(decoded);
    } catch {
      return false;
    }
  };

  return decodeJsonObject(parts[0]) && decodeJsonObject(parts[1]) &&
    /^[A-Za-z0-9_-]+$/.test(parts[2]);
}
