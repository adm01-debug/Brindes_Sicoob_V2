/**
 * IntegrationsHealthCard — Onda 9
 * Card read-only no topo de /admin/conexoes com auto-refresh 60s.
 * Mostra saúde agregada de webhooks, conexões e MCP keys.
 */
import { useMemo, useState, type Dispatch, type ElementType, type ReactNode, type SetStateAction } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity,
  Webhook,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  Clock,
  RefreshCw,
  ShieldCheck,
  Loader2,
  Bot,
  Database,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useCredentialsSourceFilter, resolveSource } from "./CredentialsSourceFilterContext";
import type { SecretStatus } from "@/hooks/useSecretsManager";

interface HealthData {
  activeWebhooks: number;
  totalWebhooks: number;
  successRate24h: number | null;
  totalDeliveries24h: number;
  lastSuccessAt: string | null;
  failingConnections: number;
  mcpKeysUsed24h: number;
  staleSecrets: number; // secrets sem rotação há >90 dias (ou nunca rotacionados, com webhooks ativos)
  autoDisabledWebhooks: number;
  lastAutoTestAt: string | null;
  autoTestOkLastHour: number;
  autoTestFailLastHour: number;
}

const countOrZero = (count: number | null): number => count ?? 0;

function deliveryStats(deliveries: Array<{ success: boolean }> | null) {
  const rows = deliveries ?? [];
  const total = rows.length;
  const success = rows.filter((delivery) => delivery.success).length;
  return { total, rate: total > 0 ? (success / total) * 100 : null };
}

function countStaleSecrets(
  rotations: Array<{ secret_name: string; rotated_at: string }> | null,
  ninetyDaysAgo: string,
): number {
  const lastBySecret = new Map<string, string>();
  for (const rotation of rotations ?? []) {
    if (!lastBySecret.has(rotation.secret_name)) {
      lastBySecret.set(rotation.secret_name, rotation.rotated_at);
    }
  }
  return Array.from(lastBySecret.values()).filter((rotatedAt) => rotatedAt < ninetyDaysAgo).length;
}

function autoTestStats(rows: Array<{ success: boolean }> | null) {
  const tests = rows ?? [];
  return {
    successful: tests.filter((test) => test.success).length,
    failed: tests.filter((test) => !test.success).length,
  };
}

