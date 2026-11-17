export type RegistrationState =
  | "not_attempted"
  | "confirmed"
  | "unknown";

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
  return { removeFinal: false, removeQuarantine: false };
}
