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
