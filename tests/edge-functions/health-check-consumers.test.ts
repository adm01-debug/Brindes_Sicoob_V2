import { describe, expect, it } from 'vitest';
import { isHealthcheckSuccessful } from '../../scripts/health-check-contract.mjs';

describe('consumidores do contrato de health-check', () => {
  it('aceita a resposta pública de liveness sem JWT', () => {
    expect(isHealthcheckSuccessful(true, 'ok')).toBe(true);
  });

  it('mantém compatibilidade com a resposta antiga de readiness', () => {
    expect(isHealthcheckSuccessful(true, 'healthy')).toBe(true);
  });

  it('não trata erro HTTP como sucesso mesmo se o corpo disser ok', () => {
    expect(isHealthcheckSuccessful(false, 'ok')).toBe(false);
  });

  it('rejeita status ausente ou degradado', () => {
    expect(isHealthcheckSuccessful(true, undefined)).toBe(false);
    expect(isHealthcheckSuccessful(true, 'degraded')).toBe(false);
  });
});
