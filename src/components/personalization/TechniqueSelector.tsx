import type { ExternalTechnique } from "@/types/external-db";
import { type ReactNode, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { invokeExternalDb } from "@/lib/external-db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Clock, Palette, Search, Zap, AlertTriangle, CheckCircle2, Package, Filter, X, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface Technique {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  setup_cost: number | null;
  unit_cost: number | null;
  min_quantity: number | null;
  estimated_days: number | null;
  is_active: boolean;
}

interface TechniqueSelectorProps {
  onSelect: (technique: Technique | null) => void;
  selectedId?: string;
  quantity?: number;
  maxDays?: number;
  showFilters?: boolean;
  compact?: boolean;
}

type SLAFilter = "all" | "express" | "standard" | "extended";

const SLA_OPTIONS: { value: SLAFilter; label: string; maxDays: number | null; icon: ReactNode }[] = [
  { value: "all", label: "Todos", maxDays: null, icon: <Palette className="h-3 w-3" /> },
  { value: "express", label: "Express (≤3 dias)", maxDays: 3, icon: <Zap className="h-3 w-3" /> },
  { value: "standard", label: "Normal (4-7 dias)", maxDays: 7, icon: <Clock className="h-3 w-3" /> },
  { value: "extended", label: "Estendido (8+ dias)", maxDays: null, icon: <AlertTriangle className="h-3 w-3" /> },
];

