import { isNullish } from "@/components/admin/utils/nullish";
import { forwardRef, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, Loader2, History, Bot, Info, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LatencyBadge } from "./LatencyBadge";
import { ConnectionTimelineDrawer } from "./ConnectionTimelineDrawer";
import { ConnectionTestDetailsDialog } from "./ConnectionTestDetailsDialog";
import { useConnectionTestHistory, type TestHistoryItem } from "@/hooks/useConnectionTestHistory";
import type { ConnectionType } from "@/hooks/useConnectionTester";
import { getErrorCopy, getKindBadgeClass, getKindLabel } from "@/lib/connection-error-copy";
import { inferErrorKind } from "@/lib/error-kind-inference";

interface Props {
  type: ConnectionType;
  envKey?: "promobrind" | "crm";
  connectionId?: string;
  /** Bump after a "Testar conexão" succeeds to refetch. */
  refreshKey?: number | string;
  /** Label used inside the timeline drawer ("Ver tudo →") and detail dialog. */
  label: string;
  className?: string;
  /** Show the 5 latest tests inline by default (default: true). */
  defaultPreview?: boolean;
  /** When set, renders a non-clickable placeholder row at the top of the list
   *  ("Teste em andamento…") so the user sees the test was queued before the
   *  real history row arrives via refreshKey. Cleared by the parent on result. */
  pendingTest?: { startedAt: string } | null;
}

const PREVIEW_SIZE_OPTIONS = [5, 10, 20] as const;
type PreviewSize = typeof PREVIEW_SIZE_OPTIONS[number];
const PREVIEW_SIZE_STORAGE_KEY = "connections.history_preview_size";
const DEFAULT_PREVIEW_SIZE: PreviewSize = 5;
const DESTRUCTIVE_TEXT = "text-destructive";

function loadPreviewSize(): PreviewSize {
  if (typeof window === "undefined") return DEFAULT_PREVIEW_SIZE;
  try {
    const raw = window.localStorage.getItem(PREVIEW_SIZE_STORAGE_KEY);
    const parsed = parseInt(raw ?? "", 10);
    if (PREVIEW_SIZE_OPTIONS.includes(parsed as PreviewSize)) return parsed as PreviewSize;
  } catch { /* ignore */ }
  return DEFAULT_PREVIEW_SIZE;
}

function formatRelative(iso: string): string {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "";
  const diff = Date.now() - ts;
  if (diff < 5_000) return "agora há pouco";
  if (diff < 60_000) return `há ${Math.round(diff / 1000)}s`;
  if (diff < 3_600_000) return `há ${Math.round(diff / 60_000)}min`;
  if (diff < 86_400_000) return `há ${Math.round(diff / 3_600_000)}h`;
  return `há ${Math.round(diff / 86_400_000)}d`;
}

function formatAbsolute(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch {
    return iso;
  }
}

type StatusFilter = "all" | "ok" | "fail";
type SourceFilter = "all" | "manual" | "cron";

function emptyMessage(status: StatusFilter, source: SourceFilter): string {
  if (source === "cron" && status === "fail") return "Nenhuma falha do cron neste período 🎉";
  if (source === "cron") return "Nenhum teste automático neste período.";
  if (source === "manual") return "Nenhum teste manual neste período.";
  if (status === "fail") return "Nenhuma falha nos últimos testes 🎉";
  return "Nenhum teste com este filtro.";
}

interface SourceFilterChipsProps {
  value: SourceFilter;
  onChange: (v: SourceFilter) => void;
  allCount: number;
  manualCount: number;
  cronOk: number;
  cronFail: number;
  cronTotal: number;
}

