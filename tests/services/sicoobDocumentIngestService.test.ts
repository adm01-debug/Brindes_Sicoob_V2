import { beforeEach, describe, expect, it, vi } from 'vitest';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke } },
}));

import { sicoobDocumentIngestService } from '@/services/sicoob/documentIngestService';

describe('sicoobDocumentIngestService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('envia arquivo, pedido e finalidade para a fronteira de inspeção', async () => {
    const response = { documentId: 'doc-1', path: 'order/invoices/doc-1.pdf', sha256: 'a'.repeat(64), detectedMime: 'application/pdf' };
    invoke.mockResolvedValue({ data: response, error: null });
    const file = new File(['%PDF-1.7\n%%EOF'], 'nota.pdf', { type: 'application/pdf' });

    await expect(sicoobDocumentIngestService.ingest('order-1', 'invoice_pdf', file)).resolves.toEqual(response);
    const [, request] = invoke.mock.calls[0];
    expect(invoke.mock.calls[0][0]).toBe('sicoob-document-ingest');
    expect(request.body).toBeInstanceOf(FormData);
    expect(request.body.get('orderId')).toBe('order-1');
    expect(request.body.get('purpose')).toBe('invoice_pdf');
    expect(request.body.get('file')).toBeInstanceOf(File);
  });

  it('propaga falha da Edge e rejeita resposta sem identidade', async () => {
    const failure = new Error('scanner indisponível');
    invoke.mockResolvedValueOnce({ data: null, error: failure });
    await expect(sicoobDocumentIngestService.ingest('order-1', 'invoice_xml', new File(['x'], 'n.xml')))
      .rejects.toBe(failure);

    invoke.mockResolvedValueOnce({ data: { path: null }, error: null });
    await expect(sicoobDocumentIngestService.ingest('order-1', 'delivery_proof', new File(['x'], 'p.jpg')))
      .rejects.toThrow(/identidade do documento/i);
  });
});
