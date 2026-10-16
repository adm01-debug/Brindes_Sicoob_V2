import { describe, expect, it } from 'vitest';
import type { KitState } from '@/lib/kit-builder';
import {
  buildCustomKitPayload,
  buildKitTemplateUpdatePayload,
  createKitPersistenceSnapshot,
} from '@/lib/kit-builder/persistence';
import { CUSTOM_KIT_STATUS_LABELS } from '@/lib/kit-builder/status';

const state: KitState = {
  name: 'Kit completo',
  kitType: 'original',
  box: null,
  items: [],
  personalization: { box: { enabled: false }, items: {} },
  identity: {
    color: '#005500',
    icon: 'Leaf',
    tag: 'Sustentável',
    description: 'Identidade integral',
    isFavorite: true,
  },
  totalItemsVolume: 0,
  availableVolume: 0,
  volumeUsagePercent: 27,
  totalWeight: 0,
  boxPrice: 10,
  itemsPrice: 20,
  personalizationPrice: 5,
  totalPrice: 35,
  isValid: true,
  validationErrors: [],
};

describe('snapshot canônico de kit', () => {
  it('captura quantidade, identidade e todos os valores persistidos', () => {
    expect(createKitPersistenceSnapshot(state, 75)).toEqual(expect.objectContaining({
      name: 'Kit completo',
      kitType: 'original',
      kitQuantity: 75,
      identity: state.identity,
      prices: { box: 10, items: 20, personalization: 5, total: 35 },
      volumeUsagePercent: 27,
      isValid: true,
    }));
  });

  it('usa apenas estados aceitos pela restrição canônica de custom_kits', () => {
    const valid = buildCustomKitPayload('usuario-1', createKitPersistenceSnapshot(state, 75));
    const invalid = buildCustomKitPayload('usuario-1', createKitPersistenceSnapshot({
      ...state,
      isValid: false,
    }, 75));

    expect(valid.status).toBe('ready');
    expect(invalid.status).toBe('draft');
  });

  it('não sobrescreve categoria nem ativação ao atualizar template existente', () => {
    const payload = buildKitTemplateUpdatePayload(createKitPersistenceSnapshot(state, 75));

    expect(payload).not.toHaveProperty('category');
    expect(payload).not.toHaveProperty('is_active');
  });

  it('rotula os quatro estados canônicos de custom_kits', () => {
    expect(CUSTOM_KIT_STATUS_LABELS).toEqual({
      draft: 'Rascunho',
      ready: 'Pronto',
      shared: 'Compartilhado',
      archived: 'Arquivado',
    });
  });
});
