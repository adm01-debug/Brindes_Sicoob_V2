import { Suspense } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Brain,
  ChevronRight,
  FileText,
  Loader2,
  Mic,
  Package,
  Search,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { EmptySearchState } from './EmptySearchState';
import { paletteItemStateClass, staggerStyle, type QuickAction } from './GlobalSearchHelpers';
import { GlobalSearchIdleState } from './GlobalSearchIdleState';
import { HighlightMatch } from './HighlightMatch';
import { typeConfig } from './search-types';
import type { SearchResult, useGlobalSearch } from './useGlobalSearch';

const LazyVoiceOverlay = lazyWithRetry(() => import('./VoiceSearchOverlayConnected'));

type GlobalSearchState = ReturnType<typeof useGlobalSearch>;
type ResultConfig = (typeof typeConfig)[keyof typeof typeConfig];

const quickActions: QuickAction[] = [
  {
    id: 'new-quote',
    title: 'Novo Orçamento',
    description: 'Criar um novo orçamento',
    icon: <FileText className="h-4 w-4" />,
    href: '/orcamentos/novo',
    shortcut: 'N',
    highlight: true,
  },
  {
    id: 'products',
    title: 'Catálogo de Produtos',
    description: 'Ver todos os produtos',
    icon: <Package className="h-4 w-4" />,
    href: '/',
  },
  {
    id: 'quotes',
    title: 'Orçamentos',
    description: 'Ver todos os orçamentos',
    icon: <FileText className="h-4 w-4" />,
    href: '/orcamentos',
  },
];

