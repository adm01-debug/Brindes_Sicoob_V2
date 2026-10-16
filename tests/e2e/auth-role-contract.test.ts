import { describe, expect, it } from 'vitest';
import { credentialsForRole, storedSessionEmail } from '../../e2e/helpers/auth';

const env = {
  E2E_USER_EMAIL: 'user@example.test',
  E2E_USER_PASSWORD: 'user-password',
  E2E_VIEWER_EMAIL: 'viewer@example.test',
  E2E_VIEWER_PASSWORD: 'viewer-password',
  E2E_MANAGER_EMAIL: 'manager@example.test',
  E2E_MANAGER_PASSWORD: 'manager-password',
  E2E_ADMIN_EMAIL: 'admin@example.test',
  E2E_ADMIN_PASSWORD: 'admin-password',
  E2E_DEV_EMAIL: 'dev@example.test',
  E2E_DEV_PASSWORD: 'dev-password',
};

describe('contrato de credenciais E2E por papel', () => {
  it('mantém o papel user alinhado ao storageState canônico do setup', () => {
    expect(credentialsForRole('user', env)).toEqual({
      email: env.E2E_USER_EMAIL,
      password: env.E2E_USER_PASSWORD,
    });
  });

  it.each([
    ['editor', env.E2E_MANAGER_EMAIL, env.E2E_MANAGER_PASSWORD],
    ['admin', env.E2E_ADMIN_EMAIL, env.E2E_ADMIN_PASSWORD],
    ['dev', env.E2E_DEV_EMAIL, env.E2E_DEV_PASSWORD],
  ] as const)('resolve %s sem cruzar contas', (role, email, password) => {
    expect(credentialsForRole(role, env)).toEqual({ email, password });
  });

  it('usa admin somente como fallback explícito do editor', () => {
    expect(credentialsForRole('editor', {
      E2E_ADMIN_EMAIL: env.E2E_ADMIN_EMAIL,
      E2E_ADMIN_PASSWORD: env.E2E_ADMIN_PASSWORD,
    })).toEqual({ email: env.E2E_ADMIN_EMAIL, password: env.E2E_ADMIN_PASSWORD });
  });

  it('identifica a conta contida no storage antes de restaurá-lo', () => {
    const entries = [
      { name: 'preferencia', value: '{}' },
      { name: 'sb-projeto-auth-token', value: JSON.stringify({ user: { email: env.E2E_USER_EMAIL } }) },
    ];

    expect(storedSessionEmail(entries)).toBe(env.E2E_USER_EMAIL);
    expect(storedSessionEmail([{ name: 'sb-projeto-auth-token', value: '{inválido' }])).toBeNull();
  });
});
