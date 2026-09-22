import type { DocumentPurpose } from './inspection.ts';

export interface ScannerVerdict {
  clean: true;
  engine: string;
  signatureVersion: string | null;
}

export class ScannerGateError extends Error {
  constructor(message: string, readonly status: 422 | 503) {
    super(message);
  }
}

export async function requireCleanScannerVerdict(input: {
  bytes: Uint8Array;
  mime: string;
  purpose: DocumentPurpose;
  sha256: string;
  url?: string;
  token?: string;
  fetcher?: typeof fetch;
}): Promise<ScannerVerdict> {
  if (!input.url || !input.token) {
    throw new ScannerGateError('Scanner antimalware obrigatório não configurado.', 503);
  }

  let response: Response;
  try {
    response = await (input.fetcher ?? fetch)(input.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.token}`,
        'Content-Type': input.mime,
        'X-Document-SHA256': input.sha256,
        'X-Document-Purpose': input.purpose,
      },
      body: Uint8Array.from(input.bytes).buffer,
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new ScannerGateError('Scanner antimalware indisponível; envio interrompido.', 503);
  }
  if (!response.ok) throw new ScannerGateError('Scanner antimalware não concluiu a análise.', 503);

  let verdict: Record<string, unknown>;
  try {
    verdict = await response.json() as Record<string, unknown>;
  } catch {
    throw new ScannerGateError('Scanner antimalware devolveu um parecer inválido.', 503);
  }
  if (verdict.clean !== true || typeof verdict.engine !== 'string' || verdict.engine.trim() === '') {
    throw new ScannerGateError('Arquivo reprovado ou sem parecer conclusivo do scanner.', 422);
  }
  return {
    clean: true,
    engine: verdict.engine,
    signatureVersion: typeof verdict.signatureVersion === 'string' ? verdict.signatureVersion : null,
  };
}
