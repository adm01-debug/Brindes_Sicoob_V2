export type ReorderSourceKind = 'order' | 'quote';

export async function hashReorderIntent(sourceId: string, sourceKind: ReorderSourceKind = 'order'): Promise<string> {
  const source = sourceKind === 'order'
    ? { source_order_id: sourceId }
    : { source_quote_id: sourceId };
  const bytes = new TextEncoder().encode(JSON.stringify(source));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
