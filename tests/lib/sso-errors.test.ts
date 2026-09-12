import { describe, expect, it } from 'vitest';
import {
  buildSsoFailurePath,
  getSsoFailureMessage,
  SSO_ERROR_QUERY_PARAM,
} from '@/lib/auth/sso-errors';

describe('erros do callback SSO', () => {
  it('gera somente destinos internos com motivos fechados', () => {
    expect(buildSsoFailurePath('provider')).toBe(`/login?${SSO_ERROR_QUERY_PARAM}=provider`);
    expect(buildSsoFailurePath('exchange')).toBe(`/login?${SSO_ERROR_QUERY_PARAM}=exchange`);
  });

  it('não reflete conteúdo arbitrário recebido pela URL', () => {
    const payload = '<img src=x onerror=alert(1)>';

    expect(getSsoFailureMessage(payload)).toBe(
      'Não foi possível concluir a autenticação SSO. Tente novamente.',
    );
    expect(getSsoFailureMessage(null, true)).toBe(
      'Não foi possível concluir a autenticação SSO. Tente novamente.',
    );
  });

  it('ignora a URL quando não existe indicador de falha', () => {
    expect(getSsoFailureMessage(null)).toBeNull();
  });
});
