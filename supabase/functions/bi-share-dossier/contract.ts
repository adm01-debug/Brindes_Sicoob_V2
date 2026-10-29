/** A assinatura pública usa chaves próprias, separadas da service role. */
export function resolveBiShareSecrets(env: {
  BI_SHARE_SECRET?: string;
  BI_SHARE_SECRET_PREVIOUS?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}): { current: string | null; previous: string | null } {
  const normalizeSecret = (value?: string): string | null => {
    const secret = value?.trim();
    return secret && new TextEncoder().encode(secret).byteLength >= 32 ? secret : null;
  };
  const current = normalizeSecret(env.BI_SHARE_SECRET);
  const previous = normalizeSecret(env.BI_SHARE_SECRET_PREVIOUS);
  return { current, previous: previous === current ? null : previous };
}

function b64urlEncode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/=+$/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

async function hmac(payload: string, secret: string): Promise<string> {
  if (new TextEncoder().encode(secret).byteLength < 32) {
    throw new Error('BI_SHARE_SECRET must contain at least 32 bytes');
  }
  const key = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(new TextEncoder().encode(secret)),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    toArrayBuffer(new TextEncoder().encode(payload)),
  );
  return b64urlEncode(new Uint8Array(signature));
}

function constantTimeEqual(left: string, right: string): boolean {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

/** Assina exclusivamente com a chave atual; a chave anterior serve apenas para validação. */
export async function signBiSharePayload(
  payload: string,
  currentSecret: string | null,
): Promise<string> {
  if (!currentSecret) throw new Error('BI_SHARE_SECRET is missing or too short');
  return hmac(payload, currentSecret);
}

/** Valida tokens atuais e, durante rotação, tokens assinados pela chave anterior. */
export async function verifyBiSharePayloadSignature(
  payload: string,
  signature: string,
  secrets: { current: string | null; previous: string | null },
): Promise<boolean> {
  const candidates = [secrets.current, secrets.previous].filter((secret): secret is string =>
    Boolean(secret),
  );
  let valid = false;
  for (const secret of candidates) {
    const expected = await hmac(payload, secret);
    valid = constantTimeEqual(expected, signature) || valid;
  }
  return valid;
}

export function createBiShareUnavailableResponse(headers: Record<string, string>): Response {
  return new Response(JSON.stringify({ error: 'Service unavailable' }), {
    status: 503,
    headers: {
      ...headers,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
