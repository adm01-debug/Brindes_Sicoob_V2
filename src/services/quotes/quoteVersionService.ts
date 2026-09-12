import { supabase } from '@/integrations/supabase/client';

type QuoteVersionRpcResponse = { data: unknown; error: Error | null };
type QuoteVersionRpc = (
  name: string,
  args: Record<string, unknown>,
) => Promise<QuoteVersionRpcResponse>;

const quoteVersionRpc = supabase.rpc as unknown as QuoteVersionRpc;

function parseQuoteId(data: unknown): string | null {
  return typeof data === 'string' && data.length > 0 ? data : null;
}

/** Cria uma nova versão no banco, onde cópia, auditoria e vigência são indivisíveis. */
export const quoteVersionService = {
  async createAtomicVersion(sourceQuoteId: string): Promise<string> {
    const { data, error } = await quoteVersionRpc('create_quote_version_atomic', {
      p_source_quote_id: sourceQuoteId,
    });

    if (error) throw error;

    const quoteId = parseQuoteId(data);
    if (!quoteId) {
      throw new Error('A criação da nova versão não retornou um orçamento válido.');
    }

    return quoteId;
  },
};
