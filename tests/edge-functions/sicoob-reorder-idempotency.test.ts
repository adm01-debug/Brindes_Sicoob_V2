import { describe, expect, it } from 'vitest';
import { hashReorderIntent } from '../../supabase/functions/sicoob-reorder/idempotency';

describe('identidade estável da recompra', () => {
  it('é determinística para o mesmo pedido e muda com a origem', async () => {
    const source = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    expect(await hashReorderIntent(source)).toBe(await hashReorderIntent(source));
    expect(await hashReorderIntent(source)).not.toBe(
      await hashReorderIntent('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
    );
  });

  it('separa a identidade de pedido da identidade de orçamento', async () => {
    const source = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    expect(await hashReorderIntent(source, 'order')).not.toBe(
      await hashReorderIntent(source, 'quote'),
    );
  });
});
