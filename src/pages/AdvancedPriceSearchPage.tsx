/**
 * Página: Busca Avançada por Preço
 * Refatorada: lógica em useAdvancedPriceSearch, views em ResultViews, tipos em types.ts
 */
// import { MainLayout } from "@/components/layout/MainLayout";
import type { ElementType, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  Filter,
  Grid3X3,
  List,
  Table2,
  Package,
  Palette,
  Layers,
  DollarSign,
  Hash,
  RotateCcw,
  TrendingDown,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PageSEO } from '@/components/seo/PageSEO';
import { useAdvancedPriceSearch } from './advanced-price-search/useAdvancedPriceSearch';
import {
  ProductCardResult,
  ProductTableResult,
  ProductListResult,
} from './advanced-price-search/ResultViews';
import { formatCurrency, QUANTITY_OPTIONS } from './advanced-price-search/types';

type SearchState = ReturnType<typeof useAdvancedPriceSearch>;

function FilterSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ElementType;
  children: ReactNode;
}) {
  const Icon = icon;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Icon className="h-4 w-4" />
        {title}
      </div>
      {children}
    </div>
  );
}

function SearchPageHeader() {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-lg bg-primary/10 p-2">
        <Search className="h-6 w-6 text-primary" />
      </div>
      <div>
        <h1
          data-testid="page-title-busca-avancada-preco"
          className="font-display text-2xl font-bold"
        >
          Busca Avançada por Preço
        </h1>
        <p className="text-sm text-muted-foreground">
          Encontre produtos que atendam ao orçamento do cliente
        </p>
      </div>
    </div>
  );
}

