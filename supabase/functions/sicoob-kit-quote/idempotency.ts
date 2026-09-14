import type { KitLineRequest } from './catalog.ts';

export interface KitQuoteIntent {
  kitName: string;
  kitType: string;
  kitQuantity: number;
  identityTag: string;
  lines: KitLineRequest[];
}

export function canonicalizeKitQuoteIntent(intent: KitQuoteIntent): string {
  const lines = intent.lines.map((line) => ({
    line_id: line.lineId,
    kind: line.kind,
    product_id: line.productId,
    variant_id: line.variantId || null,
    units_per_kit: line.unitsPerKit,
    personalization: line.personalization ? {
      technique_id: line.personalization.techniqueId,
      colors: line.personalization.colors ?? 1,
      width: line.personalization.width ?? null,
      height: line.personalization.height ?? null,
    } : null,
  })).sort((left, right) => left.line_id.localeCompare(right.line_id));

  return JSON.stringify({
    kit_name: intent.kitName,
    kit_type: intent.kitType,
    kit_quantity: intent.kitQuantity,
    identity_tag: intent.identityTag || null,
    lines,
  });
}

export async function hashKitQuoteIntent(intent: KitQuoteIntent): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalizeKitQuoteIntent(intent));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
