/**
 * Gerador de request-id (correlation-id) para correlacionar uma chamada do
 * frontend com os logs das edge functions de bridge.
 *
 * - UUID v4 (crypto.randomUUID quando disponível, fallback compatível).
 * - Header padrão: `X-Request-Id`.
 *
 * Uso típico:
 *   const requestId = newRequestId();
 *   await supabase.functions.invoke('crm-db-bridge', {
 *     body, headers: { [REQUEST_ID_HEADER]: requestId },
 *   });
 *   recordBridgeCall({ ..., requestId });
 */

export const REQUEST_ID_HEADER = 'X-Request-Id';
export const TRACEPARENT_HEADER = 'traceparent';

export function newRequestId(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  // Fallback RFC4122-ish para ambientes sem crypto.randomUUID.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = Math.floor(Math.random() * 16);
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Trunca um UUID p/ exibição compacta (mantém prefixo + sufixo). */
export function shortRequestId(id: string | undefined | null): string {
  if (!id) return '';
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

/**
 * Gera um header traceparent W3C (00-traceId-spanId-flags).
 * @see https://www.w3.org/TR/trace-context/
 */
export function newTraceparent(): string {
  const hex = (len: number) => {
    const arr = new Uint8Array(len / 2);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  };
  // version-traceId-parentSpanId-flags
  return `00-${hex(32)}-${hex(16)}-01`;
}