function SourceFilterChips({ value, onChange, allCount, manualCount, cronOk, cronFail, cronTotal }: SourceFilterChipsProps) {
  const options: Array<{ key: SourceFilter; label: string; count: number }> = [
    { key: "all", label: "Todas as origens", count: allCount },
    { key: "manual", label: "Manuais", count: manualCount },
    { key: "cron", label: "Cron", count: cronTotal },
  ];
  return (
    <div className="flex items-center gap-1 flex-wrap px-1" role="group" aria-label="Filtrar por origem do teste">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">Origem:</span>
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(opt.key); }}
            className={cn(
              "text-[11px] px-2 py-0.5 rounded-full border transition-colors tabular-nums inline-flex items-center gap-1.5",
              active
                ? "bg-primary/10 border-primary/40 text-primary"
                : "border-transparent text-muted-foreground hover:bg-muted/60",
            )}
            aria-pressed={active}
          >
            {opt.key === "cron" && <Bot className="h-3 w-3" aria-hidden />}
            <span>{opt.label} ({opt.count})</span>
            {opt.key === "cron" && cronTotal > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px]">
                <span className="text-green-700 dark:text-green-400 tabular-nums">✓{cronOk}</span>
                <span className="text-destructive tabular-nums">✗{cronFail}</span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function sparklineData(items: TestHistoryItem[], width: number, height: number) {
  // Ordena cronologicamente asc (mais antigo à esquerda) e pega até 12 pontos
  const sorted = [...items]
    .filter((i) => !isNullish(i.latency_ms))
    .sort((a, b) => new Date(a.tested_at).getTime() - new Date(b.tested_at).getTime())
    .slice(-12);
  if (sorted.length < 2) return null;

  const values = sorted.map((i) => i.latency_ms as number);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const stepX = width / (sorted.length - 1);
  const pad = 2;
  const innerH = height - pad * 2;

  const points = sorted.map((it, idx) => {
    const x = idx * stepX;
    const y = pad + innerH - ((it.latency_ms as number) - min) / range * innerH;
    return { x, y, ok: it.ok };
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  return { allOk: points.every((point) => point.ok), last: points[points.length - 1], max, min, path, points, sorted };
}

const SparklineSvg = forwardRef<SVGSVGElement, { data: NonNullable<ReturnType<typeof sparklineData>>; width: number; height: number }>(function SparklineSvg({ data, width, height }, ref) {
  const { allOk, last, max, min, path, points } = data;
  return (
    <svg ref={ref} width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0 overflow-visible" aria-label={`Sparkline de latência: ${min}–${max}ms`} role="img">
      <path d={path} fill="none" strokeWidth={1.25} className={cn(allOk ? "stroke-green-500/80 dark:stroke-green-400/80" : "stroke-destructive/80")} />
      {points.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r={index === points.length - 1 ? 1.6 : 0.9} className={cn(point.ok ? "fill-green-600 dark:fill-green-400" : "fill-destructive")} />)}
      {last && <circle cx={last.x} cy={last.y} r={2.4} className="fill-transparent stroke-foreground/40" strokeWidth={0.6} />}
    </svg>
  );
});

/** Mini sparkline SVG (sem libs) das latências (oldest → newest, esquerda → direita). */
function LatencySparkline({ items, width = 64, height = 18 }: { items: TestHistoryItem[]; width?: number; height?: number }) {
  const data = sparklineData(items, width, height);
  if (!data) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <SparklineSvg data={data} width={width} height={height} />
      </TooltipTrigger>
      <TooltipContent side="top">
        Latência (últimos {data.sorted.length}): min {data.min}ms · máx {data.max}ms
      </TooltipContent>
    </Tooltip>
  );
}

interface RowProps {
  item: TestHistoryItem;
  onClick: () => void;
  highlighted?: boolean;
  rowRef?: (el: HTMLDivElement | null) => void;
}

function historyTail(item: TestHistoryItem): string {
  if (!item.ok) return item.message || "Falha";
  const message = item.message ? ` — ${item.message}` : "";
  return `HTTP ${item.status ?? "?"}${message}`;
}

function historyKindCopy(item: TestHistoryItem) {
  if (item.ok) return null;
  const kind = inferErrorKind({
    errorKind: item.error_kind ?? null,
    errorMessage: item.message ?? null,
    statusCode: item.status ?? null,
    success: item.ok,
  });
  return kind ? getErrorCopy(kind, item.status, item.message) : null;
}

