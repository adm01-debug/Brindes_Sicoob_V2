/**
 * ProductRamosSection — Seletor hierárquico de Ramos de Atividade (padrão Super Filtro)
 * Gradientes, color dots, contadores, busca, badges removíveis
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ramoAtividadeService } from '@/services/ramoAtividadeService';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { X, ChevronDown, Building2, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { RamoAtividade, RamoAtividadeFilho } from '@/types/ramo-atividade';

interface ProductRamosSectionProps {
  productId: string;
}

function SegmentOption({ segment, color, linked, toggling, onToggle }: { segment: RamoAtividadeFilho; color: string | null; linked: boolean; toggling: boolean; onToggle: (id: string, linked: boolean) => void }) {
  return (
    <label className={cn("flex items-center gap-2.5 py-1.5 px-2.5 rounded-md cursor-pointer text-sm transition-all duration-150", linked ? "bg-primary/15 text-foreground font-medium shadow-sm" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground")}>
      {toggling ? <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" /> : <Checkbox checked={linked} onCheckedChange={() => onToggle(segment.id, linked)} className="data-[state=checked]:bg-primary data-[state=checked]:border-primary" />}
      {color && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />}
      <span className="truncate flex-1">{segment.nome}</span>
      {linked && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
    </label>
  );
}

function RamoHeader({ ramo, open, hasSelection, linkedCount, childCount, onToggle }: { ramo: RamoAtividade; open: boolean; hasSelection: boolean; linkedCount: number; childCount: number; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-2 p-2.5">
      <button type="button" onClick={onToggle} className={cn("p-1 rounded-md transition-all duration-200", open ? "bg-primary/10" : "bg-muted hover:bg-muted/80")}><ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", open ? "rotate-180 text-primary" : "text-muted-foreground")} /></button>
      {ramo.cor && <div className={cn("w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-offset-1 ring-offset-background transition-all", hasSelection ? "ring-primary/50 scale-110" : "ring-border/50")} style={{ backgroundColor: ramo.cor, boxShadow: `0 2px 8px ${ramo.cor}40` }} />}
      <span className={cn("text-sm font-medium truncate flex-1 transition-colors", hasSelection ? "text-primary" : "text-foreground")}>{ramo.nome}</span>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {linkedCount > 0 && <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{linkedCount}</span>}
        <span className={cn("text-[11px] px-1.5 py-0.5 rounded-full", hasSelection ? "bg-primary/20 text-primary font-medium" : "bg-muted text-muted-foreground")}>{childCount}</span>
      </div>
    </div>
  );
}

function RamoTreeNode({ ramo, children, linkedIds, togglingIds, open, onToggleGroup, onToggleSegment }: { ramo: RamoAtividade; children: RamoAtividadeFilho[]; linkedIds: Set<string>; togglingIds: Set<string>; open: boolean; onToggleGroup: (id: string) => void; onToggleSegment: (id: string, linked: boolean) => void }) {
  const linkedCount = children.filter((segment) => linkedIds.has(segment.id)).length;
  const hasSelection = linkedCount > 0;
  return (
    <div className={cn("rounded-lg overflow-hidden transition-all duration-200", hasSelection ? "bg-gradient-to-r from-primary/10 to-primary/5 ring-1 ring-primary/30" : "bg-muted/30 hover:bg-muted/50")}>
      <RamoHeader ramo={ramo} open={open} hasSelection={hasSelection} linkedCount={linkedCount} childCount={children.length} onToggle={() => onToggleGroup(ramo.id)} />
      {open && children.length > 0 && <div className="px-2.5 pb-2.5 space-y-0.5"><div className="border-t border-border/30 pt-2 ml-8">{children.map((segment) => <SegmentOption key={segment.id} segment={segment} color={ramo.cor} linked={linkedIds.has(segment.id)} toggling={togglingIds.has(segment.id)} onToggle={onToggleSegment} />)}</div></div>}
      {open && children.length === 0 && <div className="px-2.5 pb-2.5"><div className="border-t border-border/30 pt-2 ml-8"><p className="text-xs text-muted-foreground italic py-2">Nenhum segmento neste ramo</p></div></div>}
    </div>
  );
}

function SelectedSegments({ segmentos, ramos, linkedIds, onClear, onToggle }: { segmentos: RamoAtividadeFilho[]; ramos: RamoAtividade[]; linkedIds: Set<string>; onClear: () => void; onToggle: (id: string, linked: boolean) => void }) {
  if (linkedIds.size === 0) return null;
  const selected = segmentos.filter((segment) => linkedIds.has(segment.id)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  return (
    <div className="p-2.5 bg-primary/5 rounded-lg border border-primary/20">
      <div className="flex items-center justify-between mb-2"><span className="text-xs font-medium text-primary flex items-center gap-1.5"><Building2 className="h-3 w-3" />Selecionados</span><button type="button" onClick={onClear} className="text-[10px] text-muted-foreground hover:text-destructive transition-colors">Limpar todos</button></div>
      <div className="flex flex-wrap gap-1.5">{selected.map((segment) => {
        const ramo = ramos.find((item) => item.id === segment.ramo_atividade_id);
        return <span key={segment.id} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium border border-border bg-background text-foreground hover:bg-muted/50 cursor-pointer transition-all duration-200" onClick={() => onToggle(segment.id, true)}>{ramo?.cor && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ramo.cor }} />}<span className="truncate max-w-[100px]">{segment.nome}</span><button type="button" onClick={(event) => { event.stopPropagation(); onToggle(segment.id, true); }} className="rounded-full p-0.5 ml-0.5 hover:bg-destructive/20 hover:text-destructive transition-all duration-150"><X className="w-2.5 h-2.5" /></button></span>;
      })}</div>
    </div>
  );
}

function RamosTree({ ramos, segmentosByRamo, linkedIds, togglingIds, openGroups, search, onToggleGroup, onToggleSegment }: { ramos: RamoAtividade[]; segmentosByRamo: Record<string, RamoAtividadeFilho[]>; linkedIds: Set<string>; togglingIds: Set<string>; openGroups: Set<string>; search: string; onToggleGroup: (id: string) => void; onToggleSegment: (id: string, linked: boolean) => void }) {
  return (
    <ScrollArea className="h-56"><div className="space-y-1.5 pr-3">
      {ramos.map((ramo) => <RamoTreeNode key={ramo.id} ramo={ramo} children={(segmentosByRamo[ramo.id] || []).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))} linkedIds={linkedIds} togglingIds={togglingIds} open={openGroups.has(ramo.id) || Boolean(search)} onToggleGroup={onToggleGroup} onToggleSegment={onToggleSegment} />)}
      {ramos.length === 0 && search && <div className="text-center py-6"><Search className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" /><p className="text-sm text-muted-foreground">Nenhum ramo encontrado para "<span className="font-medium">{search}</span>"</p></div>}
    </div></ScrollArea>
  );
}

function filteredRamos(
  ramos: RamoAtividade[],
  segmentosByRamo: Record<string, RamoAtividadeFilho[]>,
  search: string,
): { ramos: RamoAtividade[]; segmentosByRamo: Record<string, RamoAtividadeFilho[]> } {
  if (!search) return { ramos, segmentosByRamo };
  const query = search.toLowerCase();
  const filteredSegments = Object.fromEntries(Object.entries(segmentosByRamo).map(([id, segments]) => [id, segments.filter((segment) => segment.nome.toLowerCase().includes(query))]));
  const visibleRamos = ramos.filter((ramo) => ramo.nome.toLowerCase().includes(query) || (filteredSegments[ramo.id]?.length ?? 0) > 0);
  return { ramos: visibleRamos, segmentosByRamo: filteredSegments };
}

function arrayOrEmpty<T>(value: T[] | null | undefined): T[] {
  return value ?? [];
}

export function ProductRamosSection({ productId }: ProductRamosSectionProps) {
  const queryClient = useQueryClient();
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const { data: ramosData, isLoading: loadingRamos } = useQuery({
    queryKey: ['ramos-atividade-admin'],
    queryFn: () => ramoAtividadeService.getRamos(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: segmentosData, isLoading: loadingSegmentos } = useQuery({
    queryKey: ['segmentos-atividade-admin'],
    queryFn: () => ramoAtividadeService.getSegmentos(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: produtoRamosData, isLoading: loadingLinks } = useQuery({
    queryKey: ['produto-ramos', productId],
    queryFn: () => ramoAtividadeService.getRamosDoProduto(productId),
    enabled: !!productId,
  });

  const linkedSegmentoIds = useMemo(() => new Set(arrayOrEmpty(produtoRamosData?.associacoes)
    .map((association) => association.ramo_atividade_filho_id)), [produtoRamosData?.associacoes]);

  const ramos = arrayOrEmpty(ramosData?.ramos);
  const segmentos = arrayOrEmpty(segmentosData?.segmentos);

  const segmentosByRamo = segmentos.reduce<Record<string, typeof segmentos>>((acc, s) => {
    (acc[s.ramo_atividade_id] ??= []).push(s);
    return acc;
  }, {});

  const toggleSegmento = useCallback(async (segmentoId: string, isLinked: boolean) => {
    if (togglingIds.has(segmentoId)) return;
    setTogglingIds(prev => new Set(prev).add(segmentoId));
    try {
      if (isLinked) {
        await ramoAtividadeService.removeRamoDoProduto(productId, segmentoId);
        toast.success('Segmento removido');
      } else {
        await ramoAtividadeService.addRamoAoProduto(productId, segmentoId);
        toast.success('Segmento adicionado');
      }
      queryClient.invalidateQueries({ queryKey: ['produto-ramos', productId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar segmento');
    } finally {
      setTogglingIds(prev => { const next = new Set(prev); next.delete(segmentoId); return next; });
    }
  }, [productId, queryClient, togglingIds]);

  const toggleGroup = (ramoId: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(ramoId)) next.delete(ramoId);
      else next.add(ramoId);
      return next;
    });
  };

  const clearAll = useCallback(async () => {
    const linked = segmentos.filter(s => linkedSegmentoIds.has(s.id));
    for (const s of linked) {
      await toggleSegmento(s.id, true);
    }
  }, [segmentos, linkedSegmentoIds, toggleSegmento]);

  const isLoading = [loadingRamos, loadingSegmentos, loadingLinks].some(Boolean);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );
  }

  if (ramos.length === 0) {
    return (
      <div className="text-center py-8">
        <Building2 className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Nenhum ramo de atividade disponível</p>
      </div>
    );
  }

  const linkedCount = linkedSegmentoIds.size;
  const filtered = filteredRamos(ramos, segmentosByRamo, search);
  const visibleRamos = [...filtered.ramos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  return (
    (<div className="space-y-3">
      {/* Badges dos selecionados */}
      <SelectedSegments segmentos={segmentos} ramos={ramos} linkedIds={linkedSegmentoIds} onClear={() => { void clearAll(); }} onToggle={(id, linked) => { void toggleSegmento(id, linked); }} />

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar ramo ou segmento..."
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
        <span>{ramos.length} ramos</span>
        <span>•</span>
        <span>{segmentos.length} segmentos</span>
        <span>•</span>
        <span className={cn("font-medium", linkedCount > 0 && "text-primary")}>
          {linkedCount} selecionados
        </span>
      </div>

      {/* Árvore hierárquica */}
      <RamosTree ramos={visibleRamos} segmentosByRamo={filtered.segmentosByRamo} linkedIds={linkedSegmentoIds} togglingIds={togglingIds} openGroups={openGroups} search={search} onToggleGroup={toggleGroup} onToggleSegment={(id, linked) => { void toggleSegmento(id, linked); }} />
    </div>)
  );
}
