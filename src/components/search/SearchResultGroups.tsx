import type { ReactNode } from 'react';
/**
 * Search result rendering helpers for SmartSearchInput
 */
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Package, Folder, Building2, Zap, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HighlightMatch } from './HighlightMatch';
import { motion } from 'framer-motion';
import type { SearchResult } from '@/hooks/useSearch';

const typeIcons: Record<string, ReactNode> = {
  product: <Package className="h-4 w-4 text-primary" />,
  category: <Folder className="h-4 w-4 text-warning" />,
  supplier: <Building2 className="h-4 w-4 text-primary" />,
};

const typeLabels: Record<string, string> = {
  product: 'Produto',
  category: 'Categoria',
  supplier: 'Fornecedor',
  history: 'Histórico',
};

interface ResultItemProps {
  result: SearchResult;
  index: number;
  selectedIndex: number;
  query: string;
  onSelect: (result: SearchResult) => void;
  onHover: (index: number) => void;
}

export function SearchResultItem({
  result,
  index,
  selectedIndex,
  query,
  onSelect,
  onHover,
}: ResultItemProps) {
  return (
    <motion.button
      key={result.id}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02, duration: 0.15 }}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-150',
        selectedIndex === index ? 'bg-primary/10 text-foreground shadow-sm' : 'hover:bg-muted/80',
      )}
      onClick={() => onSelect(result)}
      onMouseEnter={() => onHover(index)}
    >
      <div
        className={cn(
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors',
          selectedIndex === index ? 'bg-primary/15' : 'bg-muted',
        )}
      >
        {typeIcons[result.type] || result.icon}
      </div>
      <ResultText result={result} query={query} />
      <Badge
        variant="outline"
        className={cn(
          'shrink-0 text-[10px] transition-colors',
          selectedIndex === index && 'border-primary/30 text-primary',
        )}
      >
        {typeLabels[result.type]}
      </Badge>
      <ArrowRight
        className={cn(
          'h-3.5 w-3.5 text-muted-foreground transition-all',
          selectedIndex === index ? 'translate-x-0 opacity-100' : '-translate-x-1 opacity-0',
        )}
      />
    </motion.button>
  );
}

function ResultText({ result, query }: { result: SearchResult; query: string }) {
  return (
    <div className="min-w-0 flex-1">
      <HighlightMatch
        text={result.label}
        query={query}
        className="block truncate text-sm font-medium"
      />
      {result.sublabel && (
        <HighlightMatch
          text={result.sublabel}
          query={query}
          className="mt-0.5 block truncate text-xs text-muted-foreground"
          highlightClassName="bg-primary/10 text-primary/80 font-medium rounded-sm px-0.5"
        />
      )}
    </div>
  );
}

interface GroupedResultsProps {
  suggestions: SearchResult[];
  selectedIndex: number;
  query: string;
  onSelect: (result: SearchResult) => void;
  onHover: (index: number) => void;
}

interface ResultGroupProps extends Omit<GroupedResultsProps, 'suggestions'> {
  items: SearchResult[];
  allSuggestions: SearchResult[];
  icon: ReactNode;
  label: string;
  showHeading: boolean;
  showSeparator?: boolean;
}

function ResultGroup({
  items,
  allSuggestions,
  icon,
  label,
  showHeading,
  showSeparator,
  ...props
}: ResultGroupProps) {
  if (items.length === 0) return null;
  return (
    <div>
      {showSeparator && <Separator className="my-1.5 opacity-50" />}
      {showHeading && (
        <div className="flex items-center gap-1.5 px-3 pb-0.5 pt-1">
          {icon}
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {label} ({items.length})
          </span>
        </div>
      )}
      {items.map((result) => (
        <SearchResultItem
          key={result.id}
          result={result}
          index={allSuggestions.indexOf(result)}
          {...props}
        />
      ))}
    </div>
  );
}

export function GroupedSearchResults({
  suggestions,
  selectedIndex,
  query,
  onSelect,
  onHover,
}: GroupedResultsProps) {
  const products = suggestions.filter((s) => s.type === 'product');
  const categories = suggestions.filter((s) => s.type === 'category');
  const suppliers = suggestions.filter((s) => s.type === 'supplier');
  const resultCount = suggestions.filter((s) => s.type !== 'history').length;
  const commonProps = { allSuggestions: suggestions, selectedIndex, query, onSelect, onHover };

  return (
    <div className="space-y-1 p-2">
      <ResultsSummary count={resultCount} />

      <ResultGroup
        {...commonProps}
        items={products}
        icon={<Package className="h-3 w-3 text-primary" />}
        label="Produtos"
        showHeading={products.length > 1}
      />
      <ResultGroup
        {...commonProps}
        items={categories}
        icon={<Folder className="h-3 w-3 text-warning" />}
        label="Categorias"
        showHeading
        showSeparator={products.length > 0}
      />
      <ResultGroup
        {...commonProps}
        items={suppliers}
        icon={<Building2 className="h-3 w-3 text-primary" />}
        label="Fornecedores"
        showHeading
        showSeparator={products.length > 0 || categories.length > 0}
      />
    </div>
  );
}

function ResultsSummary({ count }: { count: number }) {
  return (
    <div className="flex items-center justify-between px-2 py-1.5">
      <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Zap className="h-3 w-3 text-primary" />
        Resultados
      </span>
      <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
        {count} {count === 1 ? 'resultado' : 'resultados'}
      </Badge>
    </div>
  );
}
