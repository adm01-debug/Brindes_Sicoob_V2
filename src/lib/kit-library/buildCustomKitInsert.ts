/**
 * buildCustomKitInsert — Helper tipado para construir payloads de insert/update em custom_kits.
 * Remove a necessidade de `as never` em chamadas Supabase.
 */
import type { CustomKitRow } from '@/hooks/useCustomKitPersistence';

export type CustomKitInsertPayload = Omit<
  CustomKitRow,
  'id' | 'created_at' | 'updated_at' | 'last_used_at' | 'is_pinned'
> & {
  last_used_at?: string | null;
  is_pinned?: boolean;
};

function resolved<T>(override: T | undefined, source: T): T {
  return override ?? source;
}

export function buildCustomKitInsert(
  source: CustomKitRow,
  overrides: Partial<CustomKitInsertPayload> & { user_id: string },
): CustomKitInsertPayload {
  return {
    user_id: overrides.user_id,
    name: resolved(overrides.name, source.name),
    status: resolved(overrides.status, source.status),
    box_data: resolved(overrides.box_data, source.box_data),
    items_data: resolved(overrides.items_data, source.items_data),
    personalization_data: resolved(overrides.personalization_data, source.personalization_data),
    kit_quantity: resolved(overrides.kit_quantity, source.kit_quantity),
    box_price: resolved(overrides.box_price, source.box_price),
    items_price: resolved(overrides.items_price, source.items_price),
    personalization_price: resolved(overrides.personalization_price, source.personalization_price),
    total_price: resolved(overrides.total_price, source.total_price),
    volume_usage_percent: resolved(overrides.volume_usage_percent, source.volume_usage_percent),
    color: resolved(overrides.color, source.color),
    icon: resolved(overrides.icon, source.icon),
    tag: resolved(overrides.tag, source.tag),
    description: resolved(overrides.description, source.description),
    is_favorite: resolved(overrides.is_favorite, source.is_favorite),
    is_pinned: resolved(overrides.is_pinned, resolved(source.is_pinned, false)),
    last_used_at: resolved(overrides.last_used_at, resolved(source.last_used_at, null)),
  };
}
