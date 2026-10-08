/**
 * ProductFiltersBar — Filtros avançados para listagem de produtos no Admin
 * Filtros server-side: categoria, fornecedor, status
 * Filtro client-side: faixa de preço (aplicado na página atual)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { invokeExternalDb } from '@/lib/external-db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Filter, X, ChevronDown, RotateCcw, Boxes } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export interface ProductFilters {
  category_id?: string;
  supplier_id?: string;
  is_active?: boolean | 'all';
  is_kit?: boolean;
  price_min?: number;
  price_max?: number;
}

interface CategoryOption {
  id: string;
  name: string;
}

interface SupplierOption {
  id: string;
  name: string;
  code: string;
}

interface ProductFiltersBarProps {
  filters: ProductFilters;
  onChange: (filters: ProductFilters) => void;
}

type UpdateFilters = (partial: Partial<ProductFilters>) => void;

function countActiveFilters(filters: ProductFilters): number {
  const checks = [
    Boolean(filters.category_id),
    Boolean(filters.supplier_id),
    filters.is_active !== undefined && filters.is_active !== 'all',
    Boolean(filters.is_kit),
    (filters.price_min ?? 0) > 0,
    (filters.price_max ?? 0) > 0,
  ];
  return checks.filter(Boolean).length;
}

function FilterTrigger({ activeCount, isOpen }: { activeCount: number; isOpen: boolean }) {
  return (
    <CollapsibleTrigger asChild>
      <Button variant="outline" size="sm" className={cn('gap-2 transition-colors', activeCount > 0 && 'border-primary text-primary hover:text-primary')}>
        <Filter className="h-3.5 w-3.5" /> Filtros
        {activeCount > 0 && <Badge variant="default" className="h-5 min-w-[20px] px-1.5 text-[10px]">{activeCount}</Badge>}
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isOpen && 'rotate-180')} />
      </Button>
    </CollapsibleTrigger>
  );
}

function NamedFilterBadge({ prefix, name, maxLength, onRemove }: { prefix: string; name?: string; maxLength: number; onRemove: () => void }) {
  if (!name) return null;
  const label = name.length > maxLength ? `${name.slice(0, maxLength)}…` : name;
  return <Badge variant="secondary" className="text-xs gap-1">{prefix}: {label}<X className="h-3 w-3 cursor-pointer" onClick={onRemove} /></Badge>;
}

function StatusFilterBadge({ filters, update }: { filters: ProductFilters; update: UpdateFilters }) {
  if (filters.is_active === undefined || filters.is_active === 'all') return null;
  return (
    <Badge variant="secondary" className="text-xs gap-1">
      {filters.is_active ? 'Ativos' : 'Inativos'}
      <X className="h-3 w-3 cursor-pointer" onClick={() => update({ is_active: 'all' })} />
    </Badge>
  );
}

function KitFilterBadge({ enabled, update }: { enabled: boolean | undefined; update: UpdateFilters }) {
  if (!enabled) return null;
  return <Badge variant="secondary" className="text-xs gap-1"><Boxes className="h-3 w-3" />Apenas Kits<X className="h-3 w-3 cursor-pointer" onClick={() => update({ is_kit: undefined })} /></Badge>;
}

function PriceFilterBadge({ filters, update }: { filters: ProductFilters; update: UpdateFilters }) {
  const minimum = filters.price_min ?? 0;
  const maximum = filters.price_max ?? 0;
  if (minimum <= 0 && maximum <= 0) return null;
  return (
    <Badge variant="secondary" className="text-xs gap-1">
      R$ {minimum} – {maximum > 0 ? maximum : '∞'}
      <X className="h-3 w-3 cursor-pointer" onClick={() => update({ price_min: undefined, price_max: undefined })} />
    </Badge>
  );
}

function ActiveFilterBadges({ activeCount, isOpen, categoryName, supplierName, filters, update, clearAll }: {
  activeCount: number;
  isOpen: boolean;
  categoryName?: string;
  supplierName?: string;
  filters: ProductFilters;
  update: UpdateFilters;
  clearAll: () => void;
}) {
  if (activeCount === 0 || isOpen) return null;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <NamedFilterBadge prefix="Cat" name={categoryName} maxLength={20} onRemove={() => update({ category_id: undefined })} />
      <NamedFilterBadge prefix="Forn" name={supplierName} maxLength={15} onRemove={() => update({ supplier_id: undefined })} />
      <StatusFilterBadge filters={filters} update={update} />
      <KitFilterBadge enabled={filters.is_kit} update={update} />
      <PriceFilterBadge filters={filters} update={update} />
      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground" onClick={clearAll}><RotateCcw className="h-3 w-3 mr-1" />Limpar</Button>
    </div>
  );
}

function CategoryFilter({ filters, categories, loading, search, onSearch, update }: {
  filters: ProductFilters; categories: CategoryOption[]; loading: boolean; search: string; onSearch: (value: string) => void; update: UpdateFilters;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">Categoria</label>
      <Select value={filters.category_id || '__all__'} onValueChange={(value) => update({ category_id: value === '__all__' ? undefined : value })}>
        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={loading ? 'Carregando...' : 'Todas'} /></SelectTrigger>
        <SelectContent className="max-h-64">
          <div className="p-2 pb-1"><Input placeholder="Buscar categoria..." value={search} onChange={(event) => onSearch(event.target.value)} className="h-8 text-xs" /></div>
          <SelectItem value="__all__">Todas as categorias</SelectItem>
          {categories.map(category => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function SupplierFilter({ filters, suppliers, loading, search, onSearch, update }: {
  filters: ProductFilters; suppliers: SupplierOption[]; loading: boolean; search: string; onSearch: (value: string) => void; update: UpdateFilters;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">Fornecedor</label>
      <Select value={filters.supplier_id || '__all__'} onValueChange={(value) => update({ supplier_id: value === '__all__' ? undefined : value })}>
        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={loading ? 'Carregando...' : 'Todos'} /></SelectTrigger>
        <SelectContent className="max-h-64">
          <div className="p-2 pb-1"><Input placeholder="Buscar fornecedor..." value={search} onChange={(event) => onSearch(event.target.value)} className="h-8 text-xs" /></div>
          <SelectItem value="__all__">Todos os fornecedores</SelectItem>
          {suppliers.map(supplier => <SelectItem key={supplier.id} value={supplier.id}>{supplier.name} {supplier.code ? `(${supplier.code})` : ''}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function activeFilterValue(value: ProductFilters['is_active']): string {
  if (value === undefined || value === 'all') return '__all__';
  return value ? 'active' : 'inactive';
}

function StatusFilter({ value, update }: { value: ProductFilters['is_active']; update: UpdateFilters }) {
  const change = (selected: string) => update({ is_active: selected === '__all__' ? 'all' : selected === 'active' });
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">Status</label>
      <Select value={activeFilterValue(value)} onValueChange={change}>
        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
        <SelectContent><SelectItem value="__all__">Todos</SelectItem><SelectItem value="active">Ativos</SelectItem><SelectItem value="inactive">Inativos</SelectItem></SelectContent>
      </Select>
    </div>
  );
}

function KitFilter({ checked, update }: { checked: boolean | undefined; update: UpdateFilters }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">Tipo</label>
      <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background">
        <Boxes className="h-3.5 w-3.5 text-primary" /><span className="text-sm flex-1">Apenas Kits</span>
        <Switch checked={Boolean(checked)} onCheckedChange={(value) => update({ is_kit: value || undefined })} className="scale-90" />
      </div>
    </div>
  );
}

function PriceFilter({ filters, update }: { filters: ProductFilters; update: UpdateFilters }) {
  const parsePrice = (value: string) => value ? parseFloat(value) : undefined;
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">Faixa de Preço (R$)</label>
      <div className="flex items-center gap-2">
        <Input type="number" placeholder="Mín" value={filters.price_min ?? ''} onChange={(event) => update({ price_min: parsePrice(event.target.value) })} className="h-9 text-sm" min={0} step={0.01} />
        <span className="text-xs text-muted-foreground">–</span>
        <Input type="number" placeholder="Máx" value={filters.price_max ?? ''} onChange={(event) => update({ price_max: parsePrice(event.target.value) })} className="h-9 text-sm" min={0} step={0.01} />
      </div>
    </div>
  );
}

function FiltersContent({ filters, categories, suppliers, loadingCats, loadingSups, catSearch, supSearch, setCatSearch, setSupSearch, update, activeCount, clearAll }: {
  filters: ProductFilters; categories: CategoryOption[]; suppliers: SupplierOption[]; loadingCats: boolean; loadingSups: boolean; catSearch: string; supSearch: string;
  setCatSearch: (value: string) => void; setSupSearch: (value: string) => void; update: UpdateFilters; activeCount: number; clearAll: () => void;
}) {
  return (
    <CollapsibleContent>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3 p-3 bg-muted/30 rounded-lg border border-border/50">
        <CategoryFilter filters={filters} categories={categories} loading={loadingCats} search={catSearch} onSearch={setCatSearch} update={update} />
        <SupplierFilter filters={filters} suppliers={suppliers} loading={loadingSups} search={supSearch} onSearch={setSupSearch} update={update} />
        <StatusFilter value={filters.is_active} update={update} />
        <KitFilter checked={filters.is_kit} update={update} />
        <PriceFilter filters={filters} update={update} />
        {activeCount > 0 && <div className="sm:col-span-2 lg:col-span-4 flex justify-end"><Button variant="ghost" size="sm" className="text-xs" onClick={clearAll}><RotateCcw className="h-3.5 w-3.5 mr-1" />Limpar todos os filtros</Button></div>}
      </div>
    </CollapsibleContent>
  );
}

export function ProductFiltersBar({ filters, onChange }: ProductFiltersBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);
  const [loadingSups, setLoadingSups] = useState(false);
  const [catSearch, setCatSearch] = useState('');
  const [supSearch, setSupSearch] = useState('');

  // Carregar categorias e fornecedores ao abrir
  useEffect(() => {
    if (!isOpen) return;
    if (categories.length === 0) loadCategories();
    if (suppliers.length === 0) loadSuppliers();
  }, [isOpen, categories.length, suppliers.length]);

  const loadCategories = async () => {
    setLoadingCats(true);
    try {
      const result = await invokeExternalDb<CategoryOption>({
        table: 'categories',
        operation: 'select',
        select: 'id,name',
        orderBy: { column: 'name', ascending: true },
        limit: 500,
      });
      setCategories(result.records || []);
    } catch (e) {
      console.error('Erro ao carregar categorias:', e);
    } finally {
      setLoadingCats(false);
    }
  };

  const loadSuppliers = async () => {
    setLoadingSups(true);
    try {
      const result = await invokeExternalDb<SupplierOption>({
        table: 'suppliers',
        operation: 'select',
        select: 'id,name,code',
        orderBy: { column: 'name', ascending: true },
        limit: 200,
      });
      setSuppliers(result.records || []);
    } catch (e) {
      console.error('Erro ao carregar fornecedores:', e);
    } finally {
      setLoadingSups(false);
    }
  };

  const update = useCallback((partial: Partial<ProductFilters>) => {
    onChange({ ...filters, ...partial });
  }, [filters, onChange]);

  const clearAll = useCallback(() => {
    onChange({});
    setCatSearch('');
    setSupSearch('');
  }, [onChange]);

  const activeCount = useMemo(() => countActiveFilters(filters), [filters]);

  const filteredCategories = useMemo(() => {
    if (!catSearch) return categories.slice(0, 50);
    const s = catSearch.toLowerCase();
    return categories.filter(c => c.name.toLowerCase().includes(s)).slice(0, 50);
  }, [categories, catSearch]);

  const filteredSuppliers = useMemo(() => {
    if (!supSearch) return suppliers;
    const s = supSearch.toLowerCase();
    return suppliers.filter(sp =>
      sp.name.toLowerCase().includes(s) || sp.code?.toLowerCase().includes(s)
    );
  }, [suppliers, supSearch]);

  const selectedCategoryName = (categories.find(c => c.id === filters.category_id)?.name);
  const selectedSupplierName = (suppliers.find(s => s.id === filters.supplier_id)?.name);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center gap-2">
        <FilterTrigger activeCount={activeCount} isOpen={isOpen} />
        <ActiveFilterBadges
          activeCount={activeCount}
          isOpen={isOpen}
          categoryName={selectedCategoryName}
          supplierName={selectedSupplierName}
          filters={filters}
          update={update}
          clearAll={clearAll}
        />
      </div>
      <FiltersContent
        filters={filters}
        categories={filteredCategories}
        suppliers={filteredSuppliers}
        loadingCats={loadingCats}
        loadingSups={loadingSups}
        catSearch={catSearch}
        supSearch={supSearch}
        setCatSearch={setCatSearch}
        setSupSearch={setSupSearch}
        update={update}
        activeCount={activeCount}
        clearAll={clearAll}
      />
    </Collapsible>
  );
}
