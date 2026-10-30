import { useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  RefreshCw,
  Database,
  Briefcase,
  Workflow,
  Plug,
  Webhook,
  Loader2,
  PlayCircle,
  Clock,
  Info,
  AlertTriangle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConnectionStatusBadge } from "./ConnectionStatusBadge";
import { LatencyBadge } from "./LatencyBadge";
import { useConnectionsOverview, type OverviewRow } from "@/hooks/useConnectionsOverview";
import { useConnectionTester, type ConnectionType, type TestResult } from "@/hooks/useConnectionTester";
import { ConnectionsOverviewFilters } from "./ConnectionsOverviewFilters";
import { applyFilters, useConnectionsOverviewFilters } from "@/hooks/useConnectionsOverviewFilters";
import { ConnectionTestDetailsDialog } from "./ConnectionTestDetailsDialog";
import { ConnectionTimelineDrawer } from "./ConnectionTimelineDrawer";
import { useConsecutiveFailures, type ConsecutiveFailureInfo } from "@/hooks/useConsecutiveFailures";
import { CONSECUTIVE_FAILURE_THRESHOLD } from "@/lib/connections-config";
import { useSecretsManager, type SecretStatus } from "@/hooks/useSecretsManager";
import { ConnectionRowSourceBadge } from "./ConnectionRowSourceBadge";

const TYPE_META: Record<string, { label: string; Icon: typeof Database }> = {
  supabase: { label: "Banco", Icon: Database },
  bitrix24: { label: "Bitrix24", Icon: Briefcase },
  n8n: { label: "n8n", Icon: Workflow },
  mcp: { label: "MCP", Icon: Plug },
  webhook_outbound: { label: "Webhook", Icon: Webhook },
};

interface BulkProgress {
  total: number;
  done: number;
  ok: number;
  fail: number;
  startedAt: number;
}

function recordBulkResult(setProgress: Dispatch<SetStateAction<BulkProgress | null>>, succeeded: boolean) {
  setProgress((current) => {
    if (!current) return current;
    return {
      ...current,
      done: current.done + 1,
      ok: current.ok + Number(succeeded),
      fail: current.fail + Number(!succeeded),
    };
  });
}

function testResultPatch(result: TestResult): Partial<OverviewRow> {
  return {
    last_test_at: result.tested_at ?? new Date().toISOString(),
    last_test_ok: result.ok,
    last_test_message: result.ok ? result.message ?? null : result.error ?? null,
    last_latency_ms: result.latency_ms ?? null,
  };
}

function BulkTestProgressPanel({
  progress,
  elapsed,
  cancelling,
  onCancel,
}: {
  progress: BulkProgress;
  elapsed: number;
  cancelling: boolean;
  onCancel: () => void;
}) {
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2">
      <div className="flex-1 space-y-1.5">
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-between text-xs tabular-nums text-muted-foreground"
        >
          <span>
            {cancelling ? "Cancelando..." : `Testando ${progress.done} de ${progress.total}`}
            <span className="mx-2">·</span>
            <span className="text-success">✓ {progress.ok}</span>
            <span className="mx-1.5">·</span>
            <span className="text-destructive">✗ {progress.fail}</span>
            <span className="mx-2">·</span>
            <span>⏱ {elapsed}s</span>
          </span>
          <span className="font-display text-[10px]">{pct}%</span>
        </div>
        <Progress value={pct} aria-label="Progresso dos testes em massa" className="h-1.5" />
      </div>
      <Button variant="outline" size="sm" onClick={onCancel} disabled={cancelling}>
        <X className="h-3.5 w-3.5" />
        Cancelar
      </Button>
    </div>
  );
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "—";
  const diff = Date.now() - ts;
  if (diff < 5_000) return "agora há pouco";
  if (diff < 60_000) return `há ${Math.round(diff / 1000)}s`;
  if (diff < 3_600_000) return `há ${Math.round(diff / 60_000)}min`;
  if (diff < 86_400_000) return `há ${Math.round(diff / 3_600_000)}h`;
  return `há ${Math.round(diff / 86_400_000)}d`;
}

