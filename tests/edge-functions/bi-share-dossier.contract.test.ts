import { describe, expect, it } from 'vitest';
import {
  createBiShareUnavailableResponse,
  resolveBiShareSecret,
} from '../../supabase/functions/bi-share-dossier/contract';

describe('contrato seguro de bi-share-dossier', () => {
  it('exige segredo próprio e não reutiliza a service role', () => {
    expect(resolveBiShareSecret({ SUPABASE_SERVICE_ROLE_KEY: 'service-role-secret' })).toBeNull();
    expect(
      resolveBiShareSecret({
        BI_SHARE_SECRET: '   ',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-secret',
      }),
    ).toBeNull();
    expect(
      resolveBiShareSecret({
        BI_SHARE_SECRET: ' dedicated-secret ',
        SUPABASE_SERVICE_ROLE_KEY: 'other',
      }),
    ).toBe('dedicated-secret');
  });

  it('responde indisponibilidade sem cache ou detalhe interno', async () => {
    const response = createBiShareUnavailableResponse({
      'Access-Control-Allow-Origin': 'https://app.test',
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Service unavailable' });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});
