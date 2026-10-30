import React, { useCallback, useEffect, useState } from "react";
import { Activity, RefreshCw, RotateCcw, Gauge, TrendingUp, Clock, Database } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DESTRUCTIVE_TEXT = "text-destructive";

type CacheEntry = {
  name: string;
  source: "db" | "env" | "none";
  has_value: boolean;
  stored_at: string;
  expires_at: string;
  ttl_remaining_ms: number;
  expired: boolean;
};

type PerName = {
  name: string;
  hits: number;
  misses: number;
  expirations: number;
  resolutions: number;
  last_source: "db" | "env" | "none" | null;
  last_resolved_at: string | null;
  last_duration_ms: number | null;
  hit_ratio: number;
};

type Snapshot = {
  isolate_started_at: string;
  uptime_ms: number;
  cache: { size: number; ttl_ms: number; entries: CacheEntry[] };
  counters: {
    resolutions: number;
    hits: number;
    misses: number;
    expirations: number;
    invalidations_single: number;
    invalidations_full: number;
    hit_ratio: number;
  };
  duration_ms: { samples: number; avg: number; p50: number; p95: number; p99: number; max: number };
  per_name: PerName[];
};

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m < 60) return `${m}m ${sec}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function fmtTs(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR");
}

function ratioTone(ratio: number): "ok" | "warn" | "error" {
  if (ratio >= 0.85) return "ok";
  if (ratio >= 0.5) return "warn";
  return "error";
}

function ratioClass(ratio: number): string {
  const tone = ratioTone(ratio);
  if (tone === "ok") return "text-green-600";
  if (tone === "warn") return "text-amber-600";
  return DESTRUCTIVE_TEXT;
}

function PerNameTable({ rows }: { rows: PerName[] }) {
  if (rows.length === 0) return <p className="text-xs text-muted-foreground">Nenhuma resolução registrada ainda. Atue na app para popular as métricas.</p>;
  const sorted = rows.slice().sort((left, right) => right.resolutions - left.resolutions);
  return (
    <div className="overflow-x-auto"><table className="w-full text-xs">
      <thead><tr className="border-b text-left text-muted-foreground"><th className="py-1.5 pr-3 font-medium">Credencial</th><th className="py-1.5 pr-3 font-medium">Origem</th><th className="py-1.5 pr-3 font-medium text-right">Hits</th><th className="py-1.5 pr-3 font-medium text-right">Misses</th><th className="py-1.5 pr-3 font-medium text-right">Hit ratio</th><th className="py-1.5 pr-3 font-medium text-right">Última (ms)</th><th className="py-1.5 font-medium text-right">Última resolução</th></tr></thead>
      <tbody>{sorted.map((row) => <tr key={row.name} className="border-b last:border-0 align-middle">
        <td className="py-1.5 pr-3 font-mono text-[11px] truncate max-w-[280px]">{row.name}</td><td className="py-1.5 pr-3"><SourceBadge source={row.last_source} /></td><td className="py-1.5 pr-3 text-right tabular-nums">{row.hits}</td><td className="py-1.5 pr-3 text-right tabular-nums">{row.misses}</td><td className="py-1.5 pr-3 text-right"><span className={ratioClass(row.hit_ratio)}>{Math.round(row.hit_ratio * 100)}%</span></td><td className="py-1.5 pr-3 text-right tabular-nums">{row.last_duration_ms ?? "—"}</td><td className="py-1.5 text-right text-muted-foreground">{fmtTs(row.last_resolved_at)}</td>
      </tr>)}</tbody>
    </table></div>
  );
}

function CacheEntries({ entries }: { entries: CacheEntry[] }) {
  if (entries.length === 0) return <p className="text-xs text-muted-foreground">Cache vazio.</p>;
  return <ul className="space-y-1 text-xs font-mono">{entries.map((entry) => <li key={entry.name} className="flex items-center justify-between gap-2 border-b pb-1 last:border-0">
    <span className="truncate flex items-center gap-2"><SourceBadge source={entry.source} /><span>{entry.name}</span>{!entry.has_value && <Badge variant="outline" className="text-[9px]">sem valor</Badge>}</span>
    <span className={`text-[10px] tabular-nums ${entry.expired ? DESTRUCTIVE_TEXT : "text-muted-foreground"}`}>{entry.expired ? "expirado" : `expira em ${fmtDuration(entry.ttl_remaining_ms)}`}</span>
  </li>)}</ul>;
}

function SnapshotDetails({ snapshot }: { snapshot: Snapshot }) {
  const ratioPct = Math.round(snapshot.counters.hit_ratio * 100);
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<TrendingUp className="h-4 w-4" />} label="Hit ratio" value={`${ratioPct}%`} hint={`${snapshot.counters.hits} hits / ${snapshot.counters.misses} misses`} tone={ratioTone(snapshot.counters.hit_ratio)} progress={ratioPct} />
        <Kpi icon={<Gauge className="h-4 w-4" />} label="Resoluções" value={String(snapshot.counters.resolutions)} hint={`uptime ${fmtDuration(snapshot.uptime_ms)}`} tone="neutral" />
        <Kpi icon={<Clock className="h-4 w-4" />} label="Latência p95" value={`${snapshot.duration_ms.p95} ms`} hint={`avg ${snapshot.duration_ms.avg} ms · p99 ${snapshot.duration_ms.p99} ms · max ${snapshot.duration_ms.max} ms`} tone={snapshot.duration_ms.p95 > 50 ? "warn" : "ok"} />
        <Kpi icon={<Database className="h-4 w-4" />} label="Entradas em cache" value={String(snapshot.cache.size)} hint={`${snapshot.counters.expirations} expirações · ${snapshot.counters.invalidations_single + snapshot.counters.invalidations_full} invalidações`} tone="neutral" />
      </div>
      <div><h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Por credencial ({snapshot.per_name.length})</h4><PerNameTable rows={snapshot.per_name} /></div>
      <div><h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Snapshot do cache ({snapshot.cache.size}) — TTL {Math.round(snapshot.cache.ttl_ms / 1000)}s</h4><CacheEntries entries={snapshot.cache.entries} /></div>
      <p className="text-[10px] text-muted-foreground">Isolate iniciado em {fmtTs(snapshot.isolate_started_at)} · amostras de latência: {snapshot.duration_ms.samples}</p>
    </>
  );
}

function PanelContent({ error, loading, snapshot }: { error: string | null; loading: boolean; snapshot: Snapshot | null }) {
  if (loading && !snapshot) return <Skeleton className="h-40 w-full" />;
  if (error) return <p className={`text-xs ${DESTRUCTIVE_TEXT}`}>Erro: {error}</p>;
  if (!snapshot) return null;
  return <SnapshotDetails snapshot={snapshot} />;
}

function useCredentialCacheMetrics() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: invErr } = await supabase.functions.invoke("secrets-manager", {
      body: { action: "cache_metrics" },
    });
    if (invErr) {
      setError(invErr.message);
    } else if (!data?.ok) {
      setError(data?.error?.message ?? "Falha ao carregar métricas.");
    } else {
      setSnapshot(data.metrics as Snapshot);
    }
    setLoading(false);
  }, []);

  const reset = useCallback(async () => {
    const { data, error: invErr } = await supabase.functions.invoke("secrets-manager", {
      body: { action: "reset_cache_metrics" },
    });
    if (invErr || !data?.ok) {
      toast.error(invErr?.message ?? data?.error?.message ?? "Falha ao reiniciar métricas");
      return;
    }
    toast.success("Métricas reiniciadas neste isolate");
    load();
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);
  return { error, load, loading, reset, snapshot };
}

export function CredentialCacheMetricsPanel() {
  const { error, load, loading, reset, snapshot } = useCredentialCacheMetrics();

  return (
    (<Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <Activity className="h-4.5 w-4.5 text-blue-600" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-base">Cache da SSOT — métricas</CardTitle>
              <CardDescription className="text-xs">
                Performance do <code className="text-[10px] px-1 py-0.5 rounded bg-muted">resolveCredential()</code> neste isolate (TTL{" "}
                {snapshot ? `${Math.round(snapshot.cache.ttl_ms / 1000)}s` : "—"}). Valores resetam ao reiniciar a edge function.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Button variant="ghost" size="sm" onClick={reset} disabled={loading}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Resetar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4"><PanelContent error={error} loading={loading} snapshot={snapshot} /></CardContent>
    </Card>)
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
  tone,
  progress,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  tone: "ok" | "warn" | "error" | "neutral";
  progress?: number;
}) {
  const toneCls =
    tone === "ok"
      ? "text-green-600"
      : tone === "warn"
        ? "text-amber-600"
        : tone === "error"
          ? "text-destructive"
          : "text-foreground";
  return (
    <div className="rounded-lg border p-3 space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className={toneCls}>{icon}</span>
        <span>{label}</span>
      </div>
      <div className={`text-2xl font-bold tabular-nums ${toneCls}`}>{value}</div>
      {progress !== undefined && <Progress value={progress} className="h-1" />}
      <div className="text-[10px] text-muted-foreground">{hint}</div>
    </div>
  );
}

function SourceBadge({ source }: { source: "db" | "env" | "none" | null }) {
  if (!source) {
    return <Badge variant="outline" className="text-[9px]">—</Badge>;
  }
  if (source === "db") {
    return <Badge className="text-[9px] bg-green-600 hover:bg-green-600">db</Badge>;
  }
  if (source === "env") {
    return (
      <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-600">
        env
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[9px] border-destructive/40 text-destructive">
      none
    </Badge>
  );
}
