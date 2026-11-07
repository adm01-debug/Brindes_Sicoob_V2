import { useEffect } from 'react';
import { toast } from 'sonner';
import { fetchPromobrindProductById } from '@/lib/external-db';
import type { QuoteItem } from '@/hooks/quotes/quoteTypes';
import { mapPromobrindToProduct } from '@/utils/product-mapper';
import { resolveQuoteUrlPrefill } from './quote-url-prefill';

interface QuoteUrlPrefillParams {
  isEditMode: boolean;
  searchParams: URLSearchParams;
  setClientId: (value: string) => void;
  setItems: (value: QuoteItem[]) => void;
  setActiveItemIndex: (value: number | null) => void;
}

function showPrefillIssues(result: Awaited<ReturnType<typeof resolveQuoteUrlPrefill>>): void {
  if (result.unavailableIds.length > 0) {
    toast.error(
      `${result.unavailableIds.length} produto(s) não puderam ser carregados do catálogo`,
    );
  }
  if (result.truncatedCount > 0) {
    toast.error(`A pré-carga foi limitada a 20 produtos; ${result.truncatedCount} foram ignorados`);
  }
  if (result.invalidCount > 0) {
    toast.error(`${result.invalidCount} item(ns) inválido(s) do link foram ignorados`);
  }
}

function clearCompletePrefillUrl(result: Awaited<ReturnType<typeof resolveQuoteUrlPrefill>>): void {
  const hasIssues =
    result.unavailableIds.length > 0 || result.truncatedCount > 0 || result.invalidCount > 0;
  if (!hasIssues) window.history.replaceState({}, document.title, window.location.pathname);
}

export function useQuoteUrlPrefill({
  isEditMode,
  searchParams,
  setClientId,
  setItems,
  setActiveItemIndex,
}: QuoteUrlPrefillParams): void {
  useEffect(() => {
    if (isEditMode) return;
    const hasProductIds = ['product_id', 'products', 'produto', 'items[]'].some((key) =>
      searchParams.has(key),
    );
    if (!hasProductIds) return;

    let cancelled = false;
    void resolveQuoteUrlPrefill(searchParams, async (id) => {
      const rawProduct = await fetchPromobrindProductById(id);
      return rawProduct ? mapPromobrindToProduct(rawProduct) : null;
    })
      .then((result) => {
        if (cancelled) return;
        if (result.clientId && result.items.length > 0) setClientId(result.clientId);
        if (result.items.length > 0) {
          setItems(result.items);
          setActiveItemIndex(0);
          toast.success(
            `${result.items.length} produto(s) adicionado(s) ao orçamento com dados atuais do catálogo`,
          );
        }
        showPrefillIssues(result);
        clearCompletePrefillUrl(result);
      })
      .catch(() => {
        if (!cancelled) {
          console.error('Falha ao carregar produtos do catálogo para o orçamento');
          toast.error('Não foi possível carregar os produtos do catálogo. Tente novamente.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isEditMode, searchParams, setActiveItemIndex, setClientId, setItems]);
}
