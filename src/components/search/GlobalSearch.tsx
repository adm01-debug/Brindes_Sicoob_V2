import { type ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  ArrowRight,
  Clock,
  TrendingUp,
  Package,
  FileText,
  Users,
  ShoppingCart,
  Sparkles,
  Filter,
  Keyboard,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface SearchResult {
  id: string;
  title: string;
  description?: string;
  category: 'product' | 'quote' | 'client' | 'order' | 'page' | 'action';
  url: string;
  icon?: ReactNode;
  metadata?: Record<string, string>;
  score?: number;
}

interface SearchHistory {
  query: string;
  timestamp: number;
  resultCount: number;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  placeholder?: string;
}

const TEXT_PRIMARY_CLASS = 'text-primary';
const SEARCH_HISTORY_KEY = 'search-history';

const categoryConfig = {
  product: { icon: Package, label: 'Produto', color: TEXT_PRIMARY_CLASS },
  quote: { icon: FileText, label: 'Orçamento', color: 'text-success' },
  client: { icon: Users, label: 'Cliente', color: TEXT_PRIMARY_CLASS },
  order: { icon: ShoppingCart, label: 'Pedido', color: 'text-orange' },
  page: { icon: ArrowRight, label: 'Página', color: 'text-muted-foreground' },
  action: { icon: Sparkles, label: 'Ação', color: TEXT_PRIMARY_CLASS },
};

const quickActions = [
  { id: 'new-quote', label: 'Novo Orçamento', url: '/orcamentos/novo', icon: FileText },
  { id: 'products', label: 'Catálogo de Produtos', url: '/filtros', icon: Package },
  { id: 'dashboard', label: 'Dashboard', url: '/bi', icon: TrendingUp },
];

const SEARCH_FILTERS = [
  { id: 'product', label: 'Produtos' },
  { id: 'quote', label: 'Orçamentos' },
  { id: 'client', label: 'Clientes' },
];

const MOCK_RESULTS: SearchResult[] = [
  {
    id: '1',
    title: 'Caneta Personalizada Premium',
    description: 'SKU: CAN-001 - Categoria: Escritório',
    category: 'product',
    url: '/produtos/1',
    metadata: { price: 'R$ 5,90', stock: '1.250 un' },
  },
  {
    id: '2',
    title: 'Orçamento #2024-0125',
    description: 'Cliente: Empresa ABC Ltda',
    category: 'quote',
    url: '/orcamentos/2',
    metadata: { value: 'R$ 15.000,00', status: 'Pendente' },
  },
];

function filterMockResults(query: string, filter: string | null) {
  const normalized = query.toLowerCase();
  const matches = MOCK_RESULTS.filter(
    (result) =>
      result.title.toLowerCase().includes(normalized) ||
      result.description?.toLowerCase().includes(normalized),
  );
  return filter ? matches.filter((result) => result.category === filter) : matches;
}

function loadHistory(): SearchHistory[] {
  try {
    const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
    return stored ? (JSON.parse(stored) as SearchHistory[]).slice(0, 5) : [];
  } catch {
    return [];
  }
}

function useSearchModel() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>(loadHistory);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  return {
    query,
    setQuery,
    results,
    setResults,
    isLoading,
    setIsLoading,
    selectedIndex,
    setSelectedIndex,
    searchHistory,
    setSearchHistory,
    activeFilter,
    setActiveFilter,
    inputRef,
  };
}

type SearchModel = ReturnType<typeof useSearchModel>;

function useSearchLifecycle(model: SearchModel, isOpen: boolean) {
  const { inputRef, setActiveFilter, setQuery, setResults, setSelectedIndex } = model;
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [inputRef, isOpen]);
  useEffect(() => {
    if (isOpen) return;
    setQuery('');
    setResults([]);
    setSelectedIndex(0);
    setActiveFilter(null);
  }, [isOpen, setActiveFilter, setQuery, setResults, setSelectedIndex]);
}