async function fetchPrimaryHealthSignals(since24h: string) {
  return Promise.all([
    supabase.from("outbound_webhooks").select("id", { count: "exact", head: true }).eq("active", true),
    supabase.from("outbound_webhooks").select("id", { count: "exact", head: true }),
    supabase.from("webhook_deliveries").select("success").gte("delivered_at", since24h),
    supabase.from("webhook_deliveries").select("delivered_at").eq("success", true).order("delivered_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("external_connections").select("id", { count: "exact", head: true }).eq("last_test_ok", false),
    supabase.from("mcp_api_keys").select("id", { count: "exact", head: true }).gte("last_used_at", since24h).is("revoked_at", null),
    supabase.from("secret_rotation_log").select("secret_name, rotated_at").order("rotated_at", { ascending: false }),
    supabase.from("outbound_webhooks").select("id", { count: "exact", head: true }).not("auto_disabled_at", "is", null),
  ]);
}

async function fetchAutoTestSignals(sinceLastHour: string) {
  return Promise.all([
    supabase.from("connection_test_history").select("success").eq("triggered_by", "cron").gte("tested_at", sinceLastHour),
    supabase.from("connection_test_history").select("tested_at").eq("triggered_by", "cron").order("tested_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
}

async function fetchHealth(): Promise<HealthData> {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const sinceLastHour = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: activeWebhooks },
    { count: totalWebhooks },
    { data: deliveries24h },
    { data: lastSuccess },
    { count: failingConnections },
    { count: mcpKeysUsed24h },
    { data: rotations },
    { count: autoDisabledWebhooks },
  ] = await fetchPrimaryHealthSignals(since24h);

  // Auto-test stats (cron-triggered runs in the last hour + most recent timestamp)
  const [{ data: autoTestRecent }, { data: lastAutoTest }] = await fetchAutoTestSignals(sinceLastHour);

  const { total, rate } = deliveryStats(deliveries24h);
  const { successful, failed } = autoTestStats(autoTestRecent);

  return {
    activeWebhooks: countOrZero(activeWebhooks),
    totalWebhooks: countOrZero(totalWebhooks),
    successRate24h: rate,
    totalDeliveries24h: total,
    lastSuccessAt: lastSuccess?.delivered_at ?? null,
    failingConnections: countOrZero(failingConnections),
    mcpKeysUsed24h: countOrZero(mcpKeysUsed24h),
    staleSecrets: countStaleSecrets(rotations, ninetyDaysAgo),
    autoDisabledWebhooks: countOrZero(autoDisabledWebhooks),
    lastAutoTestAt: lastAutoTest?.tested_at ?? null,
    autoTestOkLastHour: successful,
    autoTestFailLastHour: failed,
  };
}

function StatusBadge({
  tone,
  children,
}: {
  tone: "success" | "warning" | "destructive" | "muted";
  children: ReactNode;
}) {
  const cls = {
    success: "bg-success/10 text-success border-success/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    destructive: "bg-destructive/10 text-destructive border-destructive/20",
    muted: "bg-muted text-muted-foreground border-border",
  }[tone];
  return (
    <Badge variant="outline" className={cn("font-medium", cls)}>
      {children}
    </Badge>
  );
}

interface MetricProps {
  icon: ElementType;
  label: string;
  value: string;
  badge?: ReactNode;
  tone?: "default" | "success" | "warning" | "destructive";
}

function Metric({ icon, label, value, badge, tone = "default" }: MetricProps) {
  const IconComponent = icon;
  const iconCls = {
    default: "text-muted-foreground",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
  }[tone];

  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-muted/30 border border-border/50">
      <div className="flex items-center justify-between">
        <IconComponent className={cn("h-4 w-4", iconCls)} aria-hidden="true" />
        {badge}
      </div>
      <div>
        <p className="text-xl font-bold leading-tight">{value}</p>
        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function SourceCountChip({
  icon,
  tone,
  count,
  label,
  onClick,
  emphasize,
}: {
  icon: ElementType;
  tone: "success" | "warning" | "muted";
  count: number;
  label: string;
  onClick: () => void;
  emphasize?: boolean;
}) {
  const IconComponent = icon;
  const cls = {
    success: "border-success/30 bg-success/10 text-success hover:bg-success/15",
    warning: "border-warning/40 bg-warning/10 text-warning hover:bg-warning/15",
    muted: "border-border bg-muted text-muted-foreground hover:bg-muted/70",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors tabular-nums",
        cls,
        emphasize && "ring-1 ring-warning/40",
      )}
    >
      <IconComponent className="h-3 w-3" />
      <span className="font-semibold">{count}</span> {label}
    </button>
  );
}

interface SourceCounts {
  db: number;
  env: number;
  none: number;
  total: number;
}

function countCredentialSources(secrets: SecretStatus[]): SourceCounts {
  const counts = { db: 0, env: 0, none: 0, total: secrets.length };
  for (const secret of secrets) {
    const source = resolveSource(secret);
    if (source === "db") counts.db += 1;
    else if (source === "env") counts.env += 1;
    else counts.none += 1;
  }
  return counts;
}

function notifyAuditResult(score: number, message: string) {
  if (score >= 8) toast.success(message);
  else if (score >= 5) toast.warning(message);
  else toast.error(message);
}

async function runAudit(setAuditing: Dispatch<SetStateAction<boolean>>) {
  setAuditing(true);
  try {
    const { data: report, error } = await supabase.functions.invoke("connections-hub-audit");
    if (error) throw error;
    const score = report?.score ?? 0;
    const message = `Auditoria: ${score}/10 (${report?.passed ?? 0}/${report?.total ?? 0} checks)`;
    notifyAuditResult(score, message);
  } catch (error) {
    toast.error(`Falha na auditoria: ${(error as Error).message}`);
  } finally {
    setAuditing(false);
  }
}

function healthTone(rate: number | null | undefined): MetricProps["tone"] {
  if (rate === null || rate === undefined) return "default";
  if (rate >= 95) return "success";
  if (rate >= 70) return "warning";
  return "destructive";
}

function HealthHeader({
  auditing,
  isFetching,
  onAudit,
  onRefresh,
}: {
  auditing: boolean;
  isFetching: boolean;
  onAudit: () => void;
  onRefresh: () => void;
}) {
  return (
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
          Saúde das Integrações
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onAudit} disabled={auditing} className="h-7 text-xs">
            {auditing ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
            Rodar auditoria
          </Button>
          <button
            type="button"
            onClick={onRefresh}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
            aria-label="Atualizar saúde das integrações"
          >
            <RefreshCw className={cn("h-3 w-3", isFetching && "animate-spin")} />
            {isFetching ? "Atualizando…" : "Auto 60s"}
          </button>
        </div>
      </div>
    </CardHeader>
  );
}

function HealthAlerts({ data }: { data: HealthData | undefined }) {
  if (!data || (data.staleSecrets === 0 && data.autoDisabledWebhooks === 0)) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {data.staleSecrets > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-warning/10 border border-warning/20 text-xs text-warning">
          <AlertTriangle className="h-3 w-3" />
          {data.staleSecrets} {data.staleSecrets === 1 ? "credencial" : "credenciais"} sem rotação há &gt;90 dias
        </div>
      )}
      {data.autoDisabledWebhooks > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-destructive/10 border border-destructive/20 text-xs text-destructive">
          <AlertTriangle className="h-3 w-3" />
          {data.autoDisabledWebhooks} webhook(s) desativados pelo circuit breaker
        </div>
      )}
    </div>
  );
}