function HistoryTimestamp({ item }: { item: TestHistoryItem }) {
  const attempts = item.attempts ?? 1;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="text-muted-foreground tabular-nums truncate inline-flex items-center gap-1">
          {formatRelative(item.tested_at)}
          {item.triggered_by === "cron" && <Bot className="h-3 w-3 text-muted-foreground/70" aria-label="Teste automático" />}
          {attempts > 1 && (
            <span className={cn("text-[9px] font-semibold leading-none px-1 py-0.5 rounded border tabular-nums", item.ok ? "bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300" : "bg-destructive/10 border-destructive/30 text-destructive")} aria-label={`${attempts} tentativas`}>
              {attempts}×
            </span>
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">
        {formatAbsolute(item.tested_at)}
        {item.triggered_by === "cron" && " · automático (cron)"}
        {item.triggered_by === "manual" && " · manual"}
        {attempts > 1 && <> · {attempts} tentativas{item.ok ? " (recuperou na 2ª)" : ""}</>}
      </TooltipContent>
    </Tooltip>
  );
}

function HistoryMessage({ item, tail }: { item: TestHistoryItem; tail: string }) {
  const kindCopy = historyKindCopy(item);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("truncate inline-flex items-center gap-1.5 min-w-0", item.ok ? "text-foreground/80" : DESTRUCTIVE_TEXT)}>
          {kindCopy && (
            <span className={cn("inline-flex items-center gap-1 text-[9px] font-medium h-4 px-1 rounded border shrink-0 tabular-nums", getKindBadgeClass(kindCopy.tone))} title={`Tipo de falha: ${kindCopy.title}`} aria-label={`Tipo de falha: ${getKindLabel(kindCopy.tone)}`}>
              {getKindLabel(kindCopy.tone)}
            </span>
          )}
          <span className="truncate">{tail}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm break-words">{kindCopy ? `${kindCopy.title} — ${tail}` : tail}</TooltipContent>
    </Tooltip>
  );
}

function HistoryAction({ ok }: { ok: boolean }) {
  if (ok) return <span className="text-[10px] text-muted-foreground/60 shrink-0 px-1" aria-hidden>Ver →</span>;
  return <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium hover:underline shrink-0 px-1.5 py-0.5 rounded bg-destructive/10 border border-destructive/30", DESTRUCTIVE_TEXT)} aria-hidden><Info className="h-3 w-3" />Ver detalhes do erro</span>;
}

/**
 * Optimistic placeholder shown at the top of the list while a manual test is
 * in flight, so users see immediately that their click was registered and a new
 * row will be appended without a page reload.
 */
function PendingHistoryRow({ startedAt }: { startedAt: string }) {
  const rel = formatRelative(startedAt);
  return (
    <li>
      <div
        className={cn(
          "w-full grid grid-cols-[14px_minmax(80px,auto)_minmax(54px,auto)_1fr_auto] items-center gap-2 text-xs px-1.5 py-1 rounded",
          "border border-dashed border-primary/40 bg-primary/5 text-primary animate-pulse",
        )}
        aria-live="polite"
        aria-label="Teste em andamento"
      >
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
        <span className="text-muted-foreground tabular-nums truncate">
          iniciado {rel || "agora"}
        </span>
        <span className="text-[10px] text-muted-foreground/70">…ms</span>
        <span className="truncate text-primary/80">
          Aguardando resposta do servidor…
        </span>
        <span className="text-[10px] text-primary/70 shrink-0 px-1">novo</span>
      </div>
    </li>
  );
}

function HistoryRow({ item: it, onClick, highlighted, rowRef }: RowProps) {
  const Icon = (it.ok ? CheckCircle2 : XCircle);
  const tail = historyTail(it);
  return (
    <li>
      <div
        ref={rowRef}
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
        className={cn(
          "w-full grid grid-cols-[14px_minmax(80px,auto)_minmax(54px,auto)_1fr_auto] items-center gap-2 text-xs px-1.5 py-1 rounded transition-all text-left cursor-pointer scroll-mt-4",
          "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          (!it.ok && "bg-destructive/[0.03] hover:bg-destructive/10"),
          (highlighted && "ring-2 ring-destructive/70 bg-destructive/15 animate-pulse-once"),
        )}
        aria-label={(it.ok ? "Ver detalhes deste teste" : "Ver detalhes do erro")}
      >
        {(<Icon className={cn(
          "h-3.5 w-3.5 shrink-0",
          it.ok ? "text-green-700 dark:text-green-400" : DESTRUCTIVE_TEXT,
        )} />)}
        <HistoryTimestamp item={it} />
        <LatencyBadge ms={it.latency_ms} />
        <HistoryMessage item={it} tail={tail} />
        <HistoryAction ok={it.ok} />
      </div>
    </li>
  );
}