function BasicFilters({ state }: { state: SearchState }) {
  const { filters, categories, updateFilter } = state;
  return (
    <>
      <FilterSection title="Buscar Produto" icon={Search}>
        <Input
          aria-label="Buscar produto por nome ou SKU"
          placeholder="Nome ou SKU..."
          value={filters.searchQuery}
          onChange={(event) => updateFilter('searchQuery', event.target.value)}
        />
      </FilterSection>
      <FilterSection title="Categoria" icon={Package}>
        <Select value={filters.category} onValueChange={(value) => updateFilter('category', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Todas as categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterSection>
      <FilterSection title="Tiragem Mínima" icon={Hash}>
        <Select
          value={filters.minQuantity.toString()}
          onValueChange={(value) => updateFilter('minQuantity', Number.parseInt(value, 10))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {QUANTITY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value.toString()}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterSection>
    </>
  );
}

function ColorFilter({ state }: { state: SearchState }) {
  const { availableColors, filters, toggleColor, updateFilter } = state;
  return (
    <FilterSection title="Cores" icon={Palette}>
      <ScrollArea className="h-24">
        <div className="flex flex-wrap gap-2">
          {availableColors.slice(0, 20).map((color) => (
            <button
              key={color.hex}
              onClick={() => toggleColor(color.hex)}
              className={cn(
                'h-7 w-7 rounded-full border-2 transition-all',
                filters.colors.includes(color.hex)
                  ? 'scale-110 border-primary ring-2 ring-primary/30'
                  : 'border-border hover:scale-105',
              )}
              style={{ backgroundColor: color.hex }}
              title={color.name}
            />
          ))}
        </div>
      </ScrollArea>
      {filters.colors.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full"
          onClick={() => updateFilter('colors', [])}
        >
          Limpar cores
        </Button>
      )}
    </FilterSection>
  );
}

function TechniqueAndPriceTypeFilters({ state }: { state: SearchState }) {
  const { filters, loadingTechniques, techniques, updateFilter } = state;
  const personalized = filters.priceType === 'with_personalization';
  return (
    <>
      <FilterSection title="Técnica de Personalização" icon={Layers}>
        <Select
          value={filters.technique}
          onValueChange={(value) => updateFilter('technique', value)}
          disabled={loadingTechniques}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione a técnica" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Sem personalização</SelectItem>
            {techniques.map((technique) => (
              <SelectItem key={technique.id} value={technique.name}>
                {technique.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterSection>
      <FilterSection title="Tipo de Preço" icon={DollarSign}>
        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
          <div className="space-y-0.5">
            <Label className="text-sm">
              {personalized ? 'Com personalização' : 'Sem personalização'}
            </Label>
            <p className="text-xs text-muted-foreground">
              {personalized ? 'Produto + Gravação + Setup + Manuseio' : 'Apenas preço do produto'}
            </p>
          </div>
          <Switch
            checked={personalized}
            onCheckedChange={(checked) =>
              updateFilter(
                'priceType',
                checked ? 'with_personalization' : 'without_personalization',
              )
            }
            disabled={filters.technique === 'all'}
          />
        </div>
      </FilterSection>
    </>
  );
}

function PriceInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        aria-label={label}
        type="number"
        value={value}
        onChange={(event) => onChange(Number.parseFloat(event.target.value))}
        className="mt-1"
      />
    </div>
  );
}

function PriceRangeFilter({ state }: { state: SearchState }) {
  const { filters, updateFilter } = state;
  return (
    <FilterSection title="Faixa de Preço Unitário" icon={TrendingDown}>
      <div className="mx-auto w-full max-w-[1920px] animate-fade-in space-y-3 px-3 py-3 pb-24 sm:space-y-4 sm:px-4 sm:py-4 md:pb-6 lg:px-6 xl:px-8">
        <div className="flex gap-2">
          <PriceInput
            label="Mínimo"
            value={filters.priceRange[0]}
            onChange={(value) => updateFilter('priceRange', [value || 0, filters.priceRange[1]])}
          />
          <PriceInput
            label="Máximo"
            value={filters.priceRange[1]}
            onChange={(value) => updateFilter('priceRange', [filters.priceRange[0], value || 100])}
          />
        </div>
        <Slider
          value={filters.priceRange}
          onValueChange={(value) => updateFilter('priceRange', value as [number, number])}
          min={0}
          max={200}
          step={1}
          className="mt-2"
        />
        <div className="mt-2 flex justify-between text-sm text-muted-foreground">
          <span>{formatCurrency(filters.priceRange[0])}</span>
          <span>{formatCurrency(filters.priceRange[1])}</span>
        </div>
      </div>
    </FilterSection>
  );
}

function SearchFilters({ state }: { state: SearchState }) {
  return (
    <Card className="h-fit lg:sticky lg:top-20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Filter className="h-5 w-5" />
          Filtros de Busca
        </CardTitle>
      </CardHeader>
      <CardContent className="mx-auto w-full max-w-[1920px] animate-fade-in space-y-3 px-3 py-3 pb-24 sm:space-y-4 sm:px-4 sm:py-4 md:pb-6 lg:px-6 xl:px-8">
        <BasicFilters state={state} />
        <ColorFilter state={state} />
        <TechniqueAndPriceTypeFilters state={state} />
        <PriceRangeFilter state={state} />
        <div className="flex gap-2 border-t pt-4">
          <Button onClick={state.handleSearch} className="flex-1" disabled={state.isLoading}>
            <Search className="mr-2 h-4 w-4" />
            Buscar
          </Button>
          <Button variant="outline" onClick={state.handleReset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ResultsSummary({ state }: { state: SearchState }) {
  if (!state.isSearching)
    return (
      <p className="text-sm text-muted-foreground">Configure os filtros e clique em "Buscar"</p>
    );
  return (
    <p className="text-sm text-muted-foreground">
      <span className="font-medium text-foreground">{state.filteredProducts.length}</span> produtos
      encontrados
      {state.filters.technique !== 'all' && (
        <>
          {' '}
          com <span className="text-primary">{state.filters.technique}</span>
        </>
      )}
    </p>
  );
}

function ViewModeButtons({ state }: { state: SearchState }) {
  const options = [
    ['cards', Grid3X3],
    ['table', Table2],
    ['list', List],
  ] as const;
  return (
    <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1">
      {options.map(([mode, icon]) => {
        const Icon = icon;
        return (
          <Button
            key={mode}
            variant={state.viewMode === mode ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => state.setViewMode(mode)}
          >
            <Icon className="h-4 w-4" />
          </Button>
        );
      })}
    </div>
  );
}

function LoadingResults() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index}>
          <Skeleton className="aspect-square" />
          <CardContent className="space-y-2 p-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="mt-4 h-6 w-1/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyResults() {
  return (
    <Card className="py-12">
      <CardContent className="flex flex-col items-center justify-center text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <h3 className="mb-2 font-display text-lg font-medium">Nenhum produto encontrado</h3>
        <p className="max-w-md text-sm text-muted-foreground">
          Tente ajustar os filtros, como aumentar a faixa de preço ou reduzir a tiragem mínima.
        </p>
      </CardContent>
    </Card>
  );
}

function InitialResults() {
  return (
    <Card className="border-dashed py-12">
      <CardContent className="flex flex-col items-center justify-center text-center">
        <Sparkles className="mb-4 h-12 w-12 text-primary/50" />
        <h3 className="mb-2 font-display text-lg font-medium">Encontre o produto ideal</h3>
        <p className="max-w-md text-sm text-muted-foreground">
          Configure os filtros ao lado: selecione a tiragem, técnica de gravação e faixa de preço
          desejada.
        </p>
      </CardContent>
    </Card>
  );
}

function ProductResults({ state }: { state: SearchState }) {
  const { filteredProducts, filters, viewMode } = state;
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={viewMode}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {viewMode === 'cards' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <ProductCardResult
                key={product.id}
                product={product}
                quantity={filters.minQuantity}
              />
            ))}
          </div>
        )}
        {viewMode === 'table' && (
          <ProductTableResult products={filteredProducts} quantity={filters.minQuantity} />
        )}
        {viewMode === 'list' && (
          <ProductListResult products={filteredProducts} quantity={filters.minQuantity} />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function SearchResults({ state }: { state: SearchState }) {
  let content: ReactNode = <InitialResults />;
  if (state.isLoading) content = <LoadingResults />;
  else if (state.isSearching && state.filteredProducts.length === 0) content = <EmptyResults />;
  else if (state.isSearching) content = <ProductResults state={state} />;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <ResultsSummary state={state} />
        <ViewModeButtons state={state} />
      </div>
      {content}
    </div>
  );
}

export default function AdvancedPriceSearchPage() {
  const state = useAdvancedPriceSearch();

  return (
    <>
      <PageSEO
        title="Busca Avançada de Preços"
        description="Pesquise preços de brindes com filtros avançados."
        path="/busca-precos"
        noIndex
      />
      <div className="container space-y-6 py-6">
        <SearchPageHeader />
        <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
          <SearchFilters state={state} />
          <SearchResults state={state} />
        </div>
      </div>
    </>
  );
}