function SearchTrigger({ search }: { search: GlobalSearchState }) {
  return (
    <div className="flex w-full items-center gap-2 md:w-auto">
      <button
        onClick={() => search.setOpen(true)}
        data-testid="global-search-trigger"
        className="group relative flex flex-1 items-center gap-2.5 overflow-hidden rounded-xl border px-3.5 py-2 text-sm transition-all duration-300 [background-color:hsl(var(--command-surface-raised))] [border-color:hsl(var(--command-border))] hover:[background-color:hsl(var(--command-surface-soft))] hover:[border-color:hsl(var(--command-border-strong))] md:w-64"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/[0.03] to-primary/0 transition-all duration-500 group-hover:via-primary/[0.06]" />
        <div className="bg-primary/8 group-hover:bg-primary/12 relative flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-colors duration-300">
          <Brain className="h-3.5 w-3.5 text-primary/60 transition-colors duration-300 group-hover:text-primary" />
          <div className="pointer-events-none absolute inset-0 animate-[brain-glow_3s_ease-in-out_infinite] rounded-lg bg-primary/10" />
        </div>
        <span className="relative flex-1 text-left text-[13px] transition-colors duration-300 [color:hsl(var(--command-text-muted))] group-hover:text-foreground">
          Busca inteligente...
        </span>
        <kbd className="hidden shrink-0 items-center gap-0.5 rounded-md border border-border/50 bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/60 transition-colors group-hover:border-primary/20 group-hover:text-primary/50 sm:inline-flex">
          ⌘K
        </kbd>
      </button>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            data-testid="global-search-voice-trigger"
            variant="outline"
            size="icon"
            onClick={search.handleOpenVoiceOverlay}
            className="h-10 w-10 shrink-0 rounded-xl border-border/50 transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
            aria-label="Microfone"
          >
            <Mic className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="border-border bg-card text-xs">
          Assistente de voz IA <kbd className="ml-1 text-[9px] opacity-60">Ctrl+Shift+V</kbd>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function VoiceOverlay({ search }: { search: GlobalSearchState }) {
  if (!search.voiceOverlayOpen) return null;
  return (
    <Suspense fallback={<div data-route-pending="lazy" aria-label="Carregando assistente de voz" />}>
      <LazyVoiceOverlay
        isOpen={search.voiceOverlayOpen}
        onClose={search.handleCloseVoiceOverlay}
        onAction={search.handleVoiceAction}
      />
    </Suspense>
  );
}

function AiProcessingBanner({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="from-primary/12 via-primary/6 to-primary/3 mx-2 mt-3 flex items-center gap-3 rounded-2xl border border-primary/15 bg-gradient-to-r px-4 py-3.5 shadow-sm shadow-primary/5 duration-300 animate-in fade-in-0 slide-in-from-top-2">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 to-primary/5 shadow-inner">
        <Sparkles className="h-4.5 w-4.5 animate-pulse text-primary" />
      </div>
      <div className="flex-1">
        <p className="font-display text-sm font-semibold text-primary">Analisando sua busca...</p>
        <p className="mt-0.5 text-[11px] text-primary/50">IA identificando intenção e filtros</p>
      </div>
      <Loader2 className="h-4 w-4 animate-spin text-primary/40" />
    </div>
  );
}

function IntentFilterBadge({ value, prefix }: { value?: string; prefix?: string }) {
  if (!value) return null;
  return (
    <Badge
      variant="secondary"
      className="h-5.5 rounded-lg text-[11px] [background-color:hsl(var(--command-accent))] [color:hsl(var(--command-text-muted))]"
    >
      {prefix}
      {value}
    </Badge>
  );
}

function IntentBanner({ search }: { search: GlobalSearchState }) {
  const intent = search.searchIntent;
  if (!intent || search.isSearching || search.results.length === 0) return null;
  const intentConfig = intent.type === 'mixed' ? undefined : typeConfig[intent.type];
  const priceLabels = { low: 'Preço baixo', medium: 'Preço médio', high: 'Premium' };
  return (
    <div className="mx-2 mt-3 flex flex-wrap items-center gap-2 rounded-xl border px-4 py-3 duration-200 animate-in fade-in-0 slide-in-from-top-1 [background:linear-gradient(90deg,hsl(var(--command-surface-raised)),hsl(var(--command-surface)))] [border-color:hsl(var(--command-border))]">
      <div className="bg-primary/12 flex h-6 w-6 items-center justify-center rounded-lg">
        <Brain className="h-3.5 w-3.5 text-primary" />
      </div>
      <span className="text-[11px] font-semibold [color:hsl(var(--command-text-muted))]">
        Entendi:
      </span>
      {intentConfig && (
        <Badge
          variant="outline"
          className="h-5.5 rounded-lg text-[11px] font-semibold [background-color:hsl(var(--command-accent))] [border-color:hsl(var(--command-border-strong))]"
        >
          {intentConfig.label}s
        </Badge>
      )}
      <IntentFilterBadge value={intent.filters.category} />
      <IntentFilterBadge value={intent.filters.color} prefix="Cor: " />
      {intent.filters.priceRange && (
        <IntentFilterBadge value={priceLabels[intent.filters.priceRange]} />
      )}
      <IntentFilterBadge value={intent.filters.status} prefix="Status: " />
      <IntentFilterBadge value={intent.filters.clientName} prefix="Cliente: " />
    </div>
  );
}

function SearchLoading({ search }: { search: GlobalSearchState }) {
  if (!search.isSearching || search.isAIProcessing) return null;
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 duration-300 animate-in fade-in-0">
      <div className="relative">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 shadow-lg shadow-primary/10">
          <Loader2 className="h-6 w-6 animate-spin text-primary/70" />
        </div>
        <div className="absolute inset-0 animate-ping rounded-2xl bg-primary/10 opacity-30" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground/70">Buscando resultados...</p>
        <p className="mt-1 text-[11px] text-muted-foreground/40">Analisando catálogo com IA</p>
      </div>
    </div>
  );
}

function EmptyAndShortQuery({ search }: { search: GlobalSearchState }) {
  const queryLength = search.query.length;
  const showEmpty = !search.isSearching && queryLength >= 2 && search.results.length === 0;
  const showHint = !search.isSearching && queryLength >= 1 && queryLength < 3;
  return (
    <>
      {showEmpty && (
        <EmptySearchState
          query={search.query}
          onAction={search.handleSelect}
          onRefine={() => search.setQuery('')}
          onPickRecent={search.setQuery}
        />
      )}
      {showHint && (
        <div className="flex items-center justify-center gap-2.5 px-4 py-8 duration-200 animate-in fade-in-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg [background-color:hsl(var(--command-accent))]">
            <Search className="h-3.5 w-3.5 [color:hsl(var(--command-text-subtle))]" />
          </div>
          <span className="text-xs [color:hsl(var(--command-text-subtle))]">
            Continue digitando para buscar...
          </span>
        </div>
      )}
    </>
  );
}

function SearchResultItem({
  result,
  index,
  query,
  config,
  onSelect,
}: {
  result: SearchResult;
  index: number;
  query: string;
  config: ResultConfig;
  onSelect: (href: string) => void;
}) {
  const Icon = config.icon;
  return (
    <CommandItem
      value={result.title}
      onSelect={() => onSelect(result.href)}
      className={cn(
        'mx-2 flex items-center gap-3.5 rounded-xl px-3 py-3 duration-200 animate-in fade-in-0 slide-in-from-bottom-1',
        paletteItemStateClass,
      )}
      style={staggerStyle(index, 50)}
    >
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm',
          `${config.color}/10`,
        )}
      >
        <Icon className={cn('h-4.5 w-4.5', config.color.replace('bg-', 'text-'))} />
      </div>
      <SearchResultText result={result} query={query} />
      <Badge
        variant="outline"
        className="h-5 shrink-0 rounded-lg text-[10px] font-medium [background-color:hsl(var(--command-accent))] [border-color:hsl(var(--command-border-strong))]"
      >
        {config.label}
      </Badge>
      <ChevronRight className="h-3.5 w-3.5 [color:hsl(var(--command-text-subtle))]" />
    </CommandItem>
  );
}

