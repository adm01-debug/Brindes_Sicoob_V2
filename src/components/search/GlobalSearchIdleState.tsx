/**
 * GlobalSearchIdleState — Idle state sections extracted from GlobalSearchPalette
 * (Recent, Popular, Contextual Suggestions, Quick Actions)
 */
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CommandItem } from '@/components/ui/command';
import {
  Clock,
  Flame,
  X,
  Sparkles,
  Eye,
  Zap,
  Compass,
  Trophy,
  Medal,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/* ── Shared ── */
const paletteItemStateClass =
  'border border-transparent [background-color:transparent] transition-[background-color,border-color,color] data-[selected=true]:[background-color:hsl(var(--command-accent-strong))] data-[selected=true]:[border-color:hsl(var(--command-border-strong))] data-[selected=true]:text-foreground';

function staggerStyle(index: number, baseDelay = 0): React.CSSProperties {
  return { animationDelay: `${baseDelay + index * 50}ms` };
}

/* ── Section Header ── */
function SectionHeader({
  icon,
  label,
  count,
  gradient,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  gradient?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 pb-2.5 pt-5">
      <div
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg',
          gradient || 'bg-primary/10',
        )}
      >
        <span className="text-primary [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
      </div>
      <span className="font-display text-[11px] font-bold uppercase tracking-[0.1em] [color:hsl(var(--command-text-subtle))]">
        {label}
      </span>
      {count !== undefined && count > 0 && (
        <Badge
          variant="secondary"
          className="h-4 rounded-full border-0 px-1.5 text-[9px] font-bold [background-color:hsl(var(--command-accent))] [color:hsl(var(--command-text-subtle))]"
        >
          {count}
        </Badge>
      )}
      <div className="ml-1 h-px flex-1 [background:linear-gradient(90deg,hsl(var(--command-border-strong)),hsl(var(--command-border)),transparent)]" />
    </div>
  );
}

/* ── Rank Badge ── */
function RankBadge({ index }: { index: number }) {
  if (index === 0)
    return (
      <div className="flex h-10 w-10 animate-[brain-glow_3s_ease-in-out_infinite] items-center justify-center rounded-xl bg-gradient-to-br from-orange via-orange/80 to-orange/60 shadow-lg shadow-orange/25 ring-2 ring-orange/20">
        <Trophy className="h-4.5 w-4.5 text-primary-foreground drop-shadow-sm" />
      </div>
    );
  if (index === 1)
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border shadow-[inset_0_1px_0_hsl(var(--command-border)/0.4)] [background-color:hsl(var(--command-surface-soft))] [border-color:hsl(var(--command-border-strong))]">
        <Medal className="h-4 w-4 [color:hsl(var(--command-text-muted))]" />
      </div>
    );
  if (index === 2)
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border [background-color:hsl(var(--command-surface-raised))] [border-color:hsl(var(--command-border))]">
        <span className="text-xs font-bold [color:hsl(var(--command-text-muted))]">3º</span>
      </div>
    );
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-xl border [background-color:hsl(var(--command-surface-raised))] [border-color:hsl(var(--command-border))]">
      <span className="text-xs font-bold [color:hsl(var(--command-text-subtle))]">
        {index + 1}º
      </span>
    </div>
  );
}

/* ── Quick Actions ── */
interface NavAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  shortcut?: string;
  highlight?: boolean;
}

function NavCardIcon({ action, highlighted }: { action: NavAction; highlighted: boolean }) {
  return (
    <div
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors',
        highlighted
          ? 'bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-sm shadow-primary/10'
          : '[background-color:hsl(var(--command-accent))] [color:hsl(var(--command-text-muted))]',
      )}
    >
      {action.icon}
    </div>
  );
}

