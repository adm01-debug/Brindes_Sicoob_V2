export async function hashReorderIntent(orderId: string): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify({ source_order_id: orderId }));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
