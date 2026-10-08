import { useEffect, useState, useCallback } from "react";
import { Clock, RefreshCw, Zap, CheckCircle2, AlertCircle, Plus, Pencil, User as UserIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type SyncLogRow = {
  id: string;
  ran_at: string;
  status: string;
  trigger_op: string | null;
  triggered_by_secret_name: string | null;
  triggered_by_user_id: string | null;
  processed: number;
  created_count: number;
  updated_count: number;
  duration_ms: number | null;
  error_message: string | null;
  details: unknown;
};

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return "agora";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `há ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return `há ${d} d`;
}

function SyncRunHeader({ run }: { run: SyncLogRow }) {
  const ok = run.status === "ok";
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap rounded-lg border p-3 bg-muted/20">
      <div className="flex items-center gap-3">
        {ok ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" /> : <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />}
        <div>
          <div className="text-sm font-semibold">{new Date(run.ran_at).toLocaleString("pt-BR")} <span className="text-xs font-normal text-muted-foreground">({formatRelative(run.ran_at)})</span></div>
          <div className="text-[11px] text-muted-foreground font-mono">
            status={run.status}{run.trigger_op ? ` • op=${run.trigger_op}` : ""}{typeof run.duration_ms === "number" ? ` • ${run.duration_ms}ms` : ""}
          </div>
        </div>
      </div>
      <Badge variant="outline" className={ok ? "border-green-500/40 text-green-700 bg-green-500/5" : "border-amber-500/40 text-amber-700 bg-amber-500/5"}>{ok ? "ok" : run.status}</Badge>
    </div>
  );
}

function SyncKpis({ run }: { run: SyncLogRow }) {
  const duration = typeof run.duration_ms === "number" ? String(run.duration_ms) : "—";
  return (
    <div className="grid gap-2 md:grid-cols-4">
      <div className="rounded-lg border p-3"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Processadas</div><div className="text-2xl font-bold tabular-nums">{run.processed}</div><div className="text-[10px] text-muted-foreground">env_keys avaliadas</div></div>
      <div className="rounded-lg border p-3 bg-green-500/5 border-green-500/20"><div className="text-[11px] uppercase tracking-wide text-green-700 flex items-center gap-1"><Plus className="h-3 w-3" /> Criadas</div><div className="text-2xl font-bold tabular-nums text-green-700">{run.created_count}</div><div className="text-[10px] text-muted-foreground">novas linhas em external_connections</div></div>
      <div className="rounded-lg border p-3 bg-blue-500/5 border-blue-500/20"><div className="text-[11px] uppercase tracking-wide text-blue-700 flex items-center gap-1"><Pencil className="h-3 w-3" /> Atualizadas</div><div className="text-2xl font-bold tabular-nums text-blue-700">{run.updated_count}</div><div className="text-[10px] text-muted-foreground">linhas existentes alteradas</div></div>
      <div className="rounded-lg border p-3"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Duração</div><div className="text-2xl font-bold tabular-nums">{duration}<span className="text-sm font-normal text-muted-foreground ml-1">ms</span></div><div className="text-[10px] text-muted-foreground">tempo total da função</div></div>
    </div>
  );
}

function SyncTrigger({ run }: { run: SyncLogRow }) {
  return (
    <div className="rounded-lg border p-3 text-xs space-y-1">
      <div className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Disparo</div>
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-[10px] font-mono">{run.trigger_op ?? "—"}</Badge>
        {run.triggered_by_secret_name ? <span className="font-mono text-[11px]">secret = <code className="px-1 rounded bg-muted">{run.triggered_by_secret_name}</code></span> : <span className="text-muted-foreground italic">sem secret associado (manual ou cron)</span>}
        {run.triggered_by_user_id && <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><UserIcon className="h-3 w-3" /><code className="text-[10px]">{run.triggered_by_user_id.slice(0, 8)}…</code></span>}
      </div>
    </div>
  );
}

function SyncRunDetails({ run }: { run: SyncLogRow }) {
  return (
    <div className="space-y-3">
      <SyncRunHeader run={run} />
      <SyncKpis run={run} />
      <SyncTrigger run={run} />
      {run.error_message && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive"><div className="font-semibold mb-1">Erro registrado</div><code className="text-[11px] whitespace-pre-wrap break-words">{run.error_message}</code></div>}
    </div>
  );
}

function SyncContent({ error, last }: { error: string | null; last: SyncLogRow | null | undefined }) {
  if (last === undefined) {
    return <div className="grid gap-3 md:grid-cols-4">{[0, 1, 2, 3].map((index) => <Skeleton key={index} className="h-20 w-full" />)}</div>;
  }
  if (error) return <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">Erro ao ler logs: <code className="text-xs">{error}</code></div>;
  if (!last) return <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400">Nenhuma execução registrada ainda. Use <strong>Rodar agora</strong> ou edite uma credencial <code className="text-[11px]">EXTERNAL_*</code> para disparar o trigger.</div>;
  return <SyncRunDetails run={last} />;
}

function useLastSyncRun() {
  const [last, setLast] = useState<SyncLogRow | null | undefined>(undefined); // undefined = loading, null = nenhum
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const { data, error } = await supabase
      .from("external_connections_sync_log")
      .select("*")
      .order("ran_at", { ascending: false })
      .limit(1);
    if (error) {
      setError(error.message);
      setLast(null);
      return;
    }
    setLast(((data ?? [])[0] as SyncLogRow | undefined) ?? null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runManual = useCallback(async () => {
    setRunning(true);
    const { error } = await supabase.functions.invoke("external-connections-sync", { body: {} });
    if (error) {
      toast.error(`Falha ao executar sync: ${error.message}`);
    } else {
      toast.success("Sync executado");
    }
    await load();
    setRunning(false);
  }, [load]);

  const loading = last === undefined;
  return { error, last, load, loading, runManual, running };
}

function LastSyncHeader({ load, loading, runManual, running }: Pick<ReturnType<typeof useLastSyncRun>, "load" | "loading" | "runManual" | "running">) {
  return (
    <CardHeader>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3"><div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Clock className="h-4 w-4 text-primary" aria-hidden="true" /></div><div><CardTitle className="text-base">Última execução do sync</CardTitle><CardDescription>Trigger <code className="text-[10px] px-1 rounded bg-muted">sync_external_connections_from_credentials</code> — última corrida registrada em <code className="text-[10px] px-1 rounded bg-muted">external_connections_sync_log</code>.</CardDescription></div></div>
        <div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />Atualizar</Button><Button size="sm" onClick={runManual} disabled={running}><Zap className={`h-4 w-4 mr-2 ${running ? "animate-pulse" : ""}`} />{running ? "Executando…" : "Rodar agora"}</Button></div>
      </div>
    </CardHeader>
  );
}

export function LastSyncRunPanel() {
  const { error, last, load, loading, runManual, running } = useLastSyncRun();
  return (
    <Card>
      <LastSyncHeader load={load} loading={loading} runManual={runManual} running={running} />
      <CardContent><SyncContent error={error} last={last} /></CardContent>
    </Card>
  );
}