function useDebouncedSearch(model: SearchModel) {
  const { activeFilter, query, setIsLoading, setResults, setSelectedIndex } = model;
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const timeout = window.setTimeout(() => {
      setResults(filterMockResults(query, activeFilter));
      setIsLoading(false);
      setSelectedIndex(0);
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [activeFilter, query, setIsLoading, setResults, setSelectedIndex]);
}

function useResultSelection(
  model: SearchModel,
  navigate: ReturnType<typeof useNavigate>,
  onClose: () => void,
) {
  const { query, results, searchHistory, setSearchHistory } = model;
  return useCallback(
    (result: SearchResult) => {
      const entry = {
        query,
        timestamp: Date.now(),
        resultCount: results.length,
      };
      const history = [entry, ...searchHistory.filter((item) => item.query !== query)].slice(0, 5);
      setSearchHistory(history);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
      navigate(result.url);
      onClose();
    },
    [navigate, onClose, query, results.length, searchHistory, setSearchHistory],
  );
}

function useSearchKeyboard(
  controller: SearchModel,
  isOpen: boolean,
  actions: {
    selectResult: (result: SearchResult) => void;
    selectQuickAction: (index: number) => void;
    onClose: () => void;
  },
) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      const count = controller.query ? controller.results.length : quickActions.length;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        controller.setSelectedIndex((index) => Math.min(index + 1, count - 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        controller.setSelectedIndex((index) => Math.max(index - 1, 0));
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const result = controller.results[controller.selectedIndex];
        if (controller.query && result) actions.selectResult(result);
        else if (!controller.query) actions.selectQuickAction(controller.selectedIndex);
      } else if (event.key === 'Escape') actions.onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [actions, controller, isOpen]);
}

function useSearchController(isOpen: boolean, onClose: () => void) {
  const model = useSearchModel();
  const navigate = useNavigate();
  useSearchLifecycle(model, isOpen);
  useDebouncedSearch(model);
  const selectResult = useResultSelection(model, navigate, onClose);
  const selectQuickAction = useCallback(
    (index: number) => {
      const action = quickActions[index];
      if (!action) return;
      navigate(action.url);
      onClose();
    },
    [navigate, onClose],
  );
  useSearchKeyboard(model, isOpen, { selectResult, selectQuickAction, onClose });
  const clearHistory = () => {
    model.setSearchHistory([]);
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  };
  return { ...model, selectResult, selectQuickAction, clearHistory };
}

type SearchController = ReturnType<typeof useSearchController>;

