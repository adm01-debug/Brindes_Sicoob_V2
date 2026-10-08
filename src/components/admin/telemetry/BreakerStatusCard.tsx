/**
 * Card "Circuit Breaker — crm-db-bridge"
 *
 * Faz poll do endpoint `?op=breaker_status` a cada 15s e mostra:
 *   - state (CLOSED/OPEN/HALF_OPEN) com cor semântica
 *   - failures (na janela móvel) vs failureThreshold
 *   - openedAt (quando abriu) + countdown até willResetAt
 *   - configuração do breaker (window/openDuration)
 *
 * Bypass total no servidor: o endpoint funciona mesmo com circuito aberto,
 * o que é exatamente o que torna este card útil para diagnóstico em outage.
 */
import { isNullish } from "@/components/admin/utils/nullish";
import { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ShieldAlert, ShieldQuestion, RefreshCw } from 'lucide-react';
import { getSupabaseFunctionUrl, supabasePublishableKey } from '@/integrations/supabase/client';

type BreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN' | 'UNKNOWN';

interface BreakerStatusResponse {
  ok: boolean;
  ts: number;
  state: BreakerState;
  failures: number;
  openedAt: number;
  willResetAt: number | null;
  breaker: {
    name: string;
    state: BreakerState;
    failures: number;
    failureThreshold: number;
    windowMs: number;
    openDurationMs: number;
    openedAt: number;
    willResetAt: number | null;
  } | null;
  all: Array<BreakerStatusResponse['breaker']>;
}

const functionUrl = getSupabaseFunctionUrl('crm-db-bridge', 'op=breaker_status');
const POLL_MS = 15_000;

function fmtMs(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  return `${(ms / 60_000).toFixed(1)} min`;
}

function fmtCountdown(ms: number): string {
  if (ms <= 0) return '—';
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function stateBadge(state: BreakerState) {
  if (state === 'CLOSED') {
    return (
      <Badge className="bg-success/15 text-success border-success/30 text-[10px]">
        <ShieldCheck className="h-3 w-3 mr-1" />CLOSED
      </Badge>
    );
  }
  if (state === 'OPEN') {
    return (
      <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px]">
        <ShieldAlert className="h-3 w-3 mr-1" />OPEN
      </Badge>
    );
  }
  if (state === 'HALF_OPEN') {
    return (
      <Badge className="bg-warning/15 text-warning border-warning/30 text-[10px]">
        <ShieldQuestion className="h-3 w-3 mr-1" />HALF_OPEN
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-[10px]">
      <ShieldQuestion className="h-3 w-3 mr-1" />{state}
    </Badge>
  );
}

function FailureTile({ snapshot }: { snapshot: BreakerStatusResponse }) {
  const breaker = snapshot.breaker;
  let color = '';
  if (breaker && snapshot.failures >= breaker.failureThreshold) color = 'text-destructive';
  else if (snapshot.failures > 0) color = 'text-warning';
  return <div className="p-3 rounded-lg border border-border/50 bg-muted/30"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Falhas (janela)</p><p className={`font-display text-2xl font-bold tabular-nums ${color}`}>{snapshot.failures}{breaker && <span className="text-sm text-muted-foreground font-normal"> / {breaker.failureThreshold}</span>}</p><p className="text-[10px] text-muted-foreground mt-0.5">{breaker ? `janela ${fmtMs(breaker.windowMs)}` : '—'}</p></div>;
}

function OpenedTile({ openedAt }: { openedAt: number }) {
  const opened = openedAt > 0;
  return <div className="p-3 rounded-lg border border-border/50 bg-muted/30"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Aberto desde</p><p className="font-display text-2xl font-bold tabular-nums">{opened ? new Date(openedAt).toLocaleTimeString() : '—'}</p><p className="text-[10px] text-muted-foreground mt-0.5">{opened ? 'última transição p/ OPEN' : 'nunca abriu nesta vida'}</p></div>;
}

function ResetTile({ countdown, resetAt }: { countdown: number | null; resetAt: number | null }) {
  const active = !isNullish(countdown) && countdown > 0;
  return <div className="p-3 rounded-lg border border-border/50 bg-muted/30"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Reset em</p><p className={`font-display text-2xl font-bold tabular-nums ${active ? 'text-warning' : ''}`}>{isNullish(countdown) ? '—' : fmtCountdown(countdown)}</p><p className="text-[10px] text-muted-foreground mt-0.5">{resetAt ? `→ ${new Date(resetAt).toLocaleTimeString()}` : 'circuito não está aberto'}</p></div>;
}

function SnapshotView({ countdown, snapshot }: { countdown: number | null; snapshot: BreakerStatusResponse }) {
  return <><div className="grid grid-cols-2 md:grid-cols-4 gap-3">
    <div className="p-3 rounded-lg border border-border/50 bg-muted/30"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Estado</p><p className="font-display text-2xl font-bold tabular-nums">{snapshot.state}</p><p className="text-[10px] text-muted-foreground mt-0.5">isolate atual</p></div>
    <FailureTile snapshot={snapshot} /><OpenedTile openedAt={snapshot.openedAt} /><ResetTile countdown={countdown} resetAt={snapshot.willResetAt} />
  </div>{snapshot.breaker && <p className="text-[10px] text-muted-foreground mt-3">Config: threshold {snapshot.breaker.failureThreshold} falhas em {fmtMs(snapshot.breaker.windowMs)} → OPEN por {fmtMs(snapshot.breaker.openDurationMs)} · atualizado {new Date(snapshot.ts).toLocaleTimeString()}</p>}</>;
}

function BreakerContent({ countdown, error, loading, snapshot }: {
  countdown: number | null; error: string | null; loading: boolean; snapshot: BreakerStatusResponse | null;
}) {
  return <CardContent>{error && <div className="mb-3 p-2 rounded border border-destructive/30 bg-destructive/5 text-xs text-destructive">Erro ao consultar breaker: {error}</div>}{snapshot ? <SnapshotView countdown={countdown} snapshot={snapshot} /> : <div className="text-center py-6 text-sm text-muted-foreground">{loading ? 'Carregando…' : 'Sem dados.'}</div>}</CardContent>;
}

function useBreakerStatus() {
  const [snap, setSnap] = useState<BreakerStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!supabasePublishableKey) {
        throw new Error('Configuração do backend indisponível para diagnóstico.');
      }

      const res = await fetch(functionUrl, {
        method: 'GET',
        headers: { apikey: supabasePublishableKey },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as BreakerStatusResponse;
      setSnap(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, POLL_MS);
    return () => clearInterval(id);
  }, [fetchStatus]);

  // Tick local (1s) só para atualizar o countdown sem refetch.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const countdown = useMemo(() => {
    if (!snap?.willResetAt) return null;
    return Math.max(0, snap.willResetAt - now);
  }, [snap, now]);
  return { countdown, error, fetchStatus, loading, snap };
}

export function BreakerStatusCard() {
  const { countdown, error, fetchStatus, loading, snap } = useBreakerStatus();

  return (
    <Card>
      {(<CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          Circuit Breaker — <span className="font-mono text-sm">crm-db-bridge</span>
          {snap && stateBadge(snap.state)}
          <Badge variant="secondary" className="text-[10px]">poll 15s</Badge>
        </CardTitle>
        <Button variant="outline" size="sm" onClick={fetchStatus} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </CardHeader>)}
      <BreakerContent countdown={countdown} error={error} loading={loading} snapshot={snap} />
    </Card>
  );
}

export default BreakerStatusCard;
