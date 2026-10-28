import { describe, expect, it } from 'vitest';

import { getUserCredentials } from '../../e2e/helpers/user-credentials';

describe('credenciais da sessão user nos testes E2E', () => {
  it('prioriza o par viewer, igual ao loginAs(user)', () => {
    expect(
      getUserCredentials({
        E2E_USER_EMAIL: 'vendedor@example.test',
        E2E_USER_PASSWORD: 'senha-vendedor',
        E2E_VIEWER_EMAIL: 'viewer@example.test',
        E2E_VIEWER_PASSWORD: 'senha-viewer',
      }),
    ).toEqual({ email: 'viewer@example.test', password: 'senha-viewer' });
  });

  it('usa o par user quando o par viewer não está completo', () => {
    expect(
      getUserCredentials({
        E2E_USER_EMAIL: 'user@example.test',
        E2E_USER_PASSWORD: 'senha-user',
        E2E_VIEWER_EMAIL: 'viewer@example.test',
      }),
    ).toEqual({ email: 'user@example.test', password: 'senha-user' });
  });
});
