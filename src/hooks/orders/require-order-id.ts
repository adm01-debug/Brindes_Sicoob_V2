export function requireOrderId(orderId?: string): string {
  if (!orderId) throw new Error('Pedido não identificado.');
  return orderId;
}