interface StatusCounts { all: number; ok: number; fail: number }
interface CronCounts { total: number; ok: number; fail: number }
interface HistoryStats { rate: number; avg: number | null; ok: number; total: number }

function filterChipClass(active: boolean, key: StatusFilter): string {
  if (!active) return "border-transparent text-muted-foreground hover:bg-muted/60";
  if (key === "fail") return "bg-destructive/10 border-destructive/40 text-destructive";
  if (key === "ok") return "bg-green-500/10 border-green-500/40 text-green-700 dark:text-green-400";
  return "bg-muted border-border text-foreground";
}

function StatusFilterChips({ filter, counts, onChange }: { filter: StatusFilter; counts: StatusCounts; onChange: (filter: StatusFilter) => void }) {
  const options = [
    { key: "all", label: "Todos", count: counts.all },
    { key: "ok", label: "OK", count: counts.ok },
    { key: "fail", label: "Falhas", count: counts.fail },
  ] as const;
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {options.map((option) => (
        <button key={option.key} type="button" onClick={(event) => { event.stopPropagation(); onChange(option.key); }} className={cn("text-[11px] px-2 py-0.5 rounded-full border transition-colors tabular-nums", filterChipClass(filter === option.key, option.key))} aria-pressed={filter === option.key} aria-label={`Mostrar ${option.label.toLowerCase()}`}>
          {option.label} ({option.count})
        </button>
      ))}
    </div>
  );
}

function PreviewSizePicker({ value, onChange }: { value: PreviewSize; onChange: (value: PreviewSize) => void }) {
  return (
    <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground" role="group" aria-label="Itens visíveis no preview">
      <span className="mr-1 uppercase tracking-wider">Mostrar:</span>
      {PREVIEW_SIZE_OPTIONS.map((size) => (
        <button key={size} type="button" onClick={(event) => { event.stopPropagation(); onChange(size); }} className={cn("tabular-nums px-1.5 py-0.5 rounded border transition-colors", value === size ? "bg-primary/10 border-primary/40 text-primary" : "border-transparent hover:bg-muted/60")} aria-pressed={value === size} aria-label={`Mostrar ${size} itens`}>
          {size}
        </button>
      ))}
    </div>
  );
}

interface HistoryItemsListProps {
  items: TestHistoryItem[];
  loading: boolean;
  pendingTest: Props['pendingTest'];
  filter: StatusFilter;
  source: SourceFilter;
  highlightId: string | null;
  onOpenDetails: (id: string) => void;
  setRowRef: (id: string) => (element: HTMLDivElement | null) => void;
}

function HistoryItemsList(props: HistoryItemsListProps) {
  if (props.loading && props.items.length === 0 && !props.pendingTest) {
    return <div className="flex items-center justify-center py-3 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Carregando…</div>;
  }
  if (props.items.length === 0 && !props.pendingTest) {
    return <div className="py-3 text-center text-xs text-muted-foreground">{emptyMessage(props.filter, props.source)}</div>;
  }
  return (
    <TooltipProvider delayDuration={150}>
      <ul className="space-y-0.5">
        {props.pendingTest && <PendingHistoryRow startedAt={props.pendingTest.startedAt} />}
        {props.items.map((item) => <HistoryRow key={item.id} item={item} onClick={() => props.onOpenDetails(item.id)} highlighted={props.highlightId === item.id} rowRef={props.setRowRef(item.id)} />)}
      </ul>
    </TooltipProvider>
  );
}

function successRateClass(rate: number): string {
  if (rate === 100) return "text-green-700 dark:text-green-400";
  return rate >= 80 ? "text-muted-foreground" : DESTRUCTIVE_TEXT;
}

