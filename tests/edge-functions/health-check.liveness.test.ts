import { describe, expect, it } from 'vitest';
import { createLivenessResponse } from '../../supabase/functions/health-check/contract';

describe('contrato público de liveness do health-check', () => {
  it('responde somente o estado da função e não depende de serviços internos', async () => {
    const response = createLivenessResponse(new Request('https://edge.test/health-check'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('aceita preflight e recusa métodos que não são de leitura', () => {
    const preflight = createLivenessResponse(
      new Request('https://edge.test/health-check', { method: 'OPTIONS' }),
    );
    const mutation = createLivenessResponse(
      new Request('https://edge.test/health-check', { method: 'POST' }),
    );

    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('access-control-allow-methods')).toBe('GET, OPTIONS');
    expect(mutation.status).toBe(405);
    expect(mutation.headers.get('allow')).toBe('GET, OPTIONS');
  });
});
