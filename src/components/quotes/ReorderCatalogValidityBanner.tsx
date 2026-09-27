import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { sicoobOrderService } from '@/services/sicoob/orderService';

interface ReorderCatalogState {
  reorder_source_order_id: string | null;
  reorder_source_quote_id: string | null;
  catalog_revalidated_at: string | null;
  catalog_valid_until: string | null;
  catalog_stock_is_reserved: boolean;
  reorder_price_changed_items: number;
}

interface ReorderCatalogValidityBannerProps {
  quoteId?: string;
  hasUnsavedChanges?: boolean;
  onRevalidated?: () => void | Promise<void>;
}

function formatDateTime(value: string | null): string {
  if (!value) return 'não informada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'inválida';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export function ReorderCatalogValidityBanner({
  quoteId,
  hasUnsavedChanges = false,
  onRevalidated,
}: ReorderCatalogValidityBannerProps) {
  const [state, setState] = useState<ReorderCatalogState | null>(null);
  const [loading, setLoading] = useState(Boolean(quoteId));
  const [revalidating, setRevalidating] = useState(false);

  const load = useCallback(async () => {
    if (!quoteId) {
      setState(null);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('quotes')
      .select(
        'reorder_source_order_id,reorder_source_quote_id,catalog_revalidated_at,catalog_valid_until,catalog_stock_is_reserved,reorder_price_changed_items',
      )
      .eq('id', quoteId)
      .maybeSingle();
    if (error) {
      setLoading(false);
      return;
    }
    setState(data);
    setLoading(false);
  }, [quoteId]);

  useEffect(() => {
    void load();
  }, [load]);

  const expired = useMemo(() => {
    if (!state?.catalog_valid_until) return true;
    return new Date(state.catalog_valid_until).getTime() <= Date.now();
  }, [state?.catalog_valid_until]);

  if (!quoteId || loading || !state) return null;
  if (!state.reorder_source_order_id && !state.reorder_source_quote_id) return null;

  const handleRevalidate = async () => {
    if (hasUnsavedChanges) return;
    setRevalidating(true);
    try {
      const result = await sicoobOrderService.revalidateReorderQuote(quoteId);
      toast.success('Catálogo reconsultado', {
        description:
          result.priceChangedItems > 0
            ? `${result.priceChangedItems} item(ns) receberam o preço atual. Revise o total antes de continuar.`
            : 'Preço, mínimo e estoque foram confirmados novamente.',
      });
      await load();
      await onRevalidated?.();
    } catch (error) {
      toast.error('Não foi possível revalidar a recompra', {
        description:
          error instanceof Error ? error.message : 'Tente novamente em alguns instantes.',
      });
    } finally {
      setRevalidating(false);
    }
  };

  return (
    <div
      data-testid="reorder-catalog-validity"
      className={
        expired
          ? 'flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between'
          : 'flex flex-col gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-emerald-900 dark:text-emerald-100 sm:flex-row sm:items-center sm:justify-between'
      }
    >
      <div className="flex items-start gap-3">
        {expired ? (
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        )}
        <div className="space-y-1">
          <p className="text-sm font-semibold">
            {expired ? 'Revalide preço e disponibilidade' : 'Consulta atual do catálogo registrada'}
          </p>
          <p className="text-xs leading-relaxed opacity-90">
            Consulta: {formatDateTime(state.catalog_revalidated_at)} · válida até{' '}
            {formatDateTime(state.catalog_valid_until)}. O saldo exibido é informativo e não reserva
            estoque no fornecedor.
          </p>
          {state.reorder_price_changed_items > 0 && (
            <p className="text-xs font-medium">
              {state.reorder_price_changed_items} item(ns) mudaram de preço em relação à origem.
            </p>
          )}
          {hasUnsavedChanges && (
            <p className="text-xs font-medium">
              Salve ou descarte as alterações locais antes de reconsultar.
            </p>
          )}
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 gap-2 bg-background/80"
        disabled={revalidating || hasUnsavedChanges}
        onClick={handleRevalidate}
      >
        {revalidating ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        )}
        {revalidating ? 'Reconsultando' : 'Reconsultar agora'}
      </Button>
    </div>
  );
}