function rowStatus(
  r: OverviewRow,
): "active" | "degraded" | "error" | "unconfigured" | "disabled" | "never_tested" {
  // Persisted states (external_connections.status) take precedence
  const persisted = (r.status ?? "").toLowerCase();
  if (persisted === "disabled" || persisted === "inactive") return "disabled";
  if (persisted === "unconfigured") return "unconfigured";
  // Configured but never tested
  if (!r.last_test_at) return "never_tested";
  // Tested at least once → derive from last result
  if (r.last_test_ok === true) return "active";
  if (r.last_test_ok === false) return "error";
  return "degraded";
}

interface ConnectionsOverviewTableProps {
  /** When this number changes, the table refetches. */
  refreshSignal?: number;
}

function ConsecutiveFailuresCell({ failure }: { failure: ConsecutiveFailureInfo | undefined }) {
  const failCount = failure?.count ?? 0;
  if (failCount === 0) return <TableCell><span className="text-xs text-muted-foreground">—</span></TableCell>;
  const overThreshold = failCount > CONSECUTIVE_FAILURE_THRESHOLD;
  const description = failure?.since
    ? `${failCount} ${failCount === 1 ? "falha consecutiva" : "falhas consecutivas"} desde ${formatRelative(failure.since)}`
    : `${failCount} ${failCount === 1 ? "falha consecutiva" : "falhas consecutivas"} — nunca houve sucesso registrado`;
  return (
    <TableCell>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums", overThreshold ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning")} aria-label={`${failCount} falhas consecutivas`}>
            {overThreshold && <AlertTriangle className="h-3 w-3" />}
            {failCount}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top"><p className="text-xs">{description}</p></TooltipContent>
      </Tooltip>
    </TableCell>
  );
}

function TestMessageCell({ row, onDetails }: { row: OverviewRow; onDetails: (row: OverviewRow) => void }) {
  if (!row.last_test_message) return <TableCell><span className="text-xs text-muted-foreground">—</span></TableCell>;
  return (
    <TableCell className="max-w-[260px]">
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" onClick={() => row.last_test_at && onDetails(row)} className={cn("block truncate text-left text-xs underline decoration-dotted underline-offset-2 hover:opacity-80 transition-opacity max-w-full", row.last_test_ok ? "text-muted-foreground" : "text-destructive")} aria-label="Ver detalhes do último teste">
            {row.last_test_message}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-md"><p className="text-xs whitespace-pre-wrap break-words">{row.last_test_message}</p></TooltipContent>
      </Tooltip>
    </TableCell>
  );
}

interface OverviewRowViewProps {
  row: OverviewRow;
  isTesting: boolean;
  bulkTesting: boolean;
  failure: ConsecutiveFailureInfo | undefined;
  secrets: SecretStatus[];
  onDetails: (row: OverviewRow) => void;
  onTest: (row: OverviewRow) => void;
  onToggleAutoTest: (row: OverviewRow, next: boolean) => void;
}

function ConnectionStatusCell({ row, isTesting }: { row: OverviewRow; isTesting: boolean }) {
  return (
    <TableCell>
      {isTesting
        ? <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Testando...</span>
        : <ConnectionStatusBadge status={rowStatus(row)} />}
    </TableCell>
  );
}

function AutoTestCell({ row, onToggle }: { row: OverviewRow; onToggle: (row: OverviewRow, next: boolean) => void }) {
  const description = row.auto_test_enabled
    ? "Cron testa essa conexão a cada 30min. Clique para desligar."
    : "Cron está ignorando essa conexão. Clique para reativar.";
  return (
    <TableCell>
      <Tooltip>
        <TooltipTrigger asChild><span className="inline-flex items-center"><Switch checked={row.auto_test_enabled} onCheckedChange={(value) => onToggle(row, value)} disabled={!row.id} aria-label={`Auto-teste ${row.auto_test_enabled ? "ligado" : "desligado"} para ${row.name}`} /></span></TooltipTrigger>
        <TooltipContent side="top"><p className="text-xs max-w-[240px]">{description}</p></TooltipContent>
      </Tooltip>
    </TableCell>
  );
}

