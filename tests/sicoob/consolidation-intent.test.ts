import { describe, expect, it, vi } from 'vitest';
import {
  getConsolidationIntent,
  getDeliveryReceiptIntent,
  validateDeliveryReceiptInput,
} from '@/lib/sicoob/consolidation-intent';

describe('intenção idempotente de consolidação', () => {
  it('reutiliza a chave em retries do mesmo vendedor e conjunto de pedidos', () => {
    const createKey = vi.fn().mockReturnValue('chave-1');
    const first = getConsolidationIntent(null, 'vendedor-1', ['pedido-2', 'pedido-1'], createKey);
    const retry = getConsolidationIntent(first, 'vendedor-1', ['pedido-1', 'pedido-2'], createKey);

    expect(retry).toBe(first);
    expect(createKey).toHaveBeenCalledOnce();
  });

  it('gera outra chave quando o significado da operação muda', () => {
    const createKey = vi.fn().mockReturnValueOnce('chave-1').mockReturnValueOnce('chave-2');
    const first = getConsolidationIntent(null, 'vendedor-1', ['pedido-1'], createKey);
    const changed = getConsolidationIntent(first, 'vendedor-2', ['pedido-1'], createKey);

    expect(changed.key).toBe('chave-2');
  });
});

describe('intenção idempotente de recebimento', () => {
  it('reutiliza a chave no retry e troca quando uma quantidade muda', () => {
    const createKey = vi.fn().mockReturnValueOnce('recebimento-1').mockReturnValueOnce('recebimento-2');
    const input = { allocationId: 'alocacao-1', received: 4, damaged: 0, missing: 0, notes: '' };
    const first = getDeliveryReceiptIntent(null, input, createKey);
    const retry = getDeliveryReceiptIntent(first, input, createKey);
    const changed = getDeliveryReceiptIntent(retry, { ...input, received: 5 }, createKey);

    expect(retry).toBe(first);
    expect(changed.key).toBe('recebimento-2');
    expect(createKey).toHaveBeenCalledTimes(2);
  });

  it('recusa frações, excesso e divergência sem justificativa suficiente', () => {
    expect(validateDeliveryReceiptInput({ received: 1.5, damaged: 0, missing: 0, notes: '', remaining: 5 }))
      .toContain('inteiras');
    expect(validateDeliveryReceiptInput({ received: 6, damaged: 0, missing: 0, notes: '', remaining: 5 }))
      .toContain('supera');
    expect(validateDeliveryReceiptInput({ received: 3, damaged: 1, missing: 0, notes: 'avaria', remaining: 5 }))
      .toContain('10 caracteres');
  });

  it('aceita recebimento parcial íntegro e divergência devidamente descrita', () => {
    expect(validateDeliveryReceiptInput({ received: 3, damaged: 0, missing: 0, notes: '', remaining: 5 })).toBeNull();
    expect(validateDeliveryReceiptInput({
      received: 3,
      damaged: 1,
      missing: 1,
      notes: 'Caixas violadas no transporte',
      remaining: 5,
    })).toBeNull();
  });
});
