/**
 * ProductMarketingSection — Seletores de classificação de marketing (padrão Super Filtro)
 * Público-Alvo, Datas Comemorativas e Endomarketing
 * Gradientes, badges, color dots, contadores hierárquicos
 */

import { useState, useEffect, useCallback, type ElementType } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { X, Users, Calendar, Megaphone, ChevronDown, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PRIMARY_TEXT = "text-primary";
import { PUBLICO_ALVO, DATAS_COMEMORATIVAS, ENDOMARKETING } from '@/data/mockData';

interface ProductMarketingSectionProps {
  productId: string;
}

interface ProductTags {
  publicoAlvo: string[];
  datasComemorativas: string[];
  endomarketing: string[];
}

function toArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string' && !!v.trim());
  if (typeof value === 'string') return value.split(/[,;|]/).map(v => v.trim()).filter(Boolean);
  return [];
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function parseTags(value: unknown): Record<string, unknown> {
  if (typeof value !== 'string') return recordValue(value);
  try { return recordValue(JSON.parse(value)); } catch { return {}; }
}

function tagsFromResponse(data: unknown): Record<string, unknown> {
  const root = recordValue(data);
  const payload = recordValue(root.data);
  const records = Array.isArray(payload.records) ? payload.records : [];
  const product = recordValue(records[0] ?? payload);
  return parseTags(product.tags);
}

async function fetchProductTags(productId: string): Promise<ProductTags> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: { table: 'products', operation: 'select', id: productId },
  });
  if (error) throw new Error(error.message);

  const tags = tagsFromResponse(data);

  return ({
    publicoAlvo: toArray(tags.publicoAlvo ?? tags.publico_alvo),
    datasComemorativas: toArray(tags.datasComemorativas ?? tags.datas_comemorativas),
    endomarketing: toArray(tags.endomarketing),
  });
}

async function saveProductTags(productId: string, tags: ProductTags): Promise<void> {
  const payload = {
    publicoAlvo: tags.publicoAlvo,
    datasComemorativas: tags.datasComemorativas,
    endomarketing: tags.endomarketing,
    publico_alvo: tags.publicoAlvo,
    datas_comemorativas: tags.datasComemorativas,
  };

  const { error } = await supabase.functions.invoke('external-db-bridge', {
    body: { table: 'products', operation: 'update', id: productId, data: { tags: payload } },
  });
  if (error) throw new Error(error.message);
}

type CategoryKey = keyof ProductTags;

const CATEGORY_COLORS: Record<CategoryKey, string> = {
  publicoAlvo: '#3B82F6',
  datasComemorativas: '#EF4444',
  endomarketing: '#8B5CF6',
};

const CATEGORIES: {
  key: CategoryKey;
  label: string;
  icon: ElementType;
  options: string[];
}[] = [
  { key: 'publicoAlvo', label: 'Público-Alvo', icon: Users, options: [...PUBLICO_ALVO].sort((a, b) => a.localeCompare(b, 'pt-BR')) },
  { key: 'datasComemorativas', label: 'Datas Comemorativas', icon: Calendar, options: [...DATAS_COMEMORATIVAS].sort((a, b) => a.localeCompare(b, 'pt-BR')) },
  { key: 'endomarketing', label: 'Endomarketing', icon: Megaphone, options: [...ENDOMARKETING].sort((a, b) => a.localeCompare(b, 'pt-BR')) },
];

type MarketingCategory = (typeof CATEGORIES)[number];

function CategoryHeader({ category, color, selectedCount, optionCount, open, onToggle }: { category: MarketingCategory; color: string; selectedCount: number; optionCount: number; open: boolean; onToggle: () => void }) {
  const CategoryIcon = category.icon;
  const selected = selectedCount > 0;
  return <div className="flex items-center gap-2 p-2.5"><button type="button" onClick={onToggle} className={cn("p-1 rounded-md transition-all duration-200", open ? "bg-primary/10" : "bg-muted hover:bg-muted/80")}><ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", open ? "rotate-180 text-primary" : "text-muted-foreground")} /></button><div className={cn("w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-offset-1 ring-offset-background transition-all", selected ? "ring-primary/50 scale-110" : "ring-border/50")} style={{ backgroundColor: color, boxShadow: `0 2px 8px ${color}40` }} /><CategoryIcon className={cn("h-3.5 w-3.5 flex-shrink-0 transition-colors", selected ? PRIMARY_TEXT : "text-muted-foreground")} /><span className={cn("text-sm font-medium truncate flex-1 transition-colors", selected ? PRIMARY_TEXT : "text-foreground")}>{category.label}</span><div className="flex items-center gap-1.5 flex-shrink-0">{selectedCount > 0 && <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{selectedCount}</span>}<span className={cn("text-[11px] px-1.5 py-0.5 rounded-full", selected ? "bg-primary/20 text-primary font-medium" : "bg-muted text-muted-foreground")}>{optionCount}</span></div></div>;
}

function CategoryOptions({ categoryKey, options, selected, color, togglingKeys, onToggle }: { categoryKey: CategoryKey; options: string[]; selected: string[]; color: string; togglingKeys: Set<string>; onToggle: (item: string) => void }) {
  return <div className="px-2.5 pb-2.5 space-y-0.5"><div className="border-t border-border/30 pt-2 ml-8">{options.map((option) => { const isSelected = selected.includes(option); const isToggling = togglingKeys.has(`${categoryKey}::${option}`); return <label key={option} className={cn("flex items-center gap-2.5 py-1.5 px-2.5 rounded-md cursor-pointer text-sm transition-all duration-150", isSelected ? "bg-primary/15 text-foreground font-medium shadow-sm" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground")}>{isToggling ? <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" /> : <Checkbox checked={isSelected} onCheckedChange={() => onToggle(option)} className="data-[state=checked]:bg-primary data-[state=checked]:border-primary" />}<span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} /><span className="truncate flex-1">{option}</span>{isSelected && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}</label>; })}</div></div>;
}

