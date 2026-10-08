import { describe, expect, it } from 'vitest';

import { isColdStartSignal } from '@/lib/external-db/bridge-status-events';

describe('isColdStartSignal', () => {
  it.each([
    'HTTP 503: Service Unavailable',
    'HTTP status 502.',
    'response status:503',
    'status 503.',
    'status code=504;',
    'function returned 504',
    'Edge function returned 503: Error',
    '503 Service Unavailable',
    '503: Service Unavailable',
    'Error 503: Service Unavailable',
    '| 503: Service Unavailable',
  ])('reconhece status HTTP transitório em %s', message => {
    expect(isColdStartSignal(message)).toBe(true);
  });

  it.each([
    'at /workspace/src/app.ts:502:10',
    '| 503:10',
    '| 503: 10',
    'identificador item-502-falhou',
    'arquivo version.503 falhou',
    'function returned version.503',
    'rota /504 indisponível',
  ])('não confunde caminho, posição ou identificador em %s', message => {
    expect(isColdStartSignal(message)).toBe(false);
  });
});