interface HistoryHeaderProps {
  defaultPreview: boolean;
  empty: boolean;
  expanded: boolean;
  items: TestHistoryItem[];
  latestFailure: TestHistoryItem | null;
  showPreview: boolean;
  stats: HistoryStats | null;
  total: number;
  onLatestFailure: (event: MouseEvent) => void;
  onToggle: () => void;
}

function HistoryToggleIcon({ empty, defaultPreview, expanded }: Pick<HistoryHeaderProps, 'empty' | 'defaultPreview' | 'expanded'>) {
  if (empty) return <History className="h-3.5 w-3.5" />;
  if (defaultPreview) return <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />;
  return <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-90")} />;
}

function HistoryHeaderStats({ expanded, items, stats }: Pick<HistoryHeaderProps, 'expanded' | 'items' | 'stats'>) {
  if (expanded) return null;
  return (
    <span className="inline-flex items-center gap-2">
      {items.length >= 2 && <TooltipProvider delayDuration={150}><LatencySparkline items={items} /></TooltipProvider>}
      {stats && <span className={cn("text-[11px] tabular-nums", successRateClass(stats.rate))}>{stats.rate}% sucesso</span>}
    </span>
  );
}

function HistoryPanelHeader(props: HistoryHeaderProps) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={props.onToggle} disabled={props.empty} className={cn("flex-1 flex items-center justify-between gap-2 text-xs font-medium rounded-md px-1 py-1 transition-colors", props.empty ? "text-muted-foreground/60 cursor-not-allowed" : "text-foreground hover:bg-muted/50")} aria-expanded={props.expanded}>
        <span className="inline-flex items-center gap-1.5">
          <HistoryToggleIcon empty={props.empty} defaultPreview={props.defaultPreview} expanded={props.expanded} />
          {props.showPreview ? `Últimas verificações (${props.total})` : `Histórico de testes (${props.total})`}
        </span>
        <HistoryHeaderStats expanded={props.expanded} items={props.items} stats={props.stats} />
      </button>
      {props.latestFailure && <button type="button" onClick={props.onLatestFailure} className="shrink-0 inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded border border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors" aria-label="Rolar até o erro mais recente e destacar" title="Rolar até o erro mais recente"><AlertCircle className="h-3 w-3" />Ver erro mais recente</button>}
    </div>
  );
}

interface FilterControlsProps {
  counts: StatusCounts;
  cronCounts: CronCounts;
  filter: StatusFilter;
  manualTotal: number;
  source: SourceFilter;
  totalItems: number;
  onFilterChange: (filter: StatusFilter) => void;
  onSourceChange: (source: SourceFilter) => void;
}

function FilterControls(props: FilterControlsProps) {
  return (
    <>
      <StatusFilterChips filter={props.filter} counts={props.counts} onChange={props.onFilterChange} />
      <SourceFilterChips value={props.source} onChange={props.onSourceChange} allCount={props.totalItems} manualCount={props.manualTotal} cronOk={props.cronCounts.ok} cronFail={props.cronCounts.fail} cronTotal={props.cronCounts.total} />
    </>
  );
}

function shouldShowInlinePreview(defaultPreview: boolean, expanded: boolean, empty: boolean, hasPending: boolean): boolean {
  return defaultPreview && !expanded && (!empty || hasPending);
}

interface PreviewContentProps extends HistoryItemsListProps, FilterControlsProps {
  show: boolean;
  previewSize: PreviewSize;
  onPreviewSizeChange: (value: PreviewSize) => void;
}

function PreviewContent(props: PreviewContentProps) {
  if (!props.show) return null;
  return (
    <>
      <div className="mt-2 space-y-2">
        <div className="flex items-center justify-between gap-2 px-1">
          <StatusFilterChips filter={props.filter} counts={props.counts} onChange={props.onFilterChange} />
          <PreviewSizePicker value={props.previewSize} onChange={props.onPreviewSizeChange} />
        </div>
        <SourceFilterChips value={props.source} onChange={props.onSourceChange} allCount={props.totalItems} manualCount={props.manualTotal} cronOk={props.cronCounts.ok} cronFail={props.cronCounts.fail} cronTotal={props.cronCounts.total} />
      </div>
      <div className="space-y-2 mt-2">
        <HistoryItemsList {...props} />
      </div>
    </>
  );
}