function SearchResultText({ result, query }: { result: SearchResult; query: string }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="truncate text-[13px] font-medium">
        <HighlightMatch text={result.title} query={query} />
      </p>
      {result.subtitle && (
        <p className="mt-0.5 truncate text-[11px] [color:hsl(var(--command-text-muted))]">
          <HighlightMatch
            text={result.subtitle}
            query={query}
            highlightClassName="bg-primary/15 text-primary font-semibold rounded-sm px-0.5"
          />
        </p>
      )}
    </div>
  );
}

function SearchResults({ search }: { search: GlobalSearchState }) {
  if (search.isSearching) return null;
  return (
    <>
      {Object.entries(search.groupedResults).map(([type, items]) => {
        const config = typeConfig[type];
        if (!config) return null;
        return (
          <CommandGroup
            key={type}
            heading={`${config.label}s`}
            className="duration-300 animate-in fade-in-0 slide-in-from-bottom-2 [&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:pb-2 [&_[cmdk-group-heading]]:pt-4"
          >
            {items.map((result, index) => (
              <SearchResultItem
                key={result.id}
                result={result}
                index={index}
                query={search.query}
                config={config}
                onSelect={search.handleSelect}
              />
            ))}
          </CommandGroup>
        );
      })}
    </>
  );
}

function TypingSuggestions({ search }: { search: GlobalSearchState }) {
  const visible =
    search.typingSuggestions.length > 0 &&
    search.query.length >= 2 &&
    search.query.length < 5 &&
    !search.isSearching;
  if (!visible) return null;
  return (
    <CommandGroup heading="Sugestões" className="duration-200 animate-in fade-in-0">
      {search.typingSuggestions.map((suggestion, index) => (
        <CommandItem
          key={suggestion}
          value={`suggestion-${suggestion}`}
          onSelect={() => search.handleSuggestionClick(suggestion)}
          className={cn(
            'mx-2 flex items-center gap-3.5 rounded-xl px-3 py-3 duration-200 animate-in fade-in-0 slide-in-from-bottom-1',
            paletteItemStateClass,
          )}
          style={staggerStyle(index)}
        >
          <div className="from-primary/12 to-primary/4 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br">
            <Sparkles className="h-4 w-4 text-primary/70" />
          </div>
          <span className="flex-1 text-[13px] font-medium">{suggestion}</span>
          <ChevronRight className="h-3.5 w-3.5 [color:hsl(var(--command-text-subtle))]" />
        </CommandItem>
      ))}
    </CommandGroup>
  );
}

