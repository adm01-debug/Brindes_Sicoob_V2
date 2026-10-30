import { describe, expect, it } from 'vitest';
import type { KitState } from '@/lib/kit-builder';
import { buildKitPayload } from '@/hooks/useCustomKitPersistence';

describe('buildKitPayload — status aceito pelo banco', () => {
  const kitState = (isValid: boolean) => ({
    isValid,
    name: 'Kit institucional',
    identity: null,
    box: null,
    items: [],
    personalization: {},
    boxPrice: 0,
    itemsPrice: 0,
    personalizationPrice: 0,
    totalPrice: 0,
    volumeUsagePercent: 0,
  }) as unknown as KitState;

  it('salva kit válido com status ready, aceito pela constraint SQL', () => {
    expect(buildKitPayload('usuario-1', kitState(true), 1).status).toBe('ready');
  });

  it('mantém kit inválido como draft', () => {
    expect(buildKitPayload('usuario-1', kitState(false), 1).status).toBe('draft');
  });
});
