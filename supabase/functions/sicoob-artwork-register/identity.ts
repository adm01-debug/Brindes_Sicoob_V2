export const ARTWORK_BUCKET = 'sicoob-order-documents';
export const MAX_ARTWORK_BYTES = 20 * 1024 * 1024;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ARTWORK_PATH = /^[0-9a-f-]{36}\/artwork\/[a-zA-Z0-9][a-zA-Z0-9._-]*\.(pdf|png|jpe?g|webp)$/i;
const CONTENT_TYPE_BY_EXTENSION: Record<string, readonly string[]> = {
  pdf: ['application/pdf'],
  png: ['image/png'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  webp: ['image/webp'],
};

export function assertArtworkPath(orderId: string, filePath: string): void {
  if (!UUID.test(orderId) || !ARTWORK_PATH.test(filePath) || !filePath.startsWith(`${orderId}/artwork/`)) {
    throw new Error('O arquivo de arte não pertence ao pedido informado.');
  }
}

export function assertArtworkContentType(filePath: string, contentType: string): void {
  const extension = filePath.split('.').pop()?.toLowerCase() || '';
  if (!CONTENT_TYPE_BY_EXTENSION[extension]?.includes(contentType.toLowerCase())) {
    throw new Error('O conteúdo do arquivo não corresponde a um formato de arte permitido.');
  }
}

export async function sha256Hex(content: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', content);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function buildArtworkIdentity(input: {
  filePath: string;
  sha256: string;
  byteSize: number;
  contentType: string;
  verifiedAt: string;
}): Record<string, string | number> {
  if (!Number.isSafeInteger(input.byteSize) || input.byteSize <= 0 || input.byteSize > MAX_ARTWORK_BYTES) {
    throw new Error('O arquivo de arte está vazio ou excede 20 MB.');
  }
  if (!/^[0-9a-f]{64}$/.test(input.sha256)) throw new Error('A identidade criptográfica da arte é inválida.');

  return {
    bucket: ARTWORK_BUCKET,
    path: input.filePath,
    sha256: input.sha256,
    byte_size: input.byteSize,
    content_type: input.contentType || 'application/octet-stream',
    verified_at: input.verifiedAt,
    verifier: 'sicoob-artwork-register',
  };
}