function HistoryStatsFooter({ stats, type, label, timelineOpen, onTimelineOpen }: { stats: HistoryStats | null; type: ConnectionType; label: string; timelineOpen: boolean; onTimelineOpen: (open: boolean) => void }) {
  if (!stats) return null;
  return (
    <div className="flex items-center justify-between border-t pt-2 text-[11px] text-muted-foreground">
      <span>
        Taxa de sucesso: <span className={cn("font-medium tabular-nums", successRateClass(stats.rate))}>{stats.rate}%</span>
        {!isNullish(stats.avg) && <> · Latência média: <span className="font-medium tabular-nums text-foreground">{stats.avg}ms</span></>}
      </span>
      <ConnectionTimelineDrawer type={type} label={label} triggerVariant="ghost" open={timelineOpen} onOpenChange={onTimelineOpen} />
    </div>
  );
}

interface ExpandedContentProps extends HistoryItemsListProps, FilterControlsProps {
  expanded: boolean;
  empty: boolean;
  label: string;
  stats: HistoryStats | null;
  timelineOpen: boolean;
  type: ConnectionType;
  onTimelineOpen: (open: boolean) => void;
}

function ExpandedContent(props: ExpandedContentProps) {
  if (!props.expanded || props.empty) return null;
  return (
    <div className="mt-2 space-y-2 animate-in fade-in-50 duration-200">
      <FilterControls {...props} />
      <HistoryItemsList {...props} />
      <HistoryStatsFooter stats={props.stats} type={props.type} label={props.label} timelineOpen={props.timelineOpen} onTimelineOpen={props.onTimelineOpen} />
    </div>
  );
}

