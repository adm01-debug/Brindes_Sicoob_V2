export type InvitationField = "email" | "cooperative" | "role" | "pa" | "expiry";

export type InvitationFormErrors = Partial<Record<InvitationField, string>>;

export interface InvitationFormInput {
  email: string;
  cooperativeId: string;
  role: string;
  paId: string;
  expiresInHours: string;
  requiresPa: boolean;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateInvitationForm(input: InvitationFormInput): InvitationFormErrors {
  const errors: InvitationFormErrors = {};
  if (!EMAIL_PATTERN.test(input.email.trim())) errors.email = "Informe um email institucional válido.";
  if (!input.cooperativeId) errors.cooperative = "Selecione a cooperativa.";
  if (!input.role) errors.role = "Selecione o papel.";
  if (input.requiresPa && !input.paId) errors.pa = "Selecione o posto de atendimento.";

  const hours = Number(input.expiresInHours);
  if (!Number.isInteger(hours) || hours < 1 || hours > 168) {
    errors.expiry = "Informe uma validade inteira entre 1 e 168 horas.";
  }
  return errors;
}

export function firstInvitationError(errors: InvitationFormErrors): InvitationField | undefined {
  return (["email", "cooperative", "role", "pa", "expiry"] as const).find((field) => errors[field]);
}
