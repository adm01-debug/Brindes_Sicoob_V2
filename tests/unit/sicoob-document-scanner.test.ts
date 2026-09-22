import { describe, expect, it, vi } from 'vitest';
import { requireCleanScannerVerdict, ScannerGateError } from '../../supabase/functions/sicoob-document-ingest/scanner';

const base = {
  bytes: new Uint8Array([1, 2, 3]),
  mime: 'application/pdf',
  purpose: 'invoice_pdf' as const,
  sha256: 'a'.repeat(64),
};

describe('gate obrigatório do scanner antimalware', () => {
  it('falha fechado sem configuração ou quando o scanner está indisponível', async () => {
    await expect(requireCleanScannerVerdict(base)).rejects.toMatchObject({ status: 503 });
    await expect(requireCleanScannerVerdict({
      ...base, url: 'https://scanner.test', token: 'segredo', fetcher: vi.fn().mockRejectedValue(new Error('timeout')),
    })).rejects.toMatchObject({ status: 503 });
  });

  it('bloqueia erro HTTP, JSON inválido, EICAR e parecer inconclusivo', async () => {
    const cases = [
      new Response('{}', { status: 500 }),
      new Response('{', { status: 200 }),
      new Response(JSON.stringify({ clean: false, engine: 'clamav', threat: 'Eicar-Signature' }), { status: 200 }),
      new Response(JSON.stringify({ clean: true }), { status: 200 }),
    ];
    for (const response of cases) {
      const promise = requireCleanScannerVerdict({
        ...base, url: 'https://scanner.test', token: 'segredo', fetcher: vi.fn().mockResolvedValue(response),
      });
      await expect(promise).rejects.toBeInstanceOf(ScannerGateError);
    }
  });

  it('aceita somente parecer limpo com motor identificado e envia identidade nos headers', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      clean: true, engine: 'clamav', signatureVersion: '20260922',
    }), { status: 200 }));
    await expect(requireCleanScannerVerdict({
      ...base, url: 'https://scanner.test', token: 'segredo', fetcher,
    })).resolves.toEqual({ clean: true, engine: 'clamav', signatureVersion: '20260922' });
    expect(fetcher).toHaveBeenCalledWith('https://scanner.test', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'X-Document-SHA256': base.sha256, 'X-Document-Purpose': 'invoice_pdf' }),
    }));
  });
});
