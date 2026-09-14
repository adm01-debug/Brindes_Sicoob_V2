import { describe, expect, it } from 'vitest';
import {
  canonicalizeKitQuoteIntent,
  hashKitQuoteIntent,
} from '../../supabase/functions/sicoob-kit-quote/idempotency';

const intent = {
  kitName: 'Kit Boas-vindas',
  kitType: 'montado',
  kitQuantity: 100,
  identityTag: 'Novos cooperados',
  lines: [
    { lineId: 'item:1', productId: 'produto', variantId: 'verde', unitsPerKit: 2, kind: 'item' as const },
    { lineId: 'box', productId: 'caixa', unitsPerKit: 1, kind: 'box' as const },
  ],
};

describe('identidade estável da conversão de kit', () => {
  it('é determinística e independente da ordem recebida', async () => {
    const reordered = { ...intent, lines: [...intent.lines].reverse() };
    expect(canonicalizeKitQuoteIntent(reordered)).toBe(canonicalizeKitQuoteIntent(intent));
    expect(await hashKitQuoteIntent(reordered)).toBe(await hashKitQuoteIntent(intent));
  });

  it('muda quando a intenção comercial do cliente muda', async () => {
    const changed = { ...intent, kitQuantity: 101 };
    expect(await hashKitQuoteIntent(changed)).not.toBe(await hashKitQuoteIntent(intent));
  });
});
