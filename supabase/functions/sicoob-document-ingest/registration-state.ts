export type RegistrationState =
  | "not_attempted"
  | "confirmed"
  | "rejected"
  | "unknown";

/**
 * Um erro com SQLSTATE veio do proprio Postgres: a transacao da RPC foi
 * revertida e nenhum registro pode apontar para os objetos desta tentativa.
 * Falhas de transporte (resposta perdida, timeout) nao trazem SQLSTATE e
 * continuam ambiguas — nesses casos os objetos sao preservados.
 */
const SQLSTATE_PATTERN = /^[0-9A-Z]{5}$/;

export function isDefinitiveRpcRejection(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && SQLSTATE_PATTERN.test(code);
}

export interface ExpectedRegistration {
  id: string;
  order_id: string;
  purpose: string;
  uploaded_by: string;
  final_path: string;
  quarantine_path: string;
  sha256: string;
  detected_mime: string;
  byte_size: number;
}

export function matchesExpectedRegistration(
  row: unknown,
  expected: ExpectedRegistration,
): boolean {
  if (!row || typeof row !== "object") return false;
  const record = row as Record<string, unknown>;
  return record.id === expected.id &&
    record.order_id === expected.order_id &&
    record.purpose === expected.purpose &&
    record.uploaded_by === expected.uploaded_by &&
    record.final_path === expected.final_path &&
    record.quarantine_path === expected.quarantine_path &&
    record.sha256 === expected.sha256 &&
    record.detected_mime === expected.detected_mime &&
    record.byte_size === expected.byte_size &&
    record.status === "clean";
}

export function getVerifiedRegistrationState(
  row: unknown,
  expected: ExpectedRegistration,
): RegistrationState {
  return matchesExpectedRegistration(row, expected) ? "confirmed" : "unknown";
}

export function getDocumentCleanupPlan(state: RegistrationState): {
  removeFinal: boolean;
  removeQuarantine: boolean;
} {
  if (state === "not_attempted") {
    return { removeFinal: true, removeQuarantine: true };
  }
  if (state === "confirmed") {
    return { removeFinal: false, removeQuarantine: true };
  }
  // Rollback comprovado pelo banco: nenhum registro referencia os objetos.
  if (state === "rejected") {
    return { removeFinal: true, removeQuarantine: true };
  }
  return { removeFinal: false, removeQuarantine: false };
}
