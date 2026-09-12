export interface LoginCredentials {
  email: string;
  password: string;
}

export type LoginFieldErrors = Partial<Record<keyof LoginCredentials, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validação síncrona e pequena para manter o formulário público fora do bundle
 * de Zod/React Hook Form. O backend continua sendo a autoridade da autenticação.
 */
export function validateLoginCredentials(credentials: LoginCredentials): LoginFieldErrors {
  const errors: LoginFieldErrors = {};

  if (!credentials.email) {
    errors.email = "Email é obrigatório";
  } else if (!EMAIL_PATTERN.test(credentials.email)) {
    errors.email = "Email inválido";
  }

  if (credentials.password.length < 6) {
    errors.password = "Senha deve ter pelo menos 6 caracteres";
  }

  return errors;
}