function formatCurrency(value: number | null): string {
  if (!value) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function getSLABadgeStyle(days: number | null): string {
  if (!days) return "bg-muted text-muted-foreground";
  if (days <= 3) return "bg-primary/10 text-primary border-primary/30";
  if (days <= 7) return "bg-warning/10 text-warning border-warning/30";
  return "bg-destructive/10 text-destructive border-destructive/30";
}

function useTechniques() {
  return useQuery({
    queryKey: ["techniques-selector-external"],
    queryFn: async () => {
      const result = await invokeExternalDb<Technique>({ table: "personalization_techniques", operation: "select", filters: { is_active: true }, orderBy: { column: "name", ascending: true }, limit: 100 });
      return (result.records ?? []).map(technique => ({
        ...technique,
        setup_cost: (technique as unknown as ExternalTechnique).setup_price ?? technique.setup_cost ?? null,
        unit_cost: (technique as unknown as ExternalTechnique).handling_price ?? technique.unit_cost ?? null,
      }));
    },
    staleTime: 10 * 60 * 1000,
  });
}

function matchesSearch(technique: Technique, query: string) {
  if (!query) return true;
  const search = query.toLowerCase();
  return technique.name.toLowerCase().includes(search) || Boolean(technique.code?.toLowerCase().includes(search)) || Boolean(technique.description?.toLowerCase().includes(search));
}

function matchesSla(technique: Technique, filter: SLAFilter) {
  if (filter === "all") return true;
  const days = technique.estimated_days || 999;
  if (filter === "express") return days <= 3;
  if (filter === "standard") return days >= 4 && days <= 7;
  return days >= 8;
}

interface TechniqueCriteria { query: string; sla: SLAFilter; priceRange: [number, number]; quantity: number; maxDays?: number }

function techniqueMatches(technique: Technique, criteria: TechniqueCriteria) {
  const { query, sla, priceRange, quantity, maxDays } = criteria;
  const respectsMaxDays = !maxDays || !technique.estimated_days || technique.estimated_days <= maxDays;
  const totalCost = (technique.setup_cost || 0) + (technique.unit_cost || 0) * quantity;
  const respectsPrice = totalCost >= priceRange[0] && totalCost <= priceRange[1];
  return matchesSearch(technique, query) && matchesSla(technique, sla) && respectsMaxDays && respectsPrice;
}

function useTechniqueSelectorState(quantity: number, maxDays?: number) {
  const [searchQuery, setSearchQuery] = useState("");
  const [slaFilter, setSlaFilter] = useState<SLAFilter>("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [showActiveFilters, setShowActiveFilters] = useState(false);
  const { data: techniques, isLoading } = useTechniques();
  const filteredTechniques = useMemo(() => {
    const criteria = { query: searchQuery, sla: slaFilter, priceRange, quantity, maxDays };
    return (techniques ?? []).filter(technique => techniqueMatches(technique, criteria));
  }, [techniques, searchQuery, slaFilter, priceRange, quantity, maxDays]);
  const activeFiltersCount = Number(Boolean(searchQuery)) + Number(slaFilter !== "all") + Number(priceRange[0] > 0 || priceRange[1] < 1000);
  const clearFilters = () => {
    setSearchQuery("");
    setSlaFilter("all");
    setPriceRange([0, 1000]);
  };
  return { searchQuery, setSearchQuery, slaFilter, setSlaFilter, priceRange, setPriceRange, showActiveFilters, setShowActiveFilters, filteredTechniques, activeFiltersCount, clearFilters, isLoading };
}

type SelectorState = ReturnType<typeof useTechniqueSelectorState>;

function TechniqueSkeleton() {
  return <div className="space-y-3">{[1, 2, 3].map(index => <Skeleton key={index} className="h-16 w-full" />)}</div>;
}

function SearchFilter({ state }: { state: SelectorState }) {
  return <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input placeholder="Buscar técnica..." value={state.searchQuery} onChange={event => state.setSearchQuery(event.target.value)} className="pl-9 pr-9" />
    {state.searchQuery && <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => state.setSearchQuery("")}><X className="h-4 w-4" /></Button>}
  </div>;
}

function SlaFilters({ state }: { state: SelectorState }) {
  return <div className="flex flex-wrap gap-2">{SLA_OPTIONS.map(option => <Button key={option.value} variant={state.slaFilter === option.value ? "default" : "outline"} size="sm" className="h-8" onClick={() => state.setSlaFilter(option.value)}>{option.icon}<span className="ml-1">{option.label}</span></Button>)}</div>;
}

function AdvancedFilterToggle({ state }: { state: SelectorState }) {
  return <div className="flex items-center justify-between"><Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => state.setShowActiveFilters(!state.showActiveFilters)}><Filter className="h-4 w-4 mr-1" />Super Filtro
    {state.activeFiltersCount > 0 && <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 justify-center">{state.activeFiltersCount}</Badge>}</Button>
    {state.activeFiltersCount > 0 && <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={state.clearFilters}><X className="h-4 w-4 mr-1" />Limpar Filtros</Button>}
  </div>;
}

function AdvancedFilters({ state, quantity }: { state: SelectorState; quantity: number }) {
  if (!state.showActiveFilters) return null;
  return <div className="p-4 bg-muted/50 rounded-lg space-y-4"><div><Label className="text-sm">Faixa de Preço (p/ {quantity} un.)</Label><div className="mt-2 px-2">
    <Slider value={state.priceRange} onValueChange={value => state.setPriceRange(value as [number, number])} max={1000} step={50} className="w-full" />
    <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>{formatCurrency(state.priceRange[0])}</span><span>{formatCurrency(state.priceRange[1])}</span></div>
  </div></div></div>;
}

function TechniqueFilters({ state, quantity }: { state: SelectorState; quantity: number }) {
  return <div className="space-y-3"><SearchFilter state={state} /><SlaFilters state={state} /><AdvancedFilterToggle state={state} /><AdvancedFilters state={state} quantity={quantity} /></div>;
}

function SlaIcon({ days }: { days: number }) {
  if (days <= 3) return <Zap className="h-3 w-3" />;
  if (days <= 7) return <Clock className="h-3 w-3" />;
  return <AlertTriangle className="h-3 w-3" />;
}

function TechniqueSla({ days }: { days: number | null }) {
  if (!days) return null;
  return <Tooltip><TooltipTrigger asChild><Badge variant="outline" className={cn("gap-1", getSLABadgeStyle(days))}><SlaIcon days={days} />{days}d</Badge></TooltipTrigger><TooltipContent>Prazo: {days} dias úteis</TooltipContent></Tooltip>;
}

function MinimumQuantity({ minimum, met }: { minimum: number | null; met: boolean }) {
  if (!minimum) return null;
  return <Tooltip><TooltipTrigger asChild><span className={cn("text-xs flex items-center gap-1", met ? "text-muted-foreground" : "text-destructive")}><Package className="h-3 w-3" />{minimum}+</span></TooltipTrigger><TooltipContent>Mínimo: {minimum} unidades</TooltipContent></Tooltip>;
}

function TechniqueDetails({ technique, compact }: { technique: Technique; compact: boolean }) {
  return <div><div className="flex items-center gap-2"><span className="font-medium">{technique.name}</span>{technique.code && <Badge variant="outline" className="text-[10px] font-mono">{technique.code}</Badge>}</div>
    {!compact && technique.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{technique.description}</p>}
  </div>;
}

function TechniqueCard({ technique, selected, quantity, compact }: { technique: Technique; selected: boolean; quantity: number; compact: boolean }) {
  const totalCost = (technique.setup_cost || 0) + (technique.unit_cost || 0) * quantity;
  const minQtyMet = !technique.min_quantity || quantity >= technique.min_quantity;
  return <TooltipProvider><div className={cn("relative flex items-center gap-3 rounded-lg border transition-all", selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50", !minQtyMet && "opacity-60 pointer-events-none", compact ? "p-2" : "p-3")}>
    <RadioGroupItem value={technique.id} id={technique.id} disabled={!minQtyMet} />
    <Label htmlFor={technique.id} className="flex-1 flex items-center justify-between cursor-pointer"><div className="flex items-center gap-3"><TechniqueDetails technique={technique} compact={compact} /></div>
      <div className="flex items-center gap-3"><TechniqueSla days={technique.estimated_days} /><MinimumQuantity minimum={technique.min_quantity} met={minQtyMet} />
        <div className="text-right"><div className="font-semibold text-sm">{formatCurrency(totalCost)}</div>{!compact && <div className="text-[10px] text-muted-foreground">p/ {quantity} un.</div>}</div>
      </div></Label>{selected && <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-primary" />}
  </div></TooltipProvider>;
}

function ResultsCount({ count, quantity }: { count: number; quantity: number }) {
  const suffix = count === 1 ? "" : "s";
  return <div className="flex items-center justify-between text-sm text-muted-foreground"><span>{count} técnica{suffix} encontrada{suffix}</span><span className="flex items-center gap-1"><Info className="h-3 w-3" />Qtd: {quantity} unidades</span></div>;
}

function EmptyResults({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  return <div className="text-center py-8 text-muted-foreground"><Palette className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>Nenhuma técnica encontrada</p>
    {filtered && <Button variant="link" size="sm" className="mt-2" onClick={onClear}>Limpar filtros</Button>}
  </div>;
}

export function TechniqueSelector({ onSelect, selectedId, quantity = 100, maxDays, showFilters = true, compact = false }: TechniqueSelectorProps) {
  const state = useTechniqueSelectorState(quantity, maxDays);
  if (state.isLoading) return <TechniqueSkeleton />;
  const selectTechnique = (value: string) => onSelect(state.filteredTechniques.find(technique => technique.id === value) ?? null);

  return <div className="space-y-4">
    {showFilters && <TechniqueFilters state={state} quantity={quantity} />}
    <ResultsCount count={state.filteredTechniques.length} quantity={quantity} />
    <RadioGroup value={selectedId} onValueChange={selectTechnique} className="space-y-2">{state.filteredTechniques.map(technique => <TechniqueCard key={technique.id} technique={technique} selected={selectedId === technique.id} quantity={quantity} compact={compact} />)}</RadioGroup>
    {state.filteredTechniques.length === 0 && <EmptyResults filtered={state.activeFiltersCount > 0} onClear={state.clearFilters} />}
  </div>;
}
