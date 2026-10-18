import type { KitState } from '@/lib/kit-builder';
import type { Json } from '@/integrations/supabase/types';
import { CUSTOM_KIT_STATUS } from '@/lib/kit-builder/status';

export interface KitPersistenceSnapshot {
  name: string;
  kitType: KitState['kitType'];
  box: KitState['box'];
  items: KitState['items'];
  personalization: KitState['personalization'];
  kitQuantity: number;
  identity: NonNullable<KitState['identity']>;
  prices: {
    box: number;
    items: number;
    personalization: number;
    total: number;
  };
  volumeUsagePercent: number;
  isValid: boolean;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function json(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function normalizedIdentity(identity: KitState['identity']): NonNullable<KitState['identity']> {
  if (!identity) {
    return { color: '#3B82F6', icon: 'Package', tag: '', description: '', isFavorite: false };
  }
  return {
    color: identity.color,
    icon: identity.icon,
    tag: identity.tag ?? '',
    description: identity.description ?? '',
    isFavorite: identity.isFavorite ?? false,
  };
}

export function createKitPersistenceSnapshot(
  kitState: KitState,
  kitQuantity: number,
): KitPersistenceSnapshot {
  return {
    name: kitState.name,
    kitType: kitState.kitType,
    box: kitState.box ? clone(kitState.box) : null,
    items: clone(kitState.items),
    personalization: clone(kitState.personalization),
    kitQuantity,
    identity: normalizedIdentity(kitState.identity),
    prices: {
      box: kitState.boxPrice,
      items: kitState.itemsPrice,
      personalization: kitState.personalizationPrice,
      total: kitState.totalPrice,
    },
    volumeUsagePercent: kitState.volumeUsagePercent,
    isValid: kitState.isValid,
  };
}

export function serializeKitPersistenceSnapshot(snapshot: KitPersistenceSnapshot): string {
  return JSON.stringify(snapshot);
}

export function buildCustomKitPayload(userId: string, snapshot: KitPersistenceSnapshot) {
  return {
    user_id: userId,
    name: snapshot.name || 'Kit sem nome',
    status: snapshot.isValid ? CUSTOM_KIT_STATUS.READY : CUSTOM_KIT_STATUS.DRAFT,
    kit_type: snapshot.kitType || 'montado',
    box_data: json(snapshot.box),
    items_data: json(snapshot.items),
    personalization_data: json(snapshot.personalization),
    kit_quantity: snapshot.kitQuantity,
    box_price: snapshot.prices.box,
    items_price: snapshot.prices.items,
    personalization_price: snapshot.prices.personalization,
    total_price: snapshot.prices.total,
    volume_usage_percent: snapshot.volumeUsagePercent,
    color: snapshot.identity.color,
    icon: snapshot.identity.icon,
    tag: snapshot.identity.tag || null,
    description: snapshot.identity.description || null,
    is_favorite: snapshot.identity.isFavorite,
    updated_at: new Date().toISOString(),
  };
}

export function buildKitTemplatePayload(
  snapshot: KitPersistenceSnapshot,
  options: { category?: string; overrideName?: string } = {},
) {
  return {
    name: options.overrideName || snapshot.name || 'Template sem nome',
    category: options.category || 'Geral',
    description: snapshot.identity.description || null,
    color: snapshot.identity.color,
    icon: snapshot.identity.icon,
    tag: snapshot.identity.tag || null,
    box_data: json(snapshot.box),
    items_data: json(snapshot.items),
    personalization_data: json(snapshot.personalization),
    total_price: snapshot.prices.total,
    volume_usage_percent: snapshot.volumeUsagePercent,
    is_active: true,
    updated_at: new Date().toISOString(),
  };
}

/** Atualizações do builder não alteram metadados editoriais do template. */
export function buildKitTemplateUpdatePayload(snapshot: KitPersistenceSnapshot) {
  const { category: _category, is_active: _isActive, ...payload } = buildKitTemplatePayload(snapshot);
  return payload;
}