function MarketingCategoryGroup({ category, tags, search, openGroups, togglingKeys, onToggleGroup, onToggleItem }: { category: MarketingCategory; tags: ProductTags; search: string; openGroups: Set<string>; togglingKeys: Set<string>; onToggleGroup: () => void; onToggleItem: (item: string) => void }) {
  const selected = tags[category.key] ?? [];
  const query = search.toLowerCase();
  const filteredOptions = search ? category.options.filter((option) => option.toLowerCase().includes(query)) : category.options;
  if (search && filteredOptions.length === 0 && !category.label.toLowerCase().includes(query)) return null;
  const open = openGroups.has(category.key) || Boolean(search);
  const hasSelection = selected.length > 0;
  const color = CATEGORY_COLORS[category.key];
  return <div className={cn("rounded-lg overflow-hidden transition-all duration-200", hasSelection ? "bg-gradient-to-r from-primary/10 to-primary/5 ring-1 ring-primary/30" : "bg-muted/30 hover:bg-muted/50")}><CategoryHeader category={category} color={color} selectedCount={selected.length} optionCount={filteredOptions.length} open={open} onToggle={onToggleGroup} />{open && filteredOptions.length > 0 && <CategoryOptions categoryKey={category.key} options={filteredOptions} selected={selected} color={color} togglingKeys={togglingKeys} onToggle={onToggleItem} />}</div>;
}

export function ProductMarketingSection({ productId }: ProductMarketingSectionProps) {
  const [tags, setTags] = useState<ProductTags>({ publicoAlvo: [], datasComemorativas: [], endomarketing: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingKeys, setTogglingKeys] = useState<Set<string>>(new Set());
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchProductTags(productId).then(t => {
      setTags(t);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [productId]);

  const toggleItem = useCallback(async (category: CategoryKey, item: string) => {
    const toggleKey = `${category}::${item}`;
    if (togglingKeys.has(toggleKey)) return;
    setTogglingKeys(prev => new Set(prev).add(toggleKey));

    const current = tags[category] || [];
    const isSelected = current.includes(item);
    const updated = isSelected ? current.filter(i => i !== item) : [...current, item];

    const newTags = { ...tags, [category]: updated };
    setTags(newTags);

    setSaving(true);
    try {
      await saveProductTags(productId, newTags);
      toast.success(isSelected ? 'Removido' : 'Adicionado');
    } catch (err) {
      setTags(tags);
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
      setTogglingKeys(prev => { const next = new Set(prev); next.delete(toggleKey); return next; });
    }
  }, [productId, tags, togglingKeys]);

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const clearAll = useCallback(async () => {
    const newTags: ProductTags = { publicoAlvo: [], datasComemorativas: [], endomarketing: [] };
    setTags(newTags);
    setSaving(true);
    try {
      await saveProductTags(productId, newTags);
      toast.success('Todas as classificações removidas');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao limpar');
    } finally {
      setSaving(false);
    }
  }, [productId]);

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );
  }

  const totalSelected = CATEGORIES.reduce((sum, cat) => sum + (tags[cat.key]?.length || 0), 0);
  const totalOptions = CATEGORIES.reduce((sum, cat) => sum + cat.options.length, 0);
  return (
    <div className="space-y-3">
      {/* Badges dos selecionados */}
      {totalSelected > 0 && (
        <div className="p-2.5 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-primary flex items-center gap-1.5">
              <Megaphone className="h-3 w-3" />
              Selecionados
              {saving && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
            </span>
            <button
              type="button"
              onClick={clearAll}
              className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
            >
              Limpar todos
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.flatMap(cat =>
              (tags[cat.key] || []).sort((a, b) => a.localeCompare(b, 'pt-BR')).map(item => (
                <span
                  key={`${cat.key}-${item}`}
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium border border-border bg-background text-foreground hover:bg-muted/50 cursor-pointer transition-all duration-200"
                  onClick={() => toggleItem(cat.key, item)}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: CATEGORY_COLORS[cat.key] }}
                  />
                  <span className="truncate max-w-[100px]">{item}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleItem(cat.key, item); }}
                    className="rounded-full p-0.5 ml-0.5 hover:bg-destructive/20 hover:text-destructive transition-all duration-150"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>
      )}

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar classificação..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-8 text-sm pl-8 pr-8"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Estatísticas */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
        <span>{CATEGORIES.length} categorias</span>
        <span>•</span>
        <span>{totalOptions} opções</span>
        <span>•</span>
        <span className={cn("font-medium", totalSelected > 0 && PRIMARY_TEXT)}>
          {totalSelected} selecionados
        </span>
      </div>

      {/* Árvore de categorias */}
      <ScrollArea className="h-56">
        <div className="space-y-1.5 pr-3">
          {CATEGORIES.map((category) => <MarketingCategoryGroup key={category.key} category={category} tags={tags} search={search} openGroups={openGroups} togglingKeys={togglingKeys} onToggleGroup={() => toggleGroup(category.key)} onToggleItem={(item) => void toggleItem(category.key, item)} />)}
        </div>
      </ScrollArea>
    </div>
  );
}