function NavCardDetails({ action, highlighted }: { action: NavAction; highlighted: boolean }) {
  return (
    <>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-[13px]',
            highlighted ? 'font-semibold text-primary' : 'font-medium',
          )}
        >
          {action.title}
        </p>
        <p className="mt-0.5 truncate text-[10px] leading-tight [color:hsl(var(--command-text-subtle))]">
          {action.description}
        </p>
      </div>
      {action.shortcut ? (
        <kbd className="hidden h-5 min-w-[22px] items-center justify-center rounded-md border border-primary/20 bg-primary/10 px-1.5 font-mono text-[10px] font-semibold text-primary/60 md:inline-flex">
          {action.shortcut}
        </kbd>
      ) : null}
      <ArrowUpRight
        className={cn(
          'h-3.5 w-3.5 shrink-0',
          highlighted ? 'text-primary/40' : '[color:hsl(var(--command-text-subtle))]',
        )}
      />
    </>
  );
}

/* ── NavCard ── */
function NavCard({
  action,
  index,
  onSelect,
}: {
  action: NavAction;
  index: number;
  onSelect: (href: string) => void;
}) {
  const isHighlight = 'highlight' in action && action.highlight;
  return (
    <CommandItem
      value={action.title}
      onSelect={() => onSelect(action.href)}
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 duration-200 animate-in fade-in-0 slide-in-from-bottom-1',
        paletteItemStateClass,
        isHighlight
          ? 'from-primary/12 via-primary/6 border border-primary/20 bg-gradient-to-r to-transparent'
          : '[background-color:hsl(var(--command-surface-raised))] [border-color:hsl(var(--command-border))] hover:[background-color:hsl(var(--command-surface-soft))] hover:[border-color:hsl(var(--command-border-strong))]',
      )}
      style={staggerStyle(index, 200)}
    >
      <NavCardIcon action={action} highlighted={Boolean(isHighlight)} />
      <NavCardDetails action={action} highlighted={Boolean(isHighlight)} />
    </CommandItem>
  );
}

/* ── Main Idle State Component ── */
interface GlobalSearchIdleStateProps {
  history: string[];
  popularProducts: Array<{ id: string; name: string; sku: string; view_count: number }>;
  contextualSuggestions: Array<{ id: string; text: string; icon: string; type: string }>;
  quickSuggestions: Array<{ label: string; icon: string }>;
  routeContext: { section: string };
  quickActionsData: NavAction[];
  onSuggestionClick: (text: string) => void;
  onSelect: (href: string, addToHistory?: boolean) => void;
  onRemoveFromHistory: (e: React.MouseEvent, term: string) => void;
}

function RecentSection({
  history,
  onSuggestionClick,
  onRemoveFromHistory,
}: Pick<GlobalSearchIdleStateProps, 'history' | 'onSuggestionClick' | 'onRemoveFromHistory'>) {
  if (history.length === 0) return null;
  return (
    <div className="duration-200 animate-in fade-in-0">
      <SectionHeader
        icon={<Clock />}
        label="Recentes"
        count={history.length}
        gradient="[background-color:hsl(var(--command-accent))]"
      />
      <div className="space-y-0.5 px-2">
        {history.slice(0, 4).map((term, index) => (
          <CommandItem
            key={`h-${index}`}
            value={`history-${term}`}
            onSelect={() => onSuggestionClick(term)}
            className={cn(
              'group flex items-center gap-3.5 rounded-xl px-3 py-2.5 duration-200 animate-in fade-in-0 slide-in-from-left-2',
              paletteItemStateClass,
            )}
            style={staggerStyle(index)}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl [background-color:hsl(var(--command-accent))] group-data-[selected=true]:[background-color:hsl(var(--command-accent-strong))]">
              <Clock className="h-4 w-4 [color:hsl(var(--command-text-subtle))]" />
            </div>
            <span className="flex-1 truncate text-[13px]">{term}</span>
            <button
              onClick={(event) => onRemoveFromHistory(event, term)}
              aria-label={`Remover "${term}" do histórico`}
              className="flex h-7 w-7 items-center justify-center rounded-lg opacity-0 transition-all hover:bg-destructive/10 group-hover:opacity-100 group-data-[selected=true]:opacity-100"
            >
              <X
                className="h-3 w-3 [color:hsl(var(--command-text-subtle))] hover:text-destructive"
                aria-hidden="true"
              />
            </button>
          </CommandItem>
        ))}
      </div>
    </div>
  );
}

type PopularProduct = GlobalSearchIdleStateProps['popularProducts'][number];

