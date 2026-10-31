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
  canRevalidate?: boolean;
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

function ValidityIcon({ expired }: { expired: boolean }) {
  return expired ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
    : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />;
}

function CatalogValidityContent({ state, expired, unsaved, readOnly }: {
  state: ReorderCatalogState; expired: boolean; unsaved: boolean; readOnly: boolean;
}) {
  return <div className="flex items-start gap-3"><ValidityIcon expired={expired} /><div className="space-y-1">
    <p className="text-sm font-semibold">{expired ? 'Revalide preço e disponibilidade' : 'Consulta atual do catálogo registrada'}</p>
    <p className="text-xs leading-relaxed opacity-90">Consulta: {formatDateTime(state.catalog_revalidated_at)} · válida até{' '}
      {formatDateTime(state.catalog_valid_until)}. O saldo exibido é informativo e não reserva estoque no fornecedor.</p>
    {state.reorder_price_changed_items > 0 && <p className="text-xs font-medium">
      {state.reorder_price_changed_items} item(ns) mudaram de preço em relação à origem.</p>}
    {unsaved && <p className="text-xs font-medium">Salve ou descarte as alterações locais antes de reconsultar.</p>}
    {readOnly && <p className="text-xs font-medium">Reabra a versão vigente antes de reconsultar o catálogo.</p>}
  </div></div>;
}

function RevalidateButton({ loading, disabled, onClick }: { loading: boolean; disabled: boolean; onClick: () => void }) {
  return <Button type="button" variant="outline" size="sm" className="shrink-0 gap-2 bg-background/80"
    disabled={loading || disabled} onClick={onClick}>
    {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
    {loading ? 'Reconsultando' : 'Reconsultar agora'}
  </Button>;
}

function isCatalogExpired(state: ReorderCatalogState | null): boolean {
  if (!state?.catalog_valid_until) return true;
  return new Date(state.catalog_valid_until).getTime() <= Date.now();
}

async function revalidateCatalog(args: {
  quoteId: string; load: () => Promise<void>; onRevalidated?: () => void | Promise<void>;
  setRevalidating: (value: boolean) => void;
}): Promise<void> {
  args.setRevalidating(true);
  try {
    const result = await sicoobOrderService.revalidateReorderQuote(args.quoteId);
    toast.success('Catálogo reconsultado', { description: result.priceChangedItems > 0
      ? `${result.priceChangedItems} item(ns) receberam o preço atual. Revise o total antes de continuar.`
      : 'Preço, mínimo e estoque foram confirmados novamente.' });
    await args.load();
    await args.onRevalidated?.();
  } catch (error) {
    toast.error('Não foi possível revalidar a recompra', { description: error instanceof Error ? error.message : 'Tente novamente em alguns instantes.' });
  } finally { args.setRevalidating(false); }
}

function useCatalogRecord(quoteId?: string) {
  const [state, setState] = useState<ReorderCatalogState | null>(null);
  const [loading, setLoading] = useState(Boolean(quoteId));
  const load = useCallback(async () => {
    if (!quoteId) { setState(null); setLoading(false); return; }
    // rls-allow: lookup por id específico; RLS valida ownership e organização do orçamento
    const { data, error } = await supabase.from('quotes')
      .select('reorder_source_order_id,reorder_source_quote_id,catalog_revalidated_at,catalog_valid_until,catalog_stock_is_reserved,reorder_price_changed_items')
      .eq('id', quoteId).maybeSingle();
    if (!error) setState(data);
    setLoading(false);
  }, [quoteId]);
  useEffect(() => { void load(); }, [load]);
  const expired = useMemo(() => isCatalogExpired(state), [state]);
  return { state, loading, load, expired };
}

export function ReorderCatalogValidityBanner({
  quoteId,
  hasUnsavedChanges = false,
  canRevalidate = true,
  onRevalidated,
}: ReorderCatalogValidityBannerProps) {
  const [revalidating, setRevalidating] = useState(false);
  const { state, loading, load, expired } = useCatalogRecord(quoteId);

  if (!quoteId || loading || !state) return null;
  if (!state.reorder_source_order_id && !state.reorder_source_quote_id) return null;

  const handleRevalidate = async () => {
    if (hasUnsavedChanges || !canRevalidate) return;
    await revalidateCatalog({ quoteId, load, onRevalidated, setRevalidating });
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
      <CatalogValidityContent state={state} expired={expired} unsaved={hasUnsavedChanges} readOnly={!canRevalidate} />
      <RevalidateButton loading={revalidating} disabled={hasUnsavedChanges || !canRevalidate} onClick={handleRevalidate} />
    </div>
  );
}
