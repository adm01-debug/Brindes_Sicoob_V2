import { supabase } from '@/integrations/supabase/client';

type QuoteVersionRpcError = {
  code?: string | null;
  details?: string | null;
  hint?: string | null;
  message?: string | null;
};
type QuoteVersionRpcResponse = { data: unknown; error: QuoteVersionRpcError | Error | null };
type QuoteVersionRpc = (
  name: string,
  args: Record<string, unknown>,
) => Promise<QuoteVersionRpcResponse>;

const quoteVersionRpc = supabase.rpc as unknown as QuoteVersionRpc;

function parseQuoteId(data: unknown): string | null {
  return typeof data === 'string' && data.length > 0 ? data : null;
}

function toQuoteVersionError(error: QuoteVersionRpcError | Error): Error {
  if (error instanceof Error) return error;

  const message = error.message?.trim() || 'Não foi possível criar uma nova versão do orçamento.';
  const normalized = new Error(message);
  if (error.code) normalized.name = `Erro de orçamento ${error.code}`;
  return normalized;
}

/** Cria uma nova versão no banco, onde cópia, auditoria e vigência são indivisíveis. */
export const quoteVersionService = {
  async createAtomicVersion(sourceQuoteId: string): Promise<string> {
    const { data, error } = await quoteVersionRpc('create_quote_version_atomic', {
      p_source_quote_id: sourceQuoteId,
    });

    if (error) throw toQuoteVersionError(error);

    const quoteId = parseQuoteId(data);
    if (!quoteId) {
      throw new Error('A criação da nova versão não retornou um orçamento válido.');
    }

    return quoteId;
  },
};