function PopularProductRow({
  product,
  index,
  onSelect,
}: {
  product: PopularProduct;
  index: number;
  onSelect: GlobalSearchIdleStateProps['onSelect'];
}) {
  return (
    <CommandItem
      value={`popular-${product.name}`}
      onSelect={() => onSelect(`/produto/${product.id}`, false)}
      className={cn(
        'flex items-center gap-3.5 rounded-xl px-3 py-3 duration-200 animate-in fade-in-0 slide-in-from-bottom-1',
        paletteItemStateClass,
        index === 0 && 'border border-orange/10 bg-gradient-to-r from-orange/[0.06] to-transparent',
      )}
      style={staggerStyle(index, 100)}
    >
      <RankBadge index={index} />
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-[13px]', index === 0 ? 'font-bold' : 'font-medium')}>
          {product.name}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <span className="rounded px-1.5 py-0.5 font-mono text-[10px] [background-color:hsl(var(--command-accent))] [color:hsl(var(--command-text-subtle))]">
            {product.sku}
          </span>
          <div className="flex items-center gap-1 text-[10px] [color:hsl(var(--command-text-subtle))]">
            <Eye className="h-3 w-3" />
            <span>{product.view_count}</span>
          </div>
        </div>
      </div>
      {index === 0 ? (
        <Badge className="h-6 shrink-0 rounded-lg border-orange/20 bg-gradient-to-r from-orange/20 to-orange/10 text-[10px] font-semibold text-orange shadow-sm shadow-orange/10 hover:bg-orange/25">
          🔥 Top 1
        </Badge>
      ) : (
        <ChevronRight className="h-3.5 w-3.5 [color:hsl(var(--command-text-subtle))]" />
      )}
    </CommandItem>
  );
}

