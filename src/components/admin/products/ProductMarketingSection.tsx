/**
 * Curadoria editorial de produtos do catálogo externo.
 * As classificações pertencem ao banco local do portal e não alteram o cadastro mestre.
 */
import { useCallback, useEffect, useMemo, useState, type ElementType } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Briefcase, ChevronDown, Gem, Loader2, Search, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  useCatalogMarketingOptions,
  type CatalogMarketingOption,
} from '@/hooks/useCatalogMarketing';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ProductMarketingSectionProps {
  productId: string;
}

type CategoryKey = 'publicoAlvo' | 'endomarketing' | 'temaSicoob';

interface MarketingCategory {
  key: CategoryKey;
  label: string;
  icon: ElementType;
  options: CatalogMarketingOption[];
}

const PRIMARY_TEXT = 'text-primary';
const CATEGORY_COLORS: Record<CategoryKey, string> = {
  publicoAlvo: '#3B82F6',
  endomarketing: '#8B5CF6',
  temaSicoob: '#00AE9D',
};

function marketingOptionsState(queries: Array<{ isPending: boolean; error: Error | null }>) {
  return {
    isPending: queries.some((query) => query.isPending),
    error: queries.find((query) => query.error)?.error ?? null,
  };
}

async function fetchAssignedTermIds(productId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('catalog_product_marketing')
    .select('term_id')
    .eq('product_id', productId);
  if (error) throw error;
  return (data ?? []).map((row) => row.term_id);
}

