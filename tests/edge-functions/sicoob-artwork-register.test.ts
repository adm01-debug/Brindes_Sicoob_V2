import { describe, expect, it } from 'vitest';
import {
  assertArtworkPath,
  assertArtworkContentType,
  buildArtworkIdentity,
  sha256Hex,
} from '../../supabase/functions/sicoob-artwork-register/identity';

const ORDER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('registro servidor de arte Sicoob', () => {
  it('recusa caminho fora do pedido e travessia de diretório', () => {
    expect(() => assertArtworkPath(ORDER_ID, `bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/artwork/arte.pdf`)).toThrow();
    expect(() => assertArtworkPath(ORDER_ID, `${ORDER_ID}/artwork/../segredo.pdf`)).toThrow();
  });

  it('recusa conteúdo cujo MIME não corresponde à extensão', () => {
    const path = `${ORDER_ID}/artwork/arte-v1.pdf`;
    expect(() => assertArtworkContentType(path, 'image/png')).toThrow(/não corresponde/i);
    expect(() => assertArtworkContentType(path, 'application/pdf')).not.toThrow();
  });

  it('calcula SHA-256 do conteúdo e monta fotografia confiável', async () => {
    const bytes = new TextEncoder().encode('arte-sicoob-v1');
    const sha256 = await sha256Hex(bytes.buffer);
    const path = `${ORDER_ID}/artwork/arte-v1.pdf`;

    expect(sha256).toBe('01df0a5f3c398612b386e3fe04f2fa505004f377323f05fdf37c117ffbaee27c');
    expect(buildArtworkIdentity({
      filePath: path,
      sha256,
      byteSize: bytes.byteLength,
      contentType: 'application/pdf',
      verifiedAt: '2026-09-12T12:00:00.000Z',
    })).toEqual({
      bucket: 'sicoob-order-documents',
      path,
      sha256,
      byte_size: bytes.byteLength,
      content_type: 'application/pdf',
      verified_at: '2026-09-12T12:00:00.000Z',
      verifier: 'sicoob-artwork-register',
    });
  });
});