function PopularProductsSection({
  products,
  onSelect,
}: {
  products: PopularProduct[];
  onSelect: GlobalSearchIdleStateProps['onSelect'];
}) {
  if (products.length === 0) return null;
  return (
    <div className="duration-300 animate-in fade-in-0" style={{ animationDelay: '80ms' }}>
      <SectionHeader
        icon={<Flame />}
        label="Mais Populares"
        count={products.length}
        gradient="bg-gradient-to-br from-orange/15 to-orange/5"
      />
      <div className="space-y-1 px-2">
        {products.map((product, index) => (
          <PopularProductRow key={product.id} product={product} index={index} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

type ContextSuggestion = GlobalSearchIdleStateProps['contextualSuggestions'][number];

function ContextSuggestionButton({
  suggestion,
  index,
  onClick,
}: {
  suggestion: ContextSuggestion;
  index: number;
  onClick: (text: string) => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15, delay: 0.2 + index * 0.04 }}
      onClick={() => onClick(suggestion.text)}
      aria-label={`Buscar ${suggestion.text}`}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      className={cn(
        'inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold shadow-sm transition-all duration-150',
        suggestion.type === 'filter' &&
          'from-primary/8 to-primary/4 hover:to-primary/8 border border-primary/15 bg-gradient-to-r text-primary/80 hover:border-primary/30 hover:from-primary/15 hover:text-primary',
        suggestion.type === 'navigation' &&
          'border text-foreground [background-color:hsl(var(--command-surface-raised))] [border-color:hsl(var(--command-border))] hover:[background-color:hsl(var(--command-surface-soft))] hover:[border-color:hsl(var(--command-border-strong))]',
        suggestion.type === 'action' &&
          'from-orange/8 to-orange/4 hover:to-orange/8 border border-orange/15 bg-gradient-to-r text-orange/80 hover:border-orange/30 hover:from-orange/15 hover:text-orange',
        suggestion.type === 'search' &&
          'border [background-color:hsl(var(--command-surface-raised))] [border-color:hsl(var(--command-border))] [color:hsl(var(--command-text-muted))] hover:text-foreground hover:[background-color:hsl(var(--command-surface-soft))] hover:[border-color:hsl(var(--command-border-strong))]',
      )}
    >
      <span className="text-sm leading-none">{suggestion.icon}</span>
      <span>{suggestion.text}</span>
    </motion.button>
  );
}

function ContextualSection({
  suggestions,
  routeContext,
  onClick,
}: {
  suggestions: ContextSuggestion[];
  routeContext: GlobalSearchIdleStateProps['routeContext'];
  onClick: (text: string) => void;
}) {
  if (suggestions.length === 0) return null;
  const label =
    routeContext.section === 'products'
      ? 'Para o Catálogo'
      : routeContext.section === 'quotes'
        ? 'Para Orçamentos'
        : 'Sugestões';
  return (
    <div className="duration-300 animate-in fade-in-0" style={{ animationDelay: '160ms' }}>
      <SectionHeader
        icon={<Sparkles />}
        label={label}
        gradient="bg-gradient-to-br from-primary/12 to-primary/4"
      />
      <div
        className="flex flex-wrap gap-2 px-4 pb-2"
        role="group"
        aria-label="Sugestões contextuais"
      >
        {suggestions.slice(0, 6).map((suggestion, index) => (
          <ContextSuggestionButton
            key={suggestion.id}
            suggestion={suggestion}
            index={index}
            onClick={onClick}
          />
        ))}
      </div>
    </div>
  );
}

function QuickShortcuts({
  suggestions,
  onClick,
}: {
  suggestions: GlobalSearchIdleStateProps['quickSuggestions'];
  onClick: (text: string) => void;
}) {
  return (
    <div className="duration-300 animate-in fade-in-0" style={{ animationDelay: '240ms' }}>
      <SectionHeader
        icon={<Zap />}
        label="Atalhos"
        gradient="bg-gradient-to-br from-orange/12 to-orange/4"
      />
      <div className="flex flex-wrap gap-2 px-4 pb-2" role="group" aria-label="Atalhos rápidos">
        {suggestions.map((suggestion, index) => (
          <motion.button
            key={`q-${index}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15, delay: 0.28 + index * 0.03 }}
            onClick={() => onClick(suggestion.label)}
            aria-label={`Buscar ${suggestion.label}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all duration-150 [background-color:hsl(var(--command-surface-raised))] [border-color:hsl(var(--command-border))] [color:hsl(var(--command-text-muted))] hover:text-foreground hover:shadow-sm hover:[background-color:hsl(var(--command-surface-soft))] hover:[border-color:hsl(var(--command-border-strong))]"
          >
            <span className="text-sm leading-none opacity-70">{suggestion.icon}</span>
            <span>{suggestion.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function NavigationGrid({
  actions,
  onSelect,
}: {
  actions: NavAction[];
  onSelect: GlobalSearchIdleStateProps['onSelect'];
}) {
  return (
    <div className="pb-2 duration-300 animate-in fade-in-0" style={{ animationDelay: '320ms' }}>
      <SectionHeader
        icon={<Compass />}
        label="Ir Para"
        count={actions.length}
        gradient="bg-gradient-to-br from-primary/10 to-primary/4"
      />
      <div className="grid grid-cols-1 gap-1.5 px-2 sm:grid-cols-2">
        {actions.map((action, index) => (
          <NavCard
            key={action.id}
            action={action}
            index={index}
            onSelect={(href) => onSelect(href, false)}
          />
        ))}
      </div>
    </div>
  );
}

export function GlobalSearchIdleState({
  history,
  popularProducts,
  contextualSuggestions,
  quickSuggestions,
  routeContext,
  quickActionsData,
  onSuggestionClick,
  onSelect,
  onRemoveFromHistory,
}: GlobalSearchIdleStateProps) {
  return (
    <>
      <RecentSection
        history={history}
        onSuggestionClick={onSuggestionClick}
        onRemoveFromHistory={onRemoveFromHistory}
      />
      <PopularProductsSection products={popularProducts} onSelect={onSelect} />
      <ContextualSection
        suggestions={contextualSuggestions}
        routeContext={routeContext}
        onClick={onSuggestionClick}
      />
      <QuickShortcuts suggestions={quickSuggestions} onClick={onSuggestionClick} />
      <NavigationGrid actions={quickActionsData} onSelect={onSelect} />
    </>
  );
}