function RowActions({ row, isTesting, bulkTesting, onDetails, onTest }: Pick<OverviewRowViewProps, "row" | "isTesting" | "bulkTesting" | "onDetails" | "onTest">) {
  return (
    <TableCell className="text-right"><div className="inline-flex items-center gap-1">
      {row.last_test_at && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDetails(row)} aria-label="Ver detalhes do último teste"><Info className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent side="top"><p className="text-xs">Ver detalhes do último teste</p></TooltipContent></Tooltip>}
      <Button variant="ghost" size="sm" onClick={() => onTest(row)} disabled={isTesting || bulkTesting}>{isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}Testar</Button>
    </div></TableCell>
  );
}

function OverviewRowView({ row, isTesting, bulkTesting, failure, secrets, onDetails, onTest, onToggleAutoTest }: OverviewRowViewProps) {
  const meta = TYPE_META[row.type] ?? { label: row.type, Icon: Plug };
  const Icon = meta.Icon;
  const overThreshold = (failure?.count ?? 0) > CONSECUTIVE_FAILURE_THRESHOLD;
  return (
    <TableRow className={cn(overThreshold && "bg-destructive/5 border-l-2 border-l-destructive")}>
      <TableCell><span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" />{meta.label}</span></TableCell>
      <TableCell className="font-medium">
        <div className="truncate max-w-[260px]" title={row.name}>{row.name}</div>
        {row.env_key && <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">{row.env_key}</div>}
      </TableCell>
      <TableCell><ConnectionRowSourceBadge envKey={row.env_key ?? null} secrets={secrets} /></TableCell>
      <ConnectionStatusCell row={row} isTesting={isTesting} />
      <TableCell className="text-xs text-muted-foreground tabular-nums">{formatRelative(row.last_test_at)}</TableCell>
      <ConsecutiveFailuresCell failure={failure} />
      <TableCell><LatencyBadge ms={row.last_latency_ms} /></TableCell>
      <AutoTestCell row={row} onToggle={onToggleAutoTest} />
      <TestMessageCell row={row} onDetails={onDetails} />
      <RowActions row={row} isTesting={isTesting} bulkTesting={bulkTesting} onDetails={onDetails} onTest={onTest} />
    </TableRow>
  );
}

function OverviewHeader({
  refreshing,
  concurrency,
  bulkTesting,
  activeCount,
  filteredCount,
  onRefresh,
  onConcurrencyChange,
  onRunAll,
}: {
  refreshing: boolean;
  concurrency: number;
  bulkTesting: boolean;
  activeCount: number;
  filteredCount: number;
  onRefresh: () => void;
  onConcurrencyChange: (value: string) => void;
  onRunAll: () => void;
}) {
  return (
    <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
      <div>
        <CardTitle className="text-base">Visão geral das conexões</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">Última verificação persistida de cada integração. Atualiza automaticamente a cada 30s.</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing}><RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />Atualizar</Button>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild><div className="flex items-center gap-1.5"><span className="font-display text-xs text-muted-foreground">Paralelos:</span><Select value={String(concurrency)} onValueChange={onConcurrencyChange} disabled={bulkTesting}><SelectTrigger className="h-8 w-[70px]" aria-label="Limite de testes paralelos"><SelectValue /></SelectTrigger><SelectContent>{[1, 2, 3, 5, 8].map((count) => <SelectItem key={count} value={String(count)}>{count}</SelectItem>)}</SelectContent></Select></div></TooltipTrigger>
            <TooltipContent side="bottom"><p className="text-xs">Quantos testes rodam ao mesmo tempo</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild><Button variant="default" size="sm" onClick={onRunAll} disabled={bulkTesting || filteredCount === 0}>{bulkTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}Testar {activeCount > 0 ? "filtradas" : "todas"}</Button></TooltipTrigger>
            <TooltipContent side="bottom"><p className="text-xs max-w-[220px]">Roda os testes em paralelo até o limite escolhido. Você pode cancelar a qualquer momento.</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </CardHeader>
  );
}

function EmptyOverview({ activeCount, onReset }: { activeCount: number; onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-10 text-center">
      <Clock className="h-6 w-6 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{activeCount > 0 ? "Nenhuma conexão corresponde aos filtros" : "Nenhuma conexão cadastrada"}</p>
      {activeCount > 0 && <Button variant="ghost" size="sm" onClick={onReset} className="h-8 text-xs">Limpar filtros</Button>}
    </div>
  );
}

function OverviewTableHeader() {
  return (
    <TableHeader><TableRow>
      <TableHead className="w-[110px]">Tipo</TableHead><TableHead>Nome</TableHead>
      <TableHead className="w-[90px]"><Tooltip><TooltipTrigger asChild><span className="cursor-help underline decoration-dotted underline-offset-2">Origem</span></TooltipTrigger><TooltipContent side="top"><p className="text-xs max-w-[260px]">De onde vêm as credenciais EXTERNAL_*: <strong>DB</strong> (banco, auditável), <strong>ENV</strong> (variável de ambiente, sem rotação) ou <strong>—</strong> (não configurado).</p></TooltipContent></Tooltip></TableHead>
      <TableHead className="w-[140px]">Status</TableHead><TableHead className="w-[150px]">Última verificação</TableHead><TableHead className="w-[110px]">Falhas seguidas</TableHead><TableHead className="w-[90px]">Latência</TableHead>
      <TableHead className="w-[110px]"><Tooltip><TooltipTrigger asChild><span className="cursor-help underline decoration-dotted underline-offset-2">Auto-teste</span></TooltipTrigger><TooltipContent side="top"><p className="text-xs max-w-[240px]">Quando ligado, o cron testa essa conexão automaticamente a cada 30min.</p></TooltipContent></Tooltip></TableHead>
      <TableHead>Mensagem</TableHead><TableHead className="w-[140px] text-right">Ações</TableHead>
    </TableRow></TableHeader>
  );
}

interface OverviewRowsProps {
  rows: OverviewRow[];
  testingKeys: Set<string>;
  bulkTesting: boolean;
  failuresMap: Map<string, ConsecutiveFailureInfo>;
  secrets: SecretStatus[];
  onDetails: (row: OverviewRow) => void;
  onTest: (row: OverviewRow) => void;
  onToggleAutoTest: (row: OverviewRow, next: boolean) => void;
}

function OverviewRowsTable(props: OverviewRowsProps) {
  return (
    <TooltipProvider delayDuration={200}><Table><OverviewTableHeader /><TableBody>
      {props.rows.map((row) => <OverviewRowView key={row.key} row={row} isTesting={props.testingKeys.has(row.key)} bulkTesting={props.bulkTesting} failure={props.failuresMap.get(row.key)} secrets={props.secrets} onDetails={props.onDetails} onTest={props.onTest} onToggleAutoTest={props.onToggleAutoTest} />)}
    </TableBody></Table></TooltipProvider>
  );
}

interface OverviewContentProps extends OverviewRowsProps {
  loading: boolean;
  progress: BulkProgress | null;
  elapsed: number;
  cancelling: boolean;
  filterState: ReturnType<typeof useConnectionsOverviewFilters>;
  totalCount: number;
  onCancel: () => void;
}

function OverviewContent(props: OverviewContentProps) {
  const { filters, activeCount, reset } = props.filterState;
  let result: ReactNode;
  if (props.loading) result = <div className="space-y-2">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-10 w-full" />)}</div>;
  else if (props.rows.length === 0) result = <EmptyOverview activeCount={activeCount} onReset={reset} />;
  else result = <OverviewRowsTable {...props} />;
  return (
    <CardContent className="space-y-3">
      {props.progress && <BulkTestProgressPanel progress={props.progress} elapsed={props.elapsed} cancelling={props.cancelling} onCancel={props.onCancel} />}
      <ConnectionsOverviewFilters filters={filters} toggleType={props.filterState.toggleType} setStatus={props.filterState.setStatus} setWindow={props.filterState.setWindow} removeType={props.filterState.removeType} setOnlyConsecutiveFailures={props.filterState.setOnlyConsecutiveFailures} reset={reset} activeCount={activeCount} totalCount={props.totalCount} filteredCount={props.rows.length} />
      {result}
    </CardContent>
  );
}

function OverviewDialogs({ detailsRow, timelineRow, onDetailsChange, onTimelineChange, onViewFullHistory }: { detailsRow: OverviewRow | null; timelineRow: OverviewRow | null; onDetailsChange: (open: boolean) => void; onTimelineChange: (open: boolean) => void; onViewFullHistory: () => void }) {
  return <>{detailsRow && <ConnectionTestDetailsDialog open onOpenChange={onDetailsChange} connectionType={detailsRow.type as ConnectionType} connectionLabel={detailsRow.name} envKey={detailsRow.env_key ?? undefined} connectionId={detailsRow.id ?? undefined} onViewFullHistory={onViewFullHistory} />}{timelineRow && <ConnectionTimelineDrawer type={timelineRow.type} label={timelineRow.name} hideTrigger open onOpenChange={onTimelineChange} />}</>;
}

export function ConnectionsOverviewTable({ refreshSignal }: ConnectionsOverviewTableProps = {}) {
  const { rows, loading, refreshing, refresh, patchRow } = useConnectionsOverview(30000);
  const { secrets, list: refreshSecrets } = useSecretsManager();
  useEffect(() => { refreshSecrets(); }, [refreshSecrets]);

  // External refresh trigger
  const lastSignalRef = useRef<number | undefined>(refreshSignal);
  useEffect(() => {
    if (refreshSignal === undefined) return;
    if (lastSignalRef.current === refreshSignal) return;
    lastSignalRef.current = refreshSignal;
    void refresh();
  }, [refreshSignal, refresh]);

  const { test } = useConnectionTester();
  const filterState = useConnectionsOverviewFilters();
  const { filters, activeCount } = filterState;
  const [testingKeys, setTestingKeys] = useState<Set<string>>(new Set());
  const [bulkTesting, setBulkTesting] = useState(false);
  const [detailsRow, setDetailsRow] = useState<OverviewRow | null>(null);
  const [timelineRow, setTimelineRow] = useState<OverviewRow | null>(null);
  const { map: failuresMap } = useConsecutiveFailures(rows, 30000);
  const [progress, setProgress] = useState<BulkProgress | null>(null);
  const cancelRef = useRef(false);
  const [concurrency, setConcurrency] = useState<number>(() => {
    if (typeof window === "undefined") return 3;
    const stored = window.localStorage.getItem("connections.bulk_test_concurrency");
    return Math.min(8, Math.max(1, parseInt(stored ?? "3", 10) || 3));
  });
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!progress) { setElapsed(0); return; }
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - progress.startedAt) / 1000)), 250);
    return () => clearInterval(id);
  }, [progress]);

  const filtered = useMemo(
    () => applyFilters(rows, filters, failuresMap),
    [rows, filters, failuresMap],
  );

  function addTestingKey(k: string) {
    setTestingKeys((prev) => { const n = new Set(prev); n.add(k); return n; });
  }
  function removeTestingKey(k: string) {
    setTestingKeys((prev) => { const n = new Set(prev); n.delete(k); return n; });
  }

  async function runTest(row: OverviewRow) {
    addTestingKey(row.key);
    try {
      const res = await test(row.type as ConnectionType, {
        env_key: row.env_key ?? undefined,
        connectionId: row.id ?? undefined,
      });
      patchRow(row.key, testResultPatch(res));
    } finally {
      removeTestingKey(row.key);
    }
  }

  async function toggleAutoTest(row: OverviewRow, next: boolean) {
    if (!row.id) return;
    // Optimistic update
    patchRow(row.key, { auto_test_enabled: next });
    const { error } = await supabase
      .from("external_connections")
      .update({ auto_test_enabled: next })
      .eq("id", row.id);
    if (error) {
      patchRow(row.key, { auto_test_enabled: !next });
      toast.error("Não foi possível atualizar o auto-teste", { description: error.message });
      return;
    }
    toast.success(next ? "Auto-teste habilitado" : "Auto-teste desabilitado", {
      description: next
        ? `${row.name} voltará a ser testada pelo cron`
        : `${row.name} será ignorada pelo cron de testes`,
    });
  }

  function changeConcurrency(v: string) {
    const n = Math.min(8, Math.max(1, parseInt(v, 10) || 3));
    setConcurrency(n);
    try { window.localStorage.setItem("connections.bulk_test_concurrency", String(n)); } catch { /* noop */ }
  }

  async function runAll() {
    const queue = [...filtered];
    const total = queue.length;
    if (total === 0) return;
    cancelRef.current = false;
    setBulkTesting(true);
    setProgress({ total, done: 0, ok: 0, fail: 0, startedAt: Date.now() });
    try {
      const c = Math.min(concurrency, total);
      const workers = Array.from({ length: c }, async () => {
        while (queue.length) {
          if (cancelRef.current) return;
          const next = queue.shift();
          if (!next) return;
          addTestingKey(next.key);
          try {
            const res = await test(next.type as ConnectionType, {
              env_key: next.env_key ?? undefined,
              connectionId: next.id ?? undefined,
              silent: true,
            });
            patchRow(next.key, testResultPatch(res));
            recordBulkResult(setProgress, res.ok);
          } catch {
            recordBulkResult(setProgress, false);
          } finally {
            removeTestingKey(next.key);
          }
        }
      });
      await Promise.all(workers);
      setProgress((p) => {
        if (!p) return null;
        const secs = Math.max(1, Math.round((Date.now() - p.startedAt) / 1000));
        if (cancelRef.current) {
          toast.error("Testes cancelados", { description: `${p.done} de ${p.total} executados em ${secs}s` });
        } else {
          toast.success("Testes em massa concluídos", { description: `${p.ok} OK · ${p.fail} falhas em ${secs}s` });
        }
        return p;
      });
      await refresh();
    } finally {
      setBulkTesting(false);
      setTimeout(() => setProgress(null), 800);
      cancelRef.current = false;
    }
  }

  function cancelBulk() {
    cancelRef.current = true;
  }

  return (
    <Card>
      <OverviewHeader
        refreshing={refreshing}
        concurrency={concurrency}
        bulkTesting={bulkTesting}
        activeCount={activeCount}
        filteredCount={filtered.length}
        onRefresh={() => void refresh()}
        onConcurrencyChange={changeConcurrency}
        onRunAll={() => void runAll()}
      />
      <OverviewContent
        rows={filtered}
        testingKeys={testingKeys}
        bulkTesting={bulkTesting}
        failuresMap={failuresMap}
        secrets={secrets}
        onDetails={setDetailsRow}
        onTest={(row) => void runTest(row)}
        onToggleAutoTest={(row, next) => void toggleAutoTest(row, next)}
        loading={loading}
        progress={progress}
        elapsed={elapsed}
        cancelling={Boolean(cancelRef.current && progress && progress.done < progress.total)}
        filterState={filterState}
        totalCount={rows.length}
        onCancel={cancelBulk}
      />
      <OverviewDialogs
        detailsRow={detailsRow}
        timelineRow={timelineRow}
        onDetailsChange={(open) => { if (!open) setDetailsRow(null); }}
        onTimelineChange={(open) => { if (!open) setTimelineRow(null); }}
        onViewFullHistory={() => setTimelineRow(detailsRow)}
      />
    </Card>
  );
}
