export type RegistrationState =
  | "not_attempted"
  | "confirmed"
  | "rejected"
  | "unknown";

export interface ExpectedRegistration {
  id: string;
  final_path: string;
  quarantine_path: string;
  sha256: string;
}

export function matchesExpectedRegistration(
  row: unknown,
  expected: ExpectedRegistration,
): boolean {
  if (!row || typeof row !== "object") return false;
  const record = row as Record<string, unknown>;
  return record.id === expected.id &&
    record.final_path === expected.final_path &&
    record.quarantine_path === expected.quarantine_path &&
    record.sha256 === expected.sha256 &&
    record.status === "clean";
}

export function getDocumentCleanupPlan(state: RegistrationState): {
  removeFinal: boolean;
  removeQuarantine: boolean;
} {
  if (state === "not_attempted" || state === "rejected") {
    return { removeFinal: true, removeQuarantine: true };
  }
  if (state === "confirmed") {
    return { removeFinal: false, removeQuarantine: true };
  }
  return { removeFinal: false, removeQuarantine: false };
}