async function setProductTerm(productId: string, termId: string, selected: boolean): Promise<void> {
  if (selected) {
    const { error } = await supabase
      .from('catalog_product_marketing')
      .insert({ product_id: productId, term_id: termId });
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from('catalog_product_marketing')
    .delete()
    .eq('product_id', productId)
    .eq('term_id', termId);
  if (error) throw error;
}

function CategoryHeader({ category, selectedCount, open, onToggle }: {
  category: MarketingCategory;
  selectedCount: number;
  open: boolean;
  onToggle: () => void;
}) {
  const CategoryIcon = category.icon;
  const selected = selectedCount > 0;
  const color = CATEGORY_COLORS[category.key];
  return (
    <div className="flex items-center gap-2 p-2.5">
      <button type="button" onClick={onToggle} className={cn('p-1 rounded-md transition-all duration-200', open ? 'bg-primary/10' : 'bg-muted hover:bg-muted/80')}>
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', open ? 'rotate-180 text-primary' : 'text-muted-foreground')} />
      </button>
      <div className={cn('w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-offset-1 ring-offset-background transition-all', selected ? 'ring-primary/50 scale-110' : 'ring-border/50')} style={{ backgroundColor: color, boxShadow: `0 2px 8px ${color}40` }} />
      <CategoryIcon className={cn('h-3.5 w-3.5 flex-shrink-0 transition-colors', selected ? PRIMARY_TEXT : 'text-muted-foreground')} />
      <span className={cn('text-sm font-medium truncate flex-1 transition-colors', selected ? PRIMARY_TEXT : 'text-foreground')}>{category.label}</span>
      {selectedCount > 0 && <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{selectedCount}</span>}
      <span className={cn('text-[11px] px-1.5 py-0.5 rounded-full', selected ? 'bg-primary/20 text-primary font-medium' : 'bg-muted text-muted-foreground')}>{category.options.length}</span>
    </div>
  );
}

function CategoryOptions({ category, selectedIds, togglingIds, onToggle }: {
  category: MarketingCategory;
  selectedIds: Set<string>;
  togglingIds: Set<string>;
  onToggle: (term: CatalogMarketingOption) => void;
}) {
  return (
    <div className="px-2.5 pb-2.5 space-y-0.5">
      <div className="border-t border-border/30 pt-2 ml-8">
        {category.options.map((option) => {
          const selected = selectedIds.has(option.id);
          const toggling = togglingIds.has(option.id);
          return (
            <label key={option.id} className={cn('flex items-center gap-2.5 py-1.5 px-2.5 rounded-md cursor-pointer text-sm transition-all duration-150', selected ? 'bg-primary/15 text-foreground font-medium shadow-sm' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground')}>
              {toggling ? <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" /> : <Checkbox checked={selected} onCheckedChange={() => onToggle(option)} className="data-[state=checked]:bg-primary data-[state=checked]:border-primary" />}
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CATEGORY_COLORS[category.key] }} />
              <span className="truncate flex-1">{option.name}</span>
              {selected && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function MarketingCategoryGroup({ category, selectedIds, search, open, togglingIds, onToggleGroup, onToggleItem }: {
  category: MarketingCategory;
  selectedIds: Set<string>;
  search: string;
  open: boolean;
  togglingIds: Set<string>;
  onToggleGroup: () => void;
  onToggleItem: (term: CatalogMarketingOption) => void;
}) {
  const query = search.toLocaleLowerCase('pt-BR');
  const options = query ? category.options.filter((option) => option.name.toLocaleLowerCase('pt-BR').includes(query)) : category.options;
  if (query && options.length === 0 && !category.label.toLocaleLowerCase('pt-BR').includes(query)) return null;
  const visibleCategory = { ...category, options };
  const selectedCount = category.options.filter((option) => selectedIds.has(option.id)).length;
  return (
    <div className={cn('rounded-lg overflow-hidden transition-all duration-200', selectedCount ? 'bg-gradient-to-r from-primary/10 to-primary/5 ring-1 ring-primary/30' : 'bg-muted/30 hover:bg-muted/50')}>
      <CategoryHeader category={visibleCategory} selectedCount={selectedCount} open={open || Boolean(search)} onToggle={onToggleGroup} />
      {(open || Boolean(search)) && options.length > 0 && <CategoryOptions category={visibleCategory} selectedIds={selectedIds} togglingIds={togglingIds} onToggle={onToggleItem} />}
    </div>
  );
}

export function ProductMarketingSection({ productId }: ProductMarketingSectionProps) {
  const queryClient = useQueryClient();
  const publico = useCatalogMarketingOptions('publico_alvo', true);
  const endomarketing = useCatalogMarketingOptions('endomarketing', true);
  const temas = useCatalogMarketingOptions('tema_sicoob', true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [openGroups, setOpenGroups] = useState<Set<CategoryKey>>(new Set());
  const [search, setSearch] = useState('');

  const categories = useMemo<MarketingCategory[]>(() => [
    { key: 'publicoAlvo', label: 'Público-alvo', icon: Users, options: publico.data ?? [] },
    { key: 'endomarketing', label: 'Endomarketing', icon: Briefcase, options: endomarketing.data ?? [] },
    { key: 'temaSicoob', label: 'Regionalismo/Temas', icon: Gem, options: temas.data ?? [] },
  ], [endomarketing.data, publico.data, temas.data]);

  useEffect(() => {
    let active = true;
    setLoadingAssignments(true);
    fetchAssignedTermIds(productId)
      .then((ids) => { if (active) setSelectedIds(new Set(ids)); })
      .catch((error: unknown) => { if (active) toast.error(error instanceof Error ? error.message : 'Erro ao carregar classificações'); })
      .finally(() => { if (active) setLoadingAssignments(false); });
    return () => { active = false; };
  }, [productId]);

  const toggleItem = useCallback(async (term: CatalogMarketingOption) => {
    if (togglingIds.has(term.id)) return;
    const wasSelected = selectedIds.has(term.id);
    setTogglingIds((current) => new Set(current).add(term.id));
    setSelectedIds((current) => {
      const next = new Set(current);
      if (wasSelected) next.delete(term.id); else next.add(term.id);
      return next;
    });
    try {
      await setProductTerm(productId, term.id, !wasSelected);
      await queryClient.invalidateQueries({ queryKey: ['catalog-marketing-options'] });
      toast.success(wasSelected ? 'Classificação removida' : 'Classificação adicionada');
    } catch (error) {
      setSelectedIds((current) => {
        const next = new Set(current);
        if (wasSelected) next.add(term.id); else next.delete(term.id);
        return next;
      });
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar classificação');
    } finally {
      setTogglingIds((current) => { const next = new Set(current); next.delete(term.id); return next; });
    }
  }, [productId, queryClient, selectedIds, togglingIds]);

  const clearAll = useCallback(async () => {
    const previous = new Set(selectedIds);
    setSelectedIds(new Set());
    const { error } = await supabase.from('catalog_product_marketing').delete().eq('product_id', productId);
    if (error) {
      setSelectedIds(previous);
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['catalog-marketing-options'] });
    toast.success('Todas as classificações foram removidas');
  }, [productId, queryClient, selectedIds]);

  const optionsState = marketingOptionsState([publico, endomarketing, temas]);
  if ([loadingAssignments, optionsState.isPending].some(Boolean)) {
    return <div className="space-y-2"><Skeleton className="h-12 w-full rounded-lg" /><Skeleton className="h-12 w-full rounded-lg" /><Skeleton className="h-12 w-full rounded-lg" /></div>;
  }
  if (optionsState.error) return <p className="text-sm text-destructive">Não foi possível carregar a taxonomia editorial.</p>;

  const selectedOptions = categories.flatMap((category) => category.options.map((option) => ({ category, option }))).filter(({ option }) => selectedIds.has(option.id));
  const totalOptions = categories.reduce((total, category) => total + category.options.length, 0);
  return (
    <div className="space-y-3">
      {selectedOptions.length > 0 && (
        <div className="p-2.5 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center justify-between mb-2"><span className="text-xs font-medium text-primary">Selecionados</span><button type="button" onClick={() => void clearAll()} className="text-[10px] text-muted-foreground hover:text-destructive transition-colors">Limpar todos</button></div>
          <div className="flex flex-wrap gap-1.5">
            {selectedOptions.map(({ category, option }) => <button type="button" key={option.id} onClick={() => void toggleItem(option)} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium border border-border bg-background text-foreground hover:bg-muted/50"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[category.key] }} /><span className="truncate max-w-[140px]">{option.name}</span><X className="w-2.5 h-2.5" /></button>)}
          </div>
        </div>
      )}
      <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Buscar classificação..." value={search} onChange={(event) => setSearch(event.target.value)} className="h-8 text-sm pl-8 pr-8" />{search && <button type="button" onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}</div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1"><span>{categories.length} categorias</span><span>•</span><span>{totalOptions} opções</span><span>•</span><span className={cn('font-medium', selectedOptions.length > 0 && PRIMARY_TEXT)}>{selectedOptions.length} selecionados</span></div>
      <ScrollArea className="h-56"><div className="space-y-1.5 pr-3">{categories.map((category) => <MarketingCategoryGroup key={category.key} category={category} selectedIds={selectedIds} search={search} open={openGroups.has(category.key)} togglingIds={togglingIds} onToggleGroup={() => setOpenGroups((current) => { const next = new Set(current); if (next.has(category.key)) next.delete(category.key); else next.add(category.key); return next; })} onToggleItem={(term) => void toggleItem(term)} />)}</div></ScrollArea>
    </div>
  );
}
