export function buildQuoteDraftScope(
  userId?: string | null,
  cooperativeId?: string | null,
  paId?: string | null,
): string | null {
  if (!userId) return null;
  return [userId, cooperativeId ?? "sem-cooperativa", paId ?? "sem-pa"].join(":");
}
