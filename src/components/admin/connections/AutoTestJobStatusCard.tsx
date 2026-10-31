import { useCallback, useEffect, useState } from "react";
import { Activity, CheckCircle2, XCircle, RefreshCw, Clock, Repeat2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface JobRun {
  run_started_at: string;
  run_ended_at: string;
  duration_ms: number;
  total_tested: number;
  ok_count: number;
  fail_count: number;
  retried_count: number;
  avg_latency_ms: number;
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "agora";
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `há ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

interface JobStats {
  lastRun?: JobRun;
  runs24: number;
  ok24: number;
  fail24: number;
  successRate24: number | null;
}

function calculateJobStats(runs: JobRun[]): JobStats {
  const recentRuns = runs.filter((run) => Date.now() - new Date(run.run_started_at).getTime() < 86_400_000);
  const total = recentRuns.reduce((sum, run) => sum + run.total_tested, 0);
  const ok24 = recentRuns.reduce((sum, run) => sum + run.ok_count, 0);
  return {
    lastRun: runs[0], runs24: recentRuns.length, ok24,
    fail24: recentRuns.reduce((sum, run) => sum + run.fail_count, 0),
    successRate24: total > 0 ? Math.round((ok24 / total) * 100) : null,
  };
}

function LastRunCard({ run }: { run: JobRun | undefined }) {
  return <div className="rounded-md border bg-background/50 p-3"><div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="h-3 w-3" />Último run</div><div className="mt-1 text-sm font-semibold tabular-nums">{run ? formatRelative(run.run_started_at) : "—"}</div><div className="text-[11px] text-muted-foreground tabular-nums">{run ? formatTime(run.run_started_at) : ""}</div></div>;
}

function DurationCard({ run }: { run: JobRun | undefined }) {
  return <div className="rounded-md border bg-background/50 p-3"><div className="text-xs text-muted-foreground">Duração</div><div className="mt-1 text-sm font-semibold tabular-nums">{run ? formatDuration(run.duration_ms) : "—"}</div><div className="text-[11px] text-muted-foreground">{run ? `${run.total_tested} conexões` : ""}</div></div>;
}

function ResultCard({ run }: { run: JobRun | undefined }) {
  const failed = run?.fail_count ?? 0;
  return <div className="rounded-md border bg-background/50 p-3"><div className="text-xs text-muted-foreground">Resultado</div><div className="mt-1 flex items-center gap-2 text-sm font-semibold tabular-nums"><span className="text-success inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />{run?.ok_count ?? 0}</span><span className="text-muted-foreground">/</span><span className={cn("inline-flex items-center gap-1", failed > 0 ? "text-destructive" : "text-muted-foreground")}><XCircle className="h-3.5 w-3.5" />{failed}</span></div><div className="text-[11px] text-muted-foreground">OK / falha</div></div>;
}

function JobMetrics({ stats }: { stats: JobStats }) {
  return <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><LastRunCard run={stats.lastRun} /><DurationCard run={stats.lastRun} /><ResultCard run={stats.lastRun} /><div className="rounded-md border bg-background/50 p-3"><div className="text-xs text-muted-foreground">Sucesso 24h</div><div className="mt-1 text-sm font-semibold tabular-nums">{stats.successRate24 === null ? "—" : `${stats.successRate24}%`}</div><div className="text-[11px] text-muted-foreground tabular-nums">{stats.ok24} OK · {stats.fail24} falha · {stats.runs24} runs</div></div></div>;
}

function JobRunRow({ run }: { run: JobRun }) {
  return (
    <div className="grid grid-cols-12 px-3 py-2 text-sm border-t items-center hover:bg-muted/30 tabular-nums">
      <div className="col-span-3"><div className="font-medium">{formatTime(run.run_started_at)}</div><div className="text-[11px] text-muted-foreground">{formatRelative(run.run_started_at)}</div></div>
      <div className="col-span-2 text-right text-muted-foreground">{formatDuration(run.duration_ms)}</div><div className="col-span-2 text-right">{run.total_tested}</div>
      <div className="col-span-2 text-right"><span className="text-success">{run.ok_count}</span><span className="text-muted-foreground mx-1">/</span><span className={run.fail_count > 0 ? "text-destructive font-medium" : "text-muted-foreground"}>{run.fail_count}</span></div>
      <div className="col-span-2 text-right text-muted-foreground">{run.avg_latency_ms > 0 ? `${run.avg_latency_ms}ms` : "—"}</div>
      <div className="col-span-1 text-right">{run.retried_count > 0 ? <Badge variant="outline" className="h-5 px-1.5 text-[10px] gap-0.5"><Repeat2 className="h-2.5 w-2.5" />{run.retried_count}</Badge> : <span className="text-muted-foreground text-xs">—</span>}</div>
    </div>
  );
}

function RunsTable({ runs }: { runs: JobRun[] }) {
  return <div className="border rounded-md overflow-hidden"><div className="grid grid-cols-12 text-[11px] uppercase tracking-wide text-muted-foreground bg-muted/40 px-3 py-2 font-medium"><div className="col-span-3">Início</div><div className="col-span-2 text-right">Duração</div><div className="col-span-2 text-right">Testadas</div><div className="col-span-2 text-right">OK / Falha</div><div className="col-span-2 text-right">Latência</div><div className="col-span-1 text-right">Retry</div></div><div className="max-h-[280px] overflow-y-auto">{runs.map((run) => <JobRunRow key={run.run_started_at} run={run} />)}</div></div>;
}

function JobStatusContent({ runs, loading, error }: { runs: JobRun[]; loading: boolean; error: string | null }) {
  if (loading && runs.length === 0) return <div className="space-y-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-32 w-full" /></div>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (runs.length === 0) return <p className="text-sm text-muted-foreground">Nenhuma execução do cron registrada nos últimos 7 dias.</p>;
  return <><JobMetrics stats={calculateJobStats(runs)} /><RunsTable runs={runs} /></>;
}

export function AutoTestJobStatusCard() {
  const [runs, setRuns] = useState<JobRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRuns = useCallback(async () => {
    setError(null);
    try {
      const { data, error: rpcErr } = await supabase.rpc("get_auto_test_job_status", { _limit: 20 });
      if (rpcErr) throw rpcErr;
      setRuns((data ?? []) as JobRun[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRuns();
    const id = setInterval(fetchRuns, 60_000);
    return () => clearInterval(id);
  }, [fetchRuns]);

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      {(<div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center">
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-tight">Job: connections-auto-test</h3>
            <p className="text-xs text-muted-foreground">Cron de auto-teste de conexões — últimos 7 dias</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchRuns} disabled={loading} className="h-8 gap-1.5">
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Atualizar
        </Button>
      </div>)}

      <JobStatusContent runs={runs} loading={loading} error={error} />
    </div>
  );
}
