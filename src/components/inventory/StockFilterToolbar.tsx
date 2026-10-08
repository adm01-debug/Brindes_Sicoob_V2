/**
 * StockFilterToolbar — Advanced filter bar for Stock Dashboard
 * Uses same FilterSection architecture as Super Filtro
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, X, Building2, Palette, Package, ShoppingCart, AlertTriangle, SlidersHorizontal, Sparkles, LayoutGrid, Filter, Truck, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger, PopoverClose,
} from "@/components/ui/popover";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { InlineColorGroupFilter } from "@/components/filters/InlineColorGroupFilter";
import { ExternalCategoryFilter } from "@/components/filters/ExternalCategoryFilter";
import { DebouncedPriceInput } from "@/components/filters/DebouncedPriceInput";
import { FilterSection } from "@/components/filters/filter-panel/FilterSection";
import type { StockFilters, StockAlertType } from "@/types/stock";
import { motion, AnimatePresence } from "framer-motion";

interface FilterOption {
  name: string;
  count: number;
}

interface StockFilterToolbarProps {
  filters: StockFilters;
  onUpdateFilter: <K extends keyof StockFilters>(key: K, value: StockFilters[K]) => void;
  onResetFilters: () => void;
  categories: FilterOption[];
  suppliers: FilterOption[];
  colors: string[];
  colorGroups: FilterOption[];
  totalProducts: number;
  filteredCount: number;
  alertTypes?: FilterOption[];
  onUpdateAlertFilter?: (type: StockAlertType | 'all') => void;
  currentAlertFilter?: StockAlertType | 'all';
}

type UpdateStockFilter = StockFilterToolbarProps['onUpdateFilter'];

interface SectionCounts {
  cores: number;
  categorias: number;
  estoque: number;
  fornecedores: number;
}

function getSectionCounts(filters: StockFilters): SectionCounts {
  return {
    cores: Number(Boolean(filters.colorGroup)) + Number(Boolean(filters.colorName)),
    categorias: Number(Boolean(filters.categoryId)),
    estoque: Number((filters.minQuantityNeeded ?? 0) > 0),
    fornecedores: Number(Boolean(filters.supplierId)),
  };
}

function getActiveFiltersCount(filters: StockFilters): number {
  return [
    filters.status !== 'all',
    Boolean(filters.categoryId),
    Boolean(filters.supplierId),
    Boolean(filters.colorName ?? filters.colorGroup),
    (filters.minQuantityNeeded ?? 0) > 0,
    filters.showOnlyWithAlerts,
    Boolean(filters.search),
  ].filter(Boolean).length;
}

function lastItem<T>(items: T[]): T | undefined {
  return items[items.length - 1];
}

interface FilterSectionsProps {
  filters: StockFilters;
  onUpdateFilter: UpdateStockFilter;
  suppliers: FilterOption[];
  totalProducts: number;
  alertTypes?: FilterOption[];
  onUpdateAlertFilter?: (type: StockAlertType | 'all') => void;
  currentAlertFilter?: StockAlertType | 'all';
  openSections: string[];
  toggleSection: (id: string) => void;
  sectionCounts: SectionCounts;
}

function ColorAndCategorySections({ filters, onUpdateFilter, openSections, toggleSection, sectionCounts }: Pick<FilterSectionsProps, 'filters' | 'onUpdateFilter' | 'openSections' | 'toggleSection' | 'sectionCounts'>) {
  const selectedColors = { groups: filters.colorGroup ? [filters.colorGroup] : [], variations: [], nuances: [] };
  return (
    <>
      <FilterSection id="cores" title="Cores" icon={<Palette className="h-4 w-4" />} openSections={openSections} onToggle={toggleSection} activeCount={sectionCounts.cores} activeSummary={filters.colorGroup ?? filters.colorName}>
        <InlineColorGroupFilter
          selection={selectedColors}
          onChange={(selection) => {
            onUpdateFilter('colorGroup', lastItem(selection.groups));
            onUpdateFilter('colorName', undefined);
          }}
          showNuances={false}
          showVariations={false}
          swatchSize="sm"
        />
      </FilterSection>
      <FilterSection id="categorias" title="Categorias" icon={<LayoutGrid className="h-4 w-4" />} openSections={openSections} onToggle={toggleSection} activeCount={sectionCounts.categorias} activeSummary={filters.categoryId}>
        <ExternalCategoryFilter
          selectedCategories={filters.categoryId ? [filters.categoryId] : []}
          onCategoriesChange={(categories) => onUpdateFilter('categoryId', lastItem(categories))}
          compact
        />
      </FilterSection>
    </>
  );
}

function StockAndSupplierSections({ filters, onUpdateFilter, suppliers, totalProducts, openSections, toggleSection, sectionCounts }: Pick<FilterSectionsProps, 'filters' | 'onUpdateFilter' | 'suppliers' | 'totalProducts' | 'openSections' | 'toggleSection' | 'sectionCounts'>) {
  return (
    <>
      <FilterSection id="estoque" title="Estoque" icon={<Package className="h-4 w-4" />} openSections={openSections} onToggle={toggleSection} activeCount={sectionCounts.estoque} activeSummary={filters.minQuantityNeeded ? `≥${filters.minQuantityNeeded}` : undefined}>
        <div className="px-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground text-xs whitespace-nowrap">Mínimo por cor</span>
            <DebouncedPriceInput value={filters.minQuantityNeeded ?? ''} onChange={(value) => onUpdateFilter('minQuantityNeeded', value > 0 ? value : undefined)} fallback={0} placeholder="Ex: 500" min={0} className={(filters.minQuantityNeeded ?? 0) > 0 ? 'border-orange/60' : ''} />
            <span className="text-muted-foreground text-xs">un.</span>
          </div>
        </div>
      </FilterSection>
      <FilterSection id="fornecedores" title="Fornecedores" icon={<Truck className="h-4 w-4" />} openSections={openSections} onToggle={toggleSection} activeCount={sectionCounts.fornecedores} activeSummary={filters.supplierId}>
        <Select value={filters.supplierId ?? '__all__'} onValueChange={(value) => onUpdateFilter('supplierId', value === '__all__' ? undefined : value)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos os fornecedores" /></SelectTrigger>
          <SelectContent className="max-h-48 overflow-y-auto">
            <SelectItem value="__all__" className="text-xs">Todos ({totalProducts})</SelectItem>
            {suppliers.map((supplier) => <SelectItem key={supplier.name} value={supplier.name} className="text-xs">{supplier.name} ({supplier.count})</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterSection>
    </>
  );
}

function AlertAndSortSections({ filters, onUpdateFilter, alertTypes, onUpdateAlertFilter, currentAlertFilter, openSections, toggleSection }: Pick<FilterSectionsProps, 'filters' | 'onUpdateFilter' | 'alertTypes' | 'onUpdateAlertFilter' | 'currentAlertFilter' | 'openSections' | 'toggleSection'>) {
  const showAlertTypes = (alertTypes?.length ?? 0) > 0;
  return (
    <>
      {showAlertTypes && (
        <FilterSection id="tipos_alertas" title="Tipos de Alerta" icon={<AlertTriangle className="h-4 w-4" />} openSections={openSections} onToggle={toggleSection} activeCount={currentAlertFilter && currentAlertFilter !== 'all' ? 1 : 0} activeSummary={currentAlertFilter !== 'all' ? currentAlertFilter : undefined}>
          <Select value={currentAlertFilter ?? 'all'} onValueChange={(value) => onUpdateAlertFilter?.(value as StockAlertType | 'all')}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Filtrar por tipo de alerta" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Todos os alertas</SelectItem>
              {alertTypes?.map((type) => <SelectItem key={type.name} value={type.name} className="text-xs capitalize">{type.name.replace(/_/g, ' ')} ({type.count})</SelectItem>)}
            </SelectContent>
          </Select>
        </FilterSection>
      )}
      <div className="flex items-center justify-between px-3 py-2.5 border-t border-border/40">
        <Label className="text-xs flex items-center gap-1.5 cursor-pointer"><AlertTriangle className="h-3.5 w-3.5 text-warning" />Somente com alertas</Label>
        <Switch checked={filters.showOnlyWithAlerts} onCheckedChange={(value) => onUpdateFilter('showOnlyWithAlerts', value)} />
      </div>
      <FilterSection id="ordenacao" title="Ordenar por" icon={<Filter className="h-4 w-4" />} openSections={openSections} onToggle={toggleSection}>
        <Select value={filters.sortBy} onValueChange={(value) => onUpdateFilter('sortBy', value as StockFilters['sortBy'])}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="stock_quantity">Menor Estoque</SelectItem><SelectItem value="name">Nome (A-Z)</SelectItem><SelectItem value="available_stock">Disponibilidade</SelectItem><SelectItem value="days_remaining">Dias Restantes</SelectItem>
          </SelectContent>
        </Select>
      </FilterSection>
    </>
  );
}

interface FilterUiProps extends FilterSectionsProps {
  activeFiltersCount: number;
  filteredCount: number;
  handleReset: () => void;
}

function AdvancedFiltersPopover(props: FilterUiProps) {
  const { activeFiltersCount, filteredCount, totalProducts, handleReset } = props;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="default" className={cn("gap-2 relative", activeFiltersCount > 0 && "border-primary/50 bg-primary/5")}>
          <SlidersHorizontal className="h-4 w-4" /><span className="hidden sm:inline">Filtros</span>
          {activeFiltersCount > 0 && <Badge className="bg-primary text-primary-foreground h-5 min-w-5 text-[10px] px-1.5 animate-in zoom-in-50">{activeFiltersCount}</Badge>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="max-h-[70vh] overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/40">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />Filtros Avançados
              {activeFiltersCount > 0 && <span className="text-xs text-muted-foreground font-normal">({filteredCount} de {totalProducts})</span>}
            </h4>
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="sm" onClick={handleReset} disabled={activeFiltersCount === 0} className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground px-2"><RotateCcw className="h-3 w-3" />Reset</Button>
              <PopoverClose asChild><Button variant="outline" size="sm" className="h-7 text-xs px-2.5">Fechar</Button></PopoverClose>
            </div>
          </div>
          <ColorAndCategorySections {...props} />
          <StockAndSupplierSections {...props} />
          <AlertAndSortSections {...props} />
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface FilterInputsProps {
  localSearch: string;
  setLocalSearch: (value: string) => void;
  quantityInput: string;
  setQuantityInput: (value: string) => void;
  activeFiltersCount: number;
  handleReset: () => void;
}

function FilterInputs({ localSearch, setLocalSearch, quantityInput, setQuantityInput, activeFiltersCount, handleReset }: FilterInputsProps) {
  return (
    <>
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar produto, SKU ou cor..." value={localSearch} onChange={(event) => setLocalSearch(event.target.value)} className="pl-9 pr-8" />
        {localSearch && <button onClick={() => setLocalSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
      </div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative w-full sm:w-48">
              <ShoppingCart className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="number" placeholder="Preciso de X un..." value={quantityInput} onChange={(event) => setQuantityInput(event.target.value)} className="pl-9" min={0} />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[250px]"><p className="text-xs"><strong>Filtro de tiragem:</strong> mostra apenas produtos com estoque disponível ≥ a quantidade informada. Ideal para verificar se há estoque suficiente para um pedido.</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {activeFiltersCount > 0 && <Button variant="ghost" onClick={handleReset} size="icon" className="shrink-0"><X className="h-4 w-4" /></Button>}
    </>
  );
}

interface ActiveFilterBadgesProps {
  filters: StockFilters;
  onUpdateFilter: UpdateStockFilter;
  setQuantityInput: (value: string) => void;
  activeFiltersCount: number;
  filteredCount: number;
  totalProducts: number;
}

function ActiveFilterBadges({ filters, onUpdateFilter, setQuantityInput, activeFiltersCount, filteredCount, totalProducts }: ActiveFilterBadgesProps) {
  const clearColors = () => { onUpdateFilter('colorName', undefined); onUpdateFilter('colorGroup', undefined); };
  const clearQuantity = () => { setQuantityInput(''); onUpdateFilter('minQuantityNeeded', undefined); };
  return (
    <AnimatePresence>
      {activeFiltersCount > 0 && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex flex-wrap gap-1.5 overflow-hidden">
          {filters.categoryId && <Badge variant="secondary" className="gap-1 text-xs pr-1"><LayoutGrid className="h-3 w-3" />Categoria<button onClick={() => onUpdateFilter('categoryId', undefined)} className="ml-0.5 hover:text-foreground"><X className="h-3 w-3" /></button></Badge>}
          {filters.supplierId && <Badge variant="secondary" className="gap-1 text-xs pr-1"><Building2 className="h-3 w-3" />{filters.supplierId}<button onClick={() => onUpdateFilter('supplierId', undefined)} className="ml-0.5 hover:text-foreground"><X className="h-3 w-3" /></button></Badge>}
          {(filters.colorName ?? filters.colorGroup) && <Badge variant="secondary" className="gap-1 text-xs pr-1"><Palette className="h-3 w-3" />{filters.colorName ?? filters.colorGroup}<button onClick={clearColors} className="ml-0.5 hover:text-foreground"><X className="h-3 w-3" /></button></Badge>}
          {(filters.minQuantityNeeded ?? 0) > 0 && <Badge variant="secondary" className="gap-1 text-xs pr-1"><ShoppingCart className="h-3 w-3" />≥ {filters.minQuantityNeeded} un<button onClick={clearQuantity} className="ml-0.5 hover:text-foreground"><X className="h-3 w-3" /></button></Badge>}
          {filters.showOnlyWithAlerts && <Badge variant="secondary" className="gap-1 text-xs pr-1"><AlertTriangle className="h-3 w-3" />Com alertas<button onClick={() => onUpdateFilter('showOnlyWithAlerts', false)} className="ml-0.5 hover:text-foreground"><X className="h-3 w-3" /></button></Badge>}
          <span className="text-xs text-muted-foreground flex items-center ml-1"><Sparkles className="h-3 w-3 mr-1" />{filteredCount} de {totalProducts} produtos</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function useFilterToolbarState(filters: StockFilters, onUpdateFilter: UpdateStockFilter, onResetFilters: () => void) {
  const [localSearch, setLocalSearch] = useState(filters.search);
  const [quantityInput, setQuantityInput] = useState(filters.minQuantityNeeded?.toString() || "");
  const [openSections, setOpenSections] = useState<string[]>([]);
  const toggleSection = useCallback((id: string) => setOpenSections((current) => current.includes(id) ? [] : [id]), []);
  const sectionCounts = useMemo(() => getSectionCounts(filters), [filters]);
  useEffect(() => { const timer = setTimeout(() => onUpdateFilter("search", localSearch), 300); return () => clearTimeout(timer); }, [localSearch, onUpdateFilter]);
  useEffect(() => { const timer = setTimeout(() => { const value = parseInt(quantityInput) || 0; onUpdateFilter("minQuantityNeeded", value > 0 ? value : undefined); }, 500); return () => clearTimeout(timer); }, [onUpdateFilter, quantityInput]);
  const reset = () => { setLocalSearch(""); setQuantityInput(""); onResetFilters(); };
  return { localSearch, setLocalSearch, quantityInput, setQuantityInput, openSections, toggleSection, sectionCounts, activeFiltersCount: getActiveFiltersCount(filters), reset };
}

type FilterToolbarViewProps = Pick<StockFilterToolbarProps, "filters" | "onUpdateFilter" | "suppliers" | "totalProducts" | "filteredCount" | "alertTypes" | "onUpdateAlertFilter" | "currentAlertFilter">;

function FilterToolbarView({ props, state }: { props: FilterToolbarViewProps; state: ReturnType<typeof useFilterToolbarState> }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <AdvancedFiltersPopover filters={props.filters} onUpdateFilter={props.onUpdateFilter} suppliers={props.suppliers} totalProducts={props.totalProducts} alertTypes={props.alertTypes} onUpdateAlertFilter={props.onUpdateAlertFilter} currentAlertFilter={props.currentAlertFilter} openSections={state.openSections} toggleSection={state.toggleSection} sectionCounts={state.sectionCounts} activeFiltersCount={state.activeFiltersCount} filteredCount={props.filteredCount} handleReset={state.reset} />
        <FilterInputs localSearch={state.localSearch} setLocalSearch={state.setLocalSearch} quantityInput={state.quantityInput} setQuantityInput={state.setQuantityInput} activeFiltersCount={state.activeFiltersCount} handleReset={state.reset} />
      </div>
      <ActiveFilterBadges filters={props.filters} onUpdateFilter={props.onUpdateFilter} setQuantityInput={state.setQuantityInput} activeFiltersCount={state.activeFiltersCount} filteredCount={props.filteredCount} totalProducts={props.totalProducts} />
    </div>
  );
}

export function StockFilterToolbar({ filters, onUpdateFilter, onResetFilters, suppliers, totalProducts, filteredCount, alertTypes, onUpdateAlertFilter, currentAlertFilter }: StockFilterToolbarProps) {
  const props = { filters, onUpdateFilter, suppliers, totalProducts, filteredCount, alertTypes, onUpdateAlertFilter, currentAlertFilter };
  const state = useFilterToolbarState(filters, onUpdateFilter, onResetFilters);
  return <FilterToolbarView props={props} state={state} />;
}
