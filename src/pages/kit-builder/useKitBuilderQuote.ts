/**
 * Criação autenticada de orçamento a partir do Kit Builder.
 * O navegador envia somente identidade, IDs e quantidades; preço, estoque e
 * técnicas são revalidados no catálogo pela Edge Function antes da RPC atômica.
 */

import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { KitState } from '@/hooks/useKitBuilder';
import { buildKitQuotePayload, kitQuoteFingerprint } from './kitQuoteRequest';

interface KitQuoteResponse {
  quoteId?: unknown;
  quoteNumber?: unknown;
  total?: unknown;
  stockReserved?: unknown;
  error?: unknown;
}

async function functionErrorMessage(error: unknown, response: KitQuoteResponse): Promise<string> {
  if (typeof response.error === 'string') return response.error;
  const context = (error as { context?: unknown } | null)?.context;
  if (context instanceof Response) {
    try {
      const payload = await context.clone().json() as { error?: unknown };
      if (typeof payload.error === 'string') return payload.error;
    } catch {
      // A resposta pode não ser JSON; nesse caso preservamos a mensagem do SDK.
    }
  }
  return error instanceof Error ? error.message : 'Não foi possível concluir a criação.';
}

export function useKitBuilderQuote() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isCreatingQuote, setIsCreatingQuote] = useState(false);
  const idempotencyRef = useRef<{ fingerprint: string; key: string } | null>(null);

  const handleAddToQuote = async (kitState: KitState, kitQuantity: number) => {
    if (!user?.id) {
      toast.error('Você precisa estar logado para criar um orçamento.');
      return;
    }

    setIsCreatingQuote(true);
    try {
      const candidate = buildKitQuotePayload(kitState, kitQuantity, 'pending');
      const fingerprint = kitQuoteFingerprint(candidate);
      if (idempotencyRef.current?.fingerprint !== fingerprint) {
        idempotencyRef.current = { fingerprint, key: crypto.randomUUID() };
      }
      const payload = { ...candidate, idempotencyKey: idempotencyRef.current.key };

      const { data, error } = await supabase.functions.invoke('sicoob-kit-quote', {
        body: payload,
      });
      const response = (data ?? {}) as KitQuoteResponse;
      if (error) throw new Error(await functionErrorMessage(error, response));
      if (typeof response.error === 'string') throw new Error(response.error);
      if (typeof response.quoteId !== 'string') throw new Error('A criação não retornou um orçamento válido.');

      const quoteNumber = typeof response.quoteNumber === 'string' ? response.quoteNumber : 'criado';
      toast.success(`Orçamento ${quoteNumber} criado!`, {
        description: 'Preços e disponibilidade foram conferidos agora. O estoque permanece consultivo até a confirmação.',
      });
      navigate(`/orcamentos/${response.quoteId}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error(`Erro ao criar orçamento: ${message}`);
    } finally {
      setIsCreatingQuote(false);
    }
  };

  return { handleAddToQuote, isCreatingQuote };
}