function IdleState({ search }: { search: GlobalSearchState }) {
  if (search.query.length >= 2 || search.isSearching) return null;
  return (
    <GlobalSearchIdleState
      history={search.history}
      popularProducts={search.popularProducts}
      contextualSuggestions={search.contextualSuggestions}
      quickSuggestions={search.quickSuggestions}
      routeContext={search.routeContext}
      quickActionsData={quickActions}
      onSuggestionClick={search.handleSuggestionClick}
      onSelect={search.handleSelect}
      onRemoveFromHistory={(_event, term) => search.handleRemoveFromHistory(term)}
    />
  );
}

function SearchFooter() {
  return (
    <div data-testid="global-search-footer" className="flex select-none items-center justify-between border-t px-5 py-2.5 [background:linear-gradient(90deg,hsl(var(--command-surface-raised)),hsl(var(--command-surface)),hsl(var(--command-surface-raised)))] [border-color:hsl(var(--command-border))]">
      <div className="flex items-center gap-4 text-[11px] [color:hsl(var(--command-text-subtle))]">
        <span className="inline-flex items-center gap-1.5">
          <kbd className="inline-flex h-[18px] min-w-[20px] items-center justify-center rounded-md border px-1 font-mono text-[10px] leading-none [background-color:hsl(var(--command-accent))] [border-color:hsl(var(--command-border))]">
            ↵
          </kbd>
          <span>Selecionar</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <kbd className="inline-flex h-[18px] min-w-[20px] items-center justify-center rounded-md border px-1 font-mono text-[10px] leading-none [background-color:hsl(var(--command-accent))] [border-color:hsl(var(--command-border))]">
            ↑↓
          </kbd>
          <span>Navegar</span>
        </span>
        <span className="hidden items-center gap-1.5 md:inline-flex">
          <kbd className="inline-flex h-[18px] min-w-[20px] items-center justify-center rounded-md border px-1 font-mono text-[10px] leading-none [background-color:hsl(var(--command-accent))] [border-color:hsl(var(--command-border))]">
            1-9
          </kbd>
          <span>Saltar</span>
        </span>
        <span className="hidden items-center gap-1.5 md:inline-flex">
          <kbd className="inline-flex h-[18px] items-center justify-center rounded-md border px-1 font-mono text-[10px] leading-none [background-color:hsl(var(--command-accent))] [border-color:hsl(var(--command-border))]">
            ⌘↵
          </kbd>
          <span>Nova aba</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <kbd className="inline-flex h-[18px] min-w-[20px] items-center justify-center rounded-md border px-1 font-mono text-[10px] leading-none [background-color:hsl(var(--command-accent))] [border-color:hsl(var(--command-border))]">
            ESC
          </kbd>
          <span>Fechar</span>
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] font-medium text-primary/40">
        <div className="bg-primary/8 flex h-4 w-4 items-center justify-center rounded-md">
          <Brain className="h-2.5 w-2.5" />
        </div>
        <span>Busca com IA</span>
      </div>
    </div>
  );
}

function SearchDialog({ search }: { search: GlobalSearchState }) {
  return (
    <CommandDialog open={search.open} onOpenChange={search.setOpen}>
      <div className="relative">
        <CommandInput
          placeholder="Buscar produtos, orçamentos, clientes..."
          value={search.query}
          onValueChange={search.setQuery}
          data-testid="global-search-input"
        />
        <div className="absolute bottom-0 left-6 right-6 h-[2px] rounded-full bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </div>
      <CommandList data-testid="global-search-results" className="scrollbar-thin max-h-[520px] px-1 [background-color:hsl(var(--command-surface))]">
        <AiProcessingBanner visible={search.isAIProcessing} />
        <IntentBanner search={search} />
        <SearchLoading search={search} />
        <EmptyAndShortQuery search={search} />
        <SearchResults search={search} />
        <TypingSuggestions search={search} />
        <IdleState search={search} />
      </CommandList>
      <SearchFooter />
    </CommandDialog>
  );
}

export function GlobalSearchPaletteView({ search }: { search: GlobalSearchState }) {
  return (
    <>
      <SearchTrigger search={search} />
      <VoiceOverlay search={search} />
      <SearchDialog search={search} />
    </>
  );
}
