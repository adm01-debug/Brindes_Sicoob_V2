const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const CPF_CNPJ = /\b(?:\d{3}[.\s-]?\d{3}[.\s-]?\d{3}[-\s]?\d{2}|\d{2}[.\s-]?\d{3}[.\s-]?\d{3}[\s/.-]?\d{4}[-\s]?\d{2})\b/g;
const PHONE = /(?<!\d)(?:\+?55[\s.-]?)?(?:\(?\d{2}\)?[\s.-]?)?9?\d{4}[\s.-]?\d{4}(?!\d)/g;

/** Remove identificadores pessoais que podem ter sido digitados em uma busca. */
export function redactPotentialPii(value: string): string {
  return value
    .replace(EMAIL, "[e-mail removido]")
    .replace(CPF_CNPJ, "[documento removido]")
    .replace(PHONE, "[telefone removido]")
    .slice(0, 200);
}
