import { describe, expect, it } from 'vitest';
import {
  DocumentInspectionError,
  inspectDocumentBytes,
  sha256Hex,
} from '../../supabase/functions/sicoob-document-ingest/inspection';

const bytes = (value: string) => new TextEncoder().encode(value);

describe('inspeção estrutural dos documentos Sicoob', () => {
  it('recusa arquivo vazio com erro de validação controlado', () => {
    expect(() => inspectDocumentBytes(new Uint8Array(), 'invoice_pdf'))
      .toThrow(DocumentInspectionError);
  });

  it('aceita PDF fechado e rejeita extensão forjada, truncamento e conteúdo ativo', () => {
    expect(inspectDocumentBytes(bytes('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF'), 'invoice_pdf').mime)
      .toBe('application/pdf');
    expect(() => inspectDocumentBytes(bytes('arquivo.pdf'), 'invoice_pdf')).toThrow('Assinatura PDF');
    expect(() => inspectDocumentBytes(bytes('%PDF-1.7\nsem final'), 'invoice_pdf')).toThrow('truncado');
    expect(() => inspectDocumentBytes(bytes('%PDF-1.7\n/OpenAction 1 0 R\n%%EOF'), 'invoice_pdf')).toThrow('conteúdo ativo');
  });

  it('aceita XML fiscal e rejeita entidades externas e XML genérico', () => {
    expect(inspectDocumentBytes(bytes('<?xml version="1.0"?><nfeProc><NFe/></nfeProc>'), 'invoice_xml').mime)
      .toBe('application/xml');
    expect(() => inspectDocumentBytes(bytes('<!DOCTYPE x [<!ENTITY y SYSTEM "file:///etc/passwd">]><NFe/>'), 'invoice_xml'))
      .toThrow('entidade externa');
    expect(() => inspectDocumentBytes(bytes('<root/>'), 'invoice_xml')).toThrow('raiz fiscal');
  });

  it('detecta imagens pelos bytes em vez do MIME declarado pelo navegador', () => {
    expect(inspectDocumentBytes(new Uint8Array([0xff, 0xd8, 0xff, 0x00, 0xff, 0xd9]), 'delivery_proof').mime)
      .toBe('image/jpeg');
    expect(inspectDocumentBytes(new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
    ]), 'delivery_proof').mime).toBe('image/png');
    expect(() => inspectDocumentBytes(bytes('RIFFxxxxNOTP'), 'delivery_proof')).toThrow('não corresponde');
  });

  it('gera SHA-256 determinístico para a identidade imutável', async () => {
    await expect(sha256Hex(bytes('sicoob'))).resolves.toMatch(/^[0-9a-f]{64}$/);
    await expect(sha256Hex(bytes('sicoob'))).resolves.toBe(await sha256Hex(bytes('sicoob')));
  });
});
