/**
 * ProductTagsSection — Seletor de tags do produto (padrão Super Filtro)
 * Gradientes, badges removíveis, color dots, contadores
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { X, Search, Tag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const EXTERNAL_DB_BRIDGE = 'external-db-bridge';

interface ProductTagsSectionProps {
  productId: string;
}

interface ExternalTag {
  id: string;
  name: string;
  slug?: string;
  color?: string;
}

interface ProductTag {
  id: string;
  product_id: string;
  tag_id: string;
}

async function fetchTags(): Promise<ExternalTag[]> {
  const { data, error } = await supabase.functions.invoke(EXTERNAL_DB_BRIDGE, {
    body: { table: 'tags', operation: 'select', limit: 500, orderBy: { column: 'name', ascending: true }, countMode: 'none' },
  });
  if (error) throw new Error(error.message);
  return data?.data?.records || [];
}

async function fetchProductTags(productId: string): Promise<ProductTag[]> {
  const { data, error } = await supabase.functions.invoke(EXTERNAL_DB_BRIDGE, {
    body: { table: 'product_tags', operation: 'select', filters: { product_id: productId }, limit: 500 },
  });
  if (error) throw new Error(error.message);
  return data?.data?.records || [];
}

async function removeProductTag(productId: string, tagId: string, productTags: ProductTag[]) {
  let id = productTags.find((item) => item.tag_id === tagId)?.id;
  if (!id) {
    const { data } = await supabase.functions.invoke(EXTERNAL_DB_BRIDGE, {
      body: { table: 'product_tags', operation: 'select', filters: { product_id: productId, tag_id: tagId }, limit: 1 },
    });
    id = data?.data?.records?.[0]?.id;
  }
  if (!id) {
    toast.error('Registro não encontrado');
    return false;
  }
  await supabase.functions.invoke(EXTERNAL_DB_BRIDGE, { body: { table: 'product_tags', operation: 'delete', id } });
  return true;
}

function SelectedTags({ linkedIds, onClear, onToggle, tags }: {
  linkedIds: Set<string>; onClear: () => void; onToggle: (id: string) => void; tags: ExternalTag[];
}) {
  if (linkedIds.size === 0) return null;
  const selected = tags.filter((tag) => linkedIds.has(tag.id)).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  return (
    <div className="p-2.5 bg-primary/5 rounded-lg border border-primary/20">
      <div className="flex items-center justify-between mb-2"><span className="text-xs font-medium text-primary flex items-center gap-1.5"><Tag className="h-3 w-3" />Selecionadas</span><button type="button" onClick={onClear} className="text-[10px] text-muted-foreground hover:text-destructive transition-colors">Limpar todas</button></div>
      <div className="flex flex-wrap gap-1.5">{selected.map((tag) => <span key={tag.id} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium border border-border bg-background text-foreground hover:bg-muted/50 cursor-pointer transition-all duration-200" onClick={() => onToggle(tag.id)}>
        {tag.color && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />}<span className="truncate max-w-[100px]">{tag.name}</span>
        <button type="button" onClick={(event) => { event.stopPropagation(); onToggle(tag.id); }} className="rounded-full p-0.5 ml-0.5 hover:bg-destructive/20 hover:text-destructive transition-all duration-150"><X className="w-2.5 h-2.5" /></button>
      </span>)}</div>
    </div>
  );
}

function TagsList({ filtered, linkedIds, search, togglingIds, onToggle }: {
  filtered: ExternalTag[]; linkedIds: Set<string>; search: string; togglingIds: Set<string>;
  onToggle: (id: string, linked: boolean) => void;
}) {
  if (filtered.length === 0 && search) return <div className="text-center py-6"><Search className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" /><p className="text-sm text-muted-foreground">Nenhuma tag encontrada para "<span className="font-medium">{search}</span>"</p></div>;
  return <>{filtered.map((tag) => {
    const linked = linkedIds.has(tag.id);
    return <label key={tag.id} className={cn("flex items-center gap-2.5 py-1.5 px-2.5 rounded-md cursor-pointer text-sm transition-all duration-150", linked ? "bg-primary/15 text-foreground font-medium shadow-sm" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground")}>
      {togglingIds.has(tag.id) ? <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" /> : <Checkbox checked={linked} onCheckedChange={() => onToggle(tag.id, linked)} className="data-[state=checked]:bg-primary data-[state=checked]:border-primary" />}
      {tag.color && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />}<span className="truncate flex-1">{tag.name}</span>{linked && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
    </label>;
  })}</>;
}

export function ProductTagsSection({ productId }: ProductTagsSectionProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const { data: tags = [], isLoading: loadingTags } = useQuery({
    queryKey: ['external-tags-admin'],
    queryFn: fetchTags,
    staleTime: 5 * 60 * 1000,
  });

  const { data: productTags = [], isLoading: loadingLinks } = useQuery({
    queryKey: ['product-tags', productId],
    queryFn: () => fetchProductTags(productId),
    enabled: !!productId,
  });

  const linkedTagIds = useMemo(() => new Set(productTags.map((productTag) => productTag.tag_id)), [productTags]);

  const toggleTag = useCallback(async (tagId: string, isLinked: boolean) => {
    if (togglingIds.has(tagId)) return;
    setTogglingIds(prev => new Set(prev).add(tagId));
    try {
      if (isLinked) {
        if (!await removeProductTag(productId, tagId, productTags)) return;
        toast.success('Tag removida');
      } else {
        await supabase.functions.invoke(EXTERNAL_DB_BRIDGE, {
          body: { table: 'product_tags', operation: 'insert', data: { product_id: productId, tag_id: tagId } },
        });
        toast.success('Tag adicionada');
      }
      queryClient.invalidateQueries({ queryKey: ['product-tags', productId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar tag');
    } finally {
      setTogglingIds(prev => { const next = new Set(prev); next.delete(tagId); return next; });
    }
  }, [productId, productTags, queryClient, togglingIds]);

  const clearAll = useCallback(async () => {
    const linked = tags.filter(t => linkedTagIds.has(t.id));
    for (const t of linked) {
      await toggleTag(t.id, true);
    }
  }, [tags, linkedTagIds, toggleTag]);

  const isLoading = (loadingTags || loadingLinks);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );
  }

  if (tags.length === 0) {
    return (
      <div className="text-center py-8">
        <Tag className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Nenhuma tag disponível</p>
      </div>
    );
  }

  const linkedCount = linkedTagIds.size;
  const searchLower = search.toLowerCase();

  const filtered = tags
    .filter(t => !search || t.name.toLowerCase().includes(searchLower))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  return (
    (<div className="space-y-3">
      {/* Badges dos selecionados */}
      <SelectedTags linkedIds={linkedTagIds} onClear={() => { void clearAll(); }}
        onToggle={(id) => { void toggleTag(id, true); }} tags={tags} />

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar tags..."
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
        <span>{tags.length} tags</span>
        <span>•</span>
        <span className={cn("font-medium", linkedCount > 0 && "text-primary")}>
          {linkedCount} selecionadas
        </span>
      </div>

      {/* Lista */}
      <ScrollArea className="h-56">
        <div className="space-y-0.5 pr-3">
          <TagsList filtered={filtered} linkedIds={linkedTagIds} search={search} togglingIds={togglingIds}
            onToggle={(id, linked) => { void toggleTag(id, linked); }} />
        </div>
      </ScrollArea>
    </div>)
  );
}
