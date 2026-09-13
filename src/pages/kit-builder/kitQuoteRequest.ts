import type { KitItemPersonalization, KitState } from '@/lib/kit-builder';

export interface KitQuoteLinePayload {
  lineId: string;
  productId: string;
  variantId: string | null;
  unitsPerKit: number;
  kind: 'box' | 'item';
  personalization: {
    techniqueId: string;
    colors: number;
    width: number | null;
    height: number | null;
  } | null;
}

export interface KitQuotePayload {
  kitName: string;
  kitType: KitState['kitType'];
  kitQuantity: number;
  identityTag: string | null;
  idempotencyKey: string;
  lines: KitQuoteLinePayload[];
}

function serializePersonalization(
  personalization: KitItemPersonalization | undefined,
  itemName: string,
): KitQuoteLinePayload['personalization'] {
  if (!personalization?.enabled) return null;
  if (!personalization.techniqueId) {
    throw new Error(`Selecione a técnica de personalização de “${itemName}”.`);
  }
  return {
    techniqueId: personalization.techniqueId,
    colors: personalization.colors ?? 1,
    width: personalization.width ?? null,
    height: personalization.height ?? null,
  };
}

export function buildKitQuotePayload(
  kitState: KitState,
  kitQuantity: number,
  idempotencyKey: string,
): KitQuotePayload {
  if (!kitState.isValid || !kitState.box) throw new Error('Conclua a composição do kit antes de criar o orçamento.');

  return {
    kitName: kitState.name.trim() || 'Kit sem nome',
    kitType: kitState.kitType,
    kitQuantity,
    identityTag: kitState.identity?.tag?.trim() || null,
    idempotencyKey,
    lines: [
      {
        lineId: 'box',
        productId: kitState.box.id,
        variantId: null,
        unitsPerKit: 1,
        kind: 'box',
        personalization: serializePersonalization(kitState.personalization.box, kitState.box.name),
      },
      ...kitState.items.map((item, index) => ({
        lineId: `item:${index}`,
        productId: item.id,
        variantId: item.selectedVariantId ?? null,
        unitsPerKit: item.quantity,
        kind: 'item' as const,
        personalization: serializePersonalization(kitState.personalization.items[item.id], item.name),
      })),
    ],
  };
}

export function kitQuoteFingerprint(payload: KitQuotePayload): string {
  const { idempotencyKey: _ignored, ...stablePayload } = payload;
  return JSON.stringify(stablePayload);
}