export function ConnectionTestHistoryPanel({
  type, envKey, connectionId, refreshKey, label, className, defaultPreview = true, pendingTest = null,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [source, setSource] = useState<SourceFilter>("all");
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [previewSize, setPreviewSize] = useState<PreviewSize>(() => loadPreviewSize());

  const updatePreviewSize = (n: PreviewSize) => {
    setPreviewSize(n);
    try { window.localStorage.setItem(PREVIEW_SIZE_STORAGE_KEY, String(n)); } catch { /* ignore */ }
  };

  // Limit fetched rows to cover the largest preview size + headroom for filtering
  const fetchLimit = (expanded ? Math.max(20, previewSize * 2) : Math.max(10, previewSize + 5));

  const { items, total, loading } = useConnectionTestHistory({
    type, envKey, connectionId, refreshKey,
    enabled: expanded,
    limit: fetchLimit,
  });

  // Source-filtered base list — status counts and visible items both derive from here
  const sourceFiltered = useMemo(() => {
    if (source === "manual") return items.filter((i) => i.triggered_by !== "cron");
    if (source === "cron") return items.filter((i) => i.triggered_by === "cron");
    return items;
  }, [items, source]);

  const counts = useMemo(() => ({
    all: sourceFiltered.length,
    ok: sourceFiltered.filter((i) => i.ok).length,
    fail: sourceFiltered.filter((i) => !i.ok).length,
  }), [sourceFiltered]);

  // Cron-only counts (always over the whole `items`) — used for the source chip badges
  const cronCounts = useMemo(() => {
    const cron = items.filter((i) => i.triggered_by === "cron");
    return {
      total: cron.length,
      ok: cron.filter((i) => i.ok).length,
      fail: cron.filter((i) => !i.ok).length,
    };
  }, [items]);
  const manualTotal = items.length - cronCounts.total;

  const visibleItems = useMemo(() => {
    if (filter === "ok") return sourceFiltered.filter((i) => i.ok);
    if (filter === "fail") return sourceFiltered.filter((i) => !i.ok);
    return sourceFiltered;
  }, [sourceFiltered, filter]);

  const previewItems = useMemo(() => visibleItems.slice(0, previewSize), [visibleItems, previewSize]);

  const stats = useMemo(() => {
    if (items.length === 0) return null;
    const latencies = items.flatMap((item) => item.ok && !isNullish(item.latency_ms) ? [item.latency_ms] : []);
    const avg = latencies.length
      ? Math.round(latencies.reduce((s, n) => s + n, 0) / latencies.length)
      : null;
    return { rate: Math.round((counts.ok / items.length) * 100), avg, ok: counts.ok, total: items.length };
  }, [items, counts.ok]);

  const empty = (total === 0 && !loading);
  // Show the inline preview whenever defaultPreview is on AND we either have
  // data, are loading, or have an in-flight test to surface.
  const showPreview = shouldShowInlinePreview(defaultPreview, expanded, empty, Boolean(pendingTest));

  // Most-recent failure (items are returned newest-first)
  const latestFailure = useMemo(() => items.find((i) => !i.ok) ?? null, [items]);

  // Highlight + scroll-to logic for "Ver erro mais recente"
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [highlightId, setHighlightId] = useState<string | null>(null);
  useEffect(() => {
    if (!highlightId) return;
    const t = setTimeout(() => setHighlightId(null), 2500);
    return () => clearTimeout(t);
  }, [highlightId]);

  // Auto-highlight the freshest item whenever refreshKey changes (i.e. a manual
  // test just completed). Items are returned newest-first by the edge function.
  const prevRefreshKeyRef = useRef(refreshKey);
  useEffect(() => {
    if (prevRefreshKeyRef.current === refreshKey) return;
    prevRefreshKeyRef.current = refreshKey;
    const newest = items[0];
    if (newest) setHighlightId(newest.id);
  }, [refreshKey, items]);

  const goToLatestFailure = (e?: MouseEvent) => {
    e?.stopPropagation();
    if (!latestFailure) return;
    if (!expanded && !showPreview) setExpanded(true);
    if (filter === "ok") setFilter("all");
    setHighlightId(latestFailure.id);
    // wait for next paint so the row exists in DOM
    requestAnimationFrame(() => {
      const el = rowRefs.current.get(latestFailure.id);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.focus?.();
    });
  };

  const setRowRef = (id: string) => (el: HTMLDivElement | null) => {
    if (el) rowRefs.current.set(id, el);
    else rowRefs.current.delete(id);
  };

  return (
    <div className={cn("border-t pt-3 mt-3", className)}>
      <HistoryPanelHeader
        defaultPreview={defaultPreview}
        empty={empty}
        expanded={expanded}
        items={items}
        latestFailure={latestFailure}
        showPreview={showPreview}
        stats={stats}
        total={total}
        onLatestFailure={goToLatestFailure}
        onToggle={() => { if (!empty) setExpanded((value) => !value); }}
      />

      <PreviewContent
        show={showPreview}
        items={previewItems}
        loading={loading}
        pendingTest={pendingTest}
        filter={filter}
        source={source}
        highlightId={highlightId}
        onOpenDetails={setDetailsId}
        setRowRef={setRowRef}
        counts={counts}
        cronCounts={cronCounts}
        manualTotal={manualTotal}
        totalItems={items.length}
        onFilterChange={setFilter}
        onSourceChange={setSource}
        previewSize={previewSize}
        onPreviewSizeChange={updatePreviewSize}
      />
      <ExpandedContent
        expanded={expanded}
        empty={empty}
        items={visibleItems}
        loading={loading}
        pendingTest={pendingTest}
        filter={filter}
        source={source}
        highlightId={highlightId}
        onOpenDetails={setDetailsId}
        setRowRef={setRowRef}
        counts={counts}
        cronCounts={cronCounts}
        manualTotal={manualTotal}
        totalItems={items.length}
        onFilterChange={setFilter}
        onSourceChange={setSource}
        stats={stats}
        type={type}
        label={label}
        timelineOpen={timelineOpen}
        onTimelineOpen={setTimelineOpen}
      />

      {(<ConnectionTestDetailsDialog
        open={detailsId !== null}
        onOpenChange={(v) => { if (!v) setDetailsId(null); }}
        connectionType={type}
        connectionLabel={label}
        envKey={envKey}
        connectionId={connectionId}
        historyId={detailsId ?? undefined}
        onViewFullHistory={() => setTimelineOpen(true)}
      />)}
    </div>
  );
}
