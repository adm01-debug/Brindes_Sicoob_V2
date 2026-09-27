type MutationError = Error & { code?: string | null };

function asError(error: unknown): MutationError | null {
  if (error instanceof Error) return error as MutationError;
  if (!error || typeof error !== "object") return null;
  const candidate = error as { code?: unknown; message?: unknown };
  if (typeof candidate.message !== "string") return null;
  return Object.assign(new Error(candidate.message), {
    code: typeof candidate.code === "string" ? candidate.code : null,
  });
}

/** Garante que RLS e o lock otimista tenham atualizado exatamente as linhas solicitadas. */
export function ensureQuoteMutationApplied(
  rows: unknown[] | null,
  error: unknown,
  expectedCount: number,
  concurrencyMessage: string,
): void {
  const mutationError = asError(error);
  if (mutationError?.code === "PGRST116") {
    throw new Error(concurrencyMessage);
  }
  if (mutationError) throw mutationError;
  if (!rows || rows.length !== expectedCount) throw new Error(concurrencyMessage);
}

/** Evita iniciar um lote quando algum orçamento não é visível para o ator atual. */
export function ensureQuotesAreAccessible(rows: unknown[] | null, expectedCount: number): void {
  if (!rows || rows.length !== expectedCount) {
    throw new Error("Um ou mais orçamentos não foram encontrados ou não estão no seu escopo.");
  }
}