function LoadingMetrics() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {Array.from({ length: 5 }, (_, index) => <div key={index} className="h-20 rounded-lg bg-muted/30 animate-pulse" />)}
    </div>
  );
}

function SuccessBadge({ tone }: { tone: MetricProps["tone"] }) {
  if (tone === "success") return <StatusBadge tone="success">OK</StatusBadge>;
  if (tone === "warning") return <StatusBadge tone="warning">Atenção</StatusBadge>;
  return <StatusBadge tone="destructive">Crítico</StatusBadge>;
}

function HealthMetrics({ data, isLoading }: { data: HealthData | undefined; isLoading: boolean }) {
  if (isLoading || !data) return <LoadingMetrics />;
  const successTone = healthTone(data.successRate24h);
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <Metric icon={Webhook} label="Webhooks ativos" value={`${data.activeWebhooks}/${data.totalWebhooks}`} tone={data.activeWebhooks > 0 ? "success" : "default"} />
      <Metric
        icon={CheckCircle2}
        label={`Sucesso 24h (${data.totalDeliveries24h} envios)`}
        value={data.successRate24h === null ? "—" : `${data.successRate24h.toFixed(1)}%`}
        tone={successTone}
        badge={data.successRate24h === null ? null : <SuccessBadge tone={successTone} />}
      />
      <Metric
        icon={Clock}
        label="Última entrega bem-sucedida"
        value={data.lastSuccessAt ? formatDistanceToNow(new Date(data.lastSuccessAt), { locale: ptBR, addSuffix: true }) : "Nunca"}
      />
      <Metric
        icon={AlertTriangle}
        label="Conexões com falha"
        value={String(data.failingConnections)}
        tone={data.failingConnections > 0 ? "destructive" : "success"}
        badge={data.failingConnections > 0 ? <StatusBadge tone="destructive">Verificar</StatusBadge> : <StatusBadge tone="success">OK</StatusBadge>}
      />
      <Metric icon={KeyRound} label="Chaves MCP usadas (24h)" value={String(data.mcpKeysUsed24h)} tone={data.mcpKeysUsed24h > 0 ? "success" : "default"} />
    </div>
  );
}

function CredentialSourceSummary({ counts, setFilter }: { counts: SourceCounts; setFilter: (source: "db" | "env" | "none") => void }) {
  if (counts.total === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] border-t border-border/40">
      <span className="text-muted-foreground">Origem das credenciais:</span>
      <SourceCountChip icon={Database} tone="success" count={counts.db} label="no banco" onClick={() => setFilter("db")} />
      <SourceCountChip icon={AlertTriangle} tone="warning" count={counts.env} label="ainda em ENV" onClick={() => setFilter("env")} emphasize={counts.env > 0} />
      <SourceCountChip icon={Minus} tone="muted" count={counts.none} label={counts.none === 1 ? "vazia" : "vazias"} onClick={() => setFilter("none")} />
      {counts.env > 0 && <span className="text-warning ml-1">↳ recomendado migrar para o banco</span>}
    </div>
  );
}

function AutoTestSummary({ data }: { data: HealthData | undefined }) {
  if (!data) return null;
  const hasRecentTests = data.autoTestOkLastHour + data.autoTestFailLastHour > 0;
  return (
    <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground border-t border-border/40">
      <span className="inline-flex items-center gap-1.5">
        <Bot className="h-3 w-3" aria-hidden="true" />
        Última auto-verificação:{" "}
        <span className="text-foreground tabular-nums">
          {data.lastAutoTestAt ? formatDistanceToNow(new Date(data.lastAutoTestAt), { locale: ptBR, addSuffix: true }) : "aguardando 1ª execução"}
        </span>
      </span>
      {hasRecentTests && (
        <span className="tabular-nums">
          Última hora: <span className="text-success font-medium">{data.autoTestOkLastHour} OK</span>
          {data.autoTestFailLastHour > 0 && <> · <span className="text-destructive font-medium">{data.autoTestFailLastHour} falha{data.autoTestFailLastHour === 1 ? "" : "s"}</span></>}
        </span>
      )}
    </div>
  );
}

export function IntegrationsHealthCard({ secrets = [] }: { secrets?: SecretStatus[] }) {
  const [auditing, setAuditing] = useState(false);
  const { setFilter } = useCredentialsSourceFilter();
  const sourceCounts = useMemo(() => countCredentialSources(secrets), [secrets]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["integrations-health"],
    queryFn: fetchHealth,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  return (
    <Card className="border-primary/10">
      <HealthHeader auditing={auditing} isFetching={isFetching} onAudit={() => void runAudit(setAuditing)} onRefresh={() => void refetch()} />
      <CardContent className="space-y-3">
        <HealthAlerts data={data} />
        <HealthMetrics data={data} isLoading={isLoading} />
        <CredentialSourceSummary counts={sourceCounts} setFilter={setFilter} />
        <AutoTestSummary data={data} />
      </CardContent>
    </Card>
  );
}
