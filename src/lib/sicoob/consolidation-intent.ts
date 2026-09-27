export interface ConsolidationIntent {
  signature: string;
  key: string;
}

export function getConsolidationIntent(
  current: ConsolidationIntent | null,
  sellerId: string,
  orderIds: string[],
  createKey: () => string = () => crypto.randomUUID(),
): ConsolidationIntent {
  const signature = `${sellerId}:${[...orderIds].sort().join(',')}`;
  return current?.signature === signature ? current : { signature, key: createKey() };
}

export interface DeliveryReceiptIntent {
  signature: string;
  key: string;
}

export interface DeliveryReceiptInput {
  received: number;
  damaged: number;
  missing: number;
  notes: string;
  remaining: number;
}

export function validateDeliveryReceiptInput(input: DeliveryReceiptInput): string | null {
  const quantities = [input.received, input.damaged, input.missing];
  if (!quantities.every((quantity) => Number.isInteger(quantity) && quantity >= 0)) {
    return 'Use quantidades inteiras e não negativas.';
  }
  const accounted = input.received + input.damaged + input.missing;
  if (accounted === 0) return 'Informe ao menos uma quantidade positiva.';
  if (accounted > input.remaining) return 'O lançamento supera o saldo pendente deste item.';
  if (input.damaged + input.missing > 0 && input.notes.trim().length < 10) {
    return 'Descreva a divergência com ao menos 10 caracteres.';
  }
  return null;
}

export function getDeliveryReceiptIntent(
  current: DeliveryReceiptIntent | null,
  input: { allocationId: string; received: number; damaged: number; missing: number; notes: string },
  createKey: () => string = () => crypto.randomUUID(),
): DeliveryReceiptIntent {
  const signature = JSON.stringify([
    input.allocationId,
    input.received,
    input.damaged,
    input.missing,
    input.notes.trim(),
  ]);
  return current?.signature === signature ? current : { signature, key: createKey() };
}
