export type SsoFailureReason = 'provider' | 'exchange' | 'timeout' | 'unexpected';

const SSO_FAILURE_MESSAGES: Record<SsoFailureReason, string> = {
  provider: 'O provedor de identidade não concluiu a autenticação. Tente novamente.',
  exchange: 'Não foi possível validar a autenticação SSO. Tente novamente.',
  timeout: 'A sessão não foi estabelecida. Tente novamente.',
  unexpected: 'Não foi possível concluir a autenticação SSO. Tente novamente.',
};

export const SSO_ERROR_QUERY_PARAM = 'sso_error';

export function buildSsoFailurePath(reason: SsoFailureReason): string {
  return `/login?${SSO_ERROR_QUERY_PARAM}=${reason}`;
}

export function getSsoFailureMessage(
  reason: string | null,
  hasLegacyError = false,
): string | null {
  if (!reason && !hasLegacyError) return null;

  if (reason && Object.prototype.hasOwnProperty.call(SSO_FAILURE_MESSAGES, reason)) {
    return SSO_FAILURE_MESSAGES[reason as SsoFailureReason];
  }

  return SSO_FAILURE_MESSAGES.unexpected;
}
