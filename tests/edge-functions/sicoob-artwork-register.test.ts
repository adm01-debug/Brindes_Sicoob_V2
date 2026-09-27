import { describe, expect, it } from 'vitest';
import {
  assertArtworkPath,
  assertArtworkContentType,
  buildArtworkIdentity,
  inspectArtworkBytes,
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

  it('inspeciona a assinatura real e recusa extensão ou MIME forjados', () => {
    const pdfPath = `${ORDER_ID}/artwork/arte-v1.pdf`;
    const pdf = new TextEncoder().encode('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF').buffer;
    const fakePdf = new TextEncoder().encode('conteúdo que não é PDF').buffer;
    const png = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
    ]).buffer;

    expect(inspectArtworkBytes(pdfPath, 'application/pdf', pdf)).toBe('application/pdf');
    expect(() => inspectArtworkBytes(pdfPath, 'application/pdf', fakePdf)).toThrow(/assinatura PDF/i);
    expect(() => inspectArtworkBytes(pdfPath, 'application/pdf', png)).toThrow(/assinatura PDF/i);
    expect(() => inspectArtworkBytes(`${ORDER_ID}/artwork/arte.png`, 'image/png', pdf))
      .toThrow(/assinatura/i);
  });

  it('recusa PDF ativo ou truncado antes de registrar a identidade', () => {
    const path = `${ORDER_ID}/artwork/arte-v1.pdf`;
    const active = new TextEncoder().encode('%PDF-1.7\n/OpenAction 1 0 R\n%%EOF').buffer;
    const truncated = new TextEncoder().encode('%PDF-1.7\nsem marcador final').buffer;

    expect(() => inspectArtworkBytes(path, 'application/pdf', active)).toThrow(/conteúdo ativo/i);
    expect(() => inspectArtworkBytes(path, 'application/pdf', truncated)).toThrow(/truncado/i);
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
