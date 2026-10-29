import { describe, expect, it } from 'vitest';
import {
  createBiShareUnavailableResponse,
  resolveBiShareSecrets,
  signBiSharePayload,
  verifyBiSharePayloadSignature,
} from '../../supabase/functions/bi-share-dossier/contract';

describe('contrato seguro de bi-share-dossier', () => {
  it('exige segredo próprio e não reutiliza a service role', () => {
    expect(resolveBiShareSecrets({ SUPABASE_SERVICE_ROLE_KEY: 'service-role-secret' })).toEqual({
      current: null,
      previous: null,
    });
    expect(
      resolveBiShareSecrets({
        BI_SHARE_SECRET: '   ',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-secret',
      }),
    ).toEqual({ current: null, previous: null });
    expect(
      resolveBiShareSecrets({
        BI_SHARE_SECRET: ' dedicated-secret-123456789012345678 ',
        BI_SHARE_SECRET_PREVIOUS: ' previous-secret-123456789012345678 ',
        SUPABASE_SERVICE_ROLE_KEY: 'other',
      }),
    ).toEqual({
      current: 'dedicated-secret-123456789012345678',
      previous: 'previous-secret-123456789012345678',
    });
    expect(resolveBiShareSecrets({ BI_SHARE_SECRET: 'too-short' })).toEqual({
      current: null,
      previous: null,
    });
    expect(
      resolveBiShareSecrets({
        BI_SHARE_SECRET: 'a'.repeat(32),
        BI_SHARE_SECRET_PREVIOUS: 'a'.repeat(32),
      }),
    ).toEqual({ current: 'a'.repeat(32), previous: null });
  });

  it('assina somente com a chave atual e valida a anterior apenas durante rotação', async () => {
    const payload = 'token-payload';
    const previousKey = 'old-key-'.padEnd(32, 'x');
    const currentKey = 'new-key-'.padEnd(32, 'y');
    const previousSignature = await signBiSharePayload(payload, previousKey);
    const currentSignature = await signBiSharePayload(payload, currentKey);

    await expect(signBiSharePayload(payload, null)).rejects.toThrow(
      'BI_SHARE_SECRET is missing or too short',
    );
    await expect(signBiSharePayload(payload, 'weak')).rejects.toThrow(
      'BI_SHARE_SECRET must contain at least 32 bytes',
    );
    await expect(
      verifyBiSharePayloadSignature(payload, previousSignature, {
        current: currentKey,
        previous: previousKey,
      }),
    ).resolves.toBe(true);
    await expect(
      verifyBiSharePayloadSignature(payload, currentSignature, {
        current: currentKey,
        previous: previousKey,
      }),
    ).resolves.toBe(true);
    await expect(
      verifyBiSharePayloadSignature(payload, previousSignature, {
        current: currentKey,
        previous: null,
      }),
    ).resolves.toBe(false);
    await expect(
      verifyBiSharePayloadSignature('tampered', currentSignature, {
        current: currentKey,
        previous: previousKey,
      }),
    ).resolves.toBe(false);
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
