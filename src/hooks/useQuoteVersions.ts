import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { quoteVersionService } from '@/services/quotes/quoteVersionService';
import { useQuotes, type Quote } from './quotes/useQuotes';

export interface QuoteVersion {
  id: string;
  quote_number: string;
  version: number;
  status: string;
  total: number;
  subtotal: number;
  discount_amount: number;
  discount_percent: number;
  created_at: string;
  updated_at: string;
  is_latest_version: boolean;
  parent_quote_id: string | null;
  items_count?: number;
}

async function loadQuoteVersions(targetQuoteId: string): Promise<QuoteVersion[]> {
  const { data: currentQuote, error: quoteError } = await supabase
    // rls-allow: lookup por quote_id; RLS valida ownership
    .from('quotes')
    .select('id, parent_quote_id')
    .eq('id', targetQuoteId)
    .single();

  if (quoteError) throw quoteError;

  const rootId = currentQuote.parent_quote_id || currentQuote.id;
  const { data: quoteVersions, error: versionsError } = await supabase
    // rls-allow: lookup por quote_id; RLS valida ownership
    .from('quotes')
    .select(
      'id, quote_number, version, status, total, subtotal, discount_amount, discount_percent, created_at, updated_at, is_latest_version, parent_quote_id',
    )
    .or(`id.eq.${rootId},parent_quote_id.eq.${rootId}`)
    .order('version', { ascending: true });

  if (versionsError) throw versionsError;

  const versionIds = (quoteVersions || []).map((version) => version.id);
  if (versionIds.length === 0) return [];

  const { data: itemCounts, error: itemsError } = await supabase
    .from('quote_items')
    .select('quote_id')
    .in('quote_id', versionIds);

  if (itemsError) throw itemsError;

  const countMap = new Map<string, number>();
  (itemCounts || []).forEach((item) => {
    countMap.set(item.quote_id, (countMap.get(item.quote_id) || 0) + 1);
  });

  return (quoteVersions || []).map((version) => ({
    ...version,
    items_count: countMap.get(version.id) || 0,
  }));
}

async function createAndLoadQuoteVersion(
  sourceQuoteId: string,
  fetchQuote: (quoteId: string) => Promise<Quote | null>,
  fetchVersions: (targetQuoteId?: string) => Promise<void>,
): Promise<Quote> {
  const newQuoteId = await quoteVersionService.createAtomicVersion(sourceQuoteId);
  const newQuote = await fetchQuote(newQuoteId);
  if (!newQuote) throw new Error('A nova versão foi criada, mas não pôde ser carregada.');

  toast.success(`Versão ${newQuote.version} criada!`, {
    description: `Novo orçamento ${newQuote.quote_number}.`,
  });
  await fetchVersions(sourceQuoteId);

  return newQuote;
}

export function useQuoteVersions(quoteId?: string) {
  const { user } = useAuth();
  const { fetchQuote } = useQuotes();
  const [versions, setVersions] = useState<QuoteVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchVersions = useCallback(
    async (targetQuoteId?: string) => {
      const id = targetQuoteId || quoteId;
      if (!id) return;

      setIsLoading(true);
      try {
        setVersions(await loadQuoteVersions(id));
      } catch (err) {
        console.error('Error fetching quote versions:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [quoteId],
  );

  const createNewVersion = useCallback(
    async (sourceQuoteId: string): Promise<Quote | null> => {
      if (!user) {
        toast.error('Usuário não autenticado');
        return null;
      }

      setIsLoading(true);
      try {
        return await createAndLoadQuoteVersion(sourceQuoteId, fetchQuote, fetchVersions);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao criar versão';
        toast.error('Erro ao criar nova versão', { description: message });
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [user, fetchQuote, fetchVersions],
  );

  return {
    versions,
    isLoading,
    fetchVersions,
    createNewVersion,
    hasMultipleVersions: versions.length > 1,
  };
}