function SearchField({
  controller,
  placeholder,
}: {
  controller: SearchController;
  placeholder: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-3">
      <Search className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
      <input
        ref={controller.inputRef}
        type="text"
        value={controller.query}
        onChange={(event) => controller.setQuery(event.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
      />
      {controller.query ? (
        <button
          aria-label="Limpar busca"
          onClick={() => controller.setQuery('')}
          className="rounded-full p-1 transition-colors hover:bg-muted"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      ) : null}
      <kbd className="hidden items-center gap-1 rounded bg-muted px-2 py-1 text-xs font-medium text-muted-foreground sm:flex">
        ESC
      </kbd>
    </div>
  );
}

function SearchFilters({ controller }: { controller: SearchController }) {
  return (
    <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto border-b border-border px-4 py-2">
      <Filter className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      {SEARCH_FILTERS.map((filter) => (
        <button
          key={filter.id}
          onClick={() =>
            controller.setActiveFilter(controller.activeFilter === filter.id ? null : filter.id)
          }
          className={cn(
            'whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors',
            controller.activeFilter === filter.id
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80',
          )}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}

function SearchResultRow({
  result,
  selected,
  onSelect,
}: {
  result: SearchResult;
  selected: boolean;
  onSelect: () => void;
}) {
  const config = categoryConfig[result.category];
  const CategoryIcon = config.icon;
  return (
    <button
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
        selected ? 'bg-muted' : 'hover:bg-muted/50',
      )}
    >
      <div className={cn('rounded-lg bg-muted p-2', config.color)}>
        <CategoryIcon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-foreground">{result.title}</span>
          <Badge variant="outline" className="text-[10px]">
            {config.label}
          </Badge>
        </div>
        {result.description ? (
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{result.description}</p>
        ) : null}
        {result.metadata ? (
          <div className="mt-1 flex items-center gap-3">
            {Object.entries(result.metadata).map(([key, value]) => (
              <span key={key} className="text-xs text-muted-foreground">
                {value}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-muted-foreground" />
    </button>
  );
}

function SearchResults({ controller }: { controller: SearchController }) {
  if (controller.results.length === 0) {
    return (
      <div className="py-12 text-center">
        <Search className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
        <p className="text-muted-foreground">Nenhum resultado para "{controller.query}"</p>
      </div>
    );
  }
  return (
    <div className="py-2">
      {controller.results.map((result, index) => (
        <SearchResultRow
          key={result.id}
          result={result}
          selected={index === controller.selectedIndex}
          onSelect={() => controller.selectResult(result)}
        />
      ))}
    </div>
  );
}

function HistorySection({ controller }: { controller: SearchController }) {
  if (controller.searchHistory.length === 0) return null;
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between px-4">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Buscas recentes
        </span>
        <button onClick={controller.clearHistory} className="text-xs text-primary hover:underline">
          Limpar
        </button>
      </div>
      {controller.searchHistory.map((item) => (
        <button
          key={item.query}
          onClick={() => controller.setQuery(item.query)}
          className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-muted"
        >
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-foreground">{item.query}</span>
          <span className="ml-auto text-xs text-muted-foreground">
            {item.resultCount} resultados
          </span>
        </button>
      ))}
    </div>
  );
}

function QuickActions({ controller }: { controller: SearchController }) {
  return (
    <div>
      <div className="mb-2 px-4">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Ações rápidas
        </span>
      </div>
      {quickActions.map((action, index) => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            onClick={() => controller.selectQuickAction(index)}
            className={cn(
              'flex w-full items-center gap-3 px-4 py-2 text-left transition-colors',
              index === controller.selectedIndex ? 'bg-muted' : 'hover:bg-muted/50',
            )}
          >
            <div className="rounded-lg bg-primary/10 p-2">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">{action.label}</span>
            <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
          </button>
        );
      })}
    </div>
  );
}

function SearchContent({ controller }: { controller: SearchController }) {
  if (controller.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (controller.query) return <SearchResults controller={controller} />;
  return (
    <div className="py-4">
      <HistorySection controller={controller} />
      <QuickActions controller={controller} />
    </div>
  );
}

function SearchFooter() {
  return (
    <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Keyboard className="h-3 w-3" />
          <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px]">↑↓</kbd>navegar
        </span>
        <span className="flex items-center gap-1">
          <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px]">↵</kbd>selecionar
        </span>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Sparkles className="h-3 w-3 text-primary" />
        Busca inteligente
      </div>
    </div>
  );
}

function SearchDialog({
  controller,
  placeholder,
}: {
  controller: SearchController;
  placeholder: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -20 }}
      transition={{ duration: 0.15 }}
      className="fixed left-1/2 top-[10%] z-50 w-full max-w-2xl -translate-x-1/2 px-4"
    >
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <SearchField controller={controller} placeholder={placeholder} />
        <SearchFilters controller={controller} />
        <div className="max-h-[60vh] overflow-y-auto">
          <SearchContent controller={controller} />
        </div>
        <SearchFooter />
      </div>
    </motion.div>
  );
}

export function GlobalSearch({
  isOpen,
  onClose,
  placeholder = 'Buscar produtos, orçamentos, clientes...',
}: GlobalSearchProps) {
  const controller = useSearchController(isOpen, onClose);
  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          <SearchDialog controller={controller} placeholder={placeholder} />
        </>
      ) : null}
    </AnimatePresence>
  );
}
// Hook to manage global search state
export function useGlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
  };
}
