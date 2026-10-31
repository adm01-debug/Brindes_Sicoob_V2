export interface LimitedBody {
  bytes: Uint8Array;
  truncated: boolean;
}

/** Lê no máximo `maxBytes` do stream, cancela o restante e reporta truncamento. */
export async function readLimitedBody(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number,
): Promise<LimitedBody> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) {
    throw new RangeError("maxBytes precisa ser um inteiro seguro não negativo");
  }
  if (!body) return { bytes: new Uint8Array(), truncated: false };

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  let truncated = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const remaining = maxBytes - totalBytes;
      if (value.byteLength > remaining) {
        if (remaining > 0) {
          chunks.push(value.slice(0, remaining));
          totalBytes += remaining;
        }
        truncated = true;
        try {
          await reader.cancel("limite de leitura atingido");
        } catch {
          // A falha ao cancelar não deve ocultar que o limite já foi atingido.
        }
        break;
      }

      chunks.push(value);
      totalBytes += value.byteLength;
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { bytes, truncated };
}

export function decodeLimitedBody(body: LimitedBody): string {
  return new TextDecoder().decode(body.bytes);
}
