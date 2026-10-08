import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Workflow } from "lucide-react";
import { ConnectionStatusBadge } from "./ConnectionStatusBadge";
import { SecretField } from "./SecretField";
import { useSecretsManager } from "@/hooks/useSecretsManager";
import { useConnectionTester } from "@/hooks/useConnectionTester";
import { ConnectionTimelineDrawer } from "./ConnectionTimelineDrawer";
import { LastTestLine, type LastTestInfo } from "./LastTestLine";
import { ConnectionTestHistoryPanel } from "./ConnectionTestHistoryPanel";
import { RetestButton } from "./RetestButton";
import { ConnectionTestDetailsDialog } from "./ConnectionTestDetailsDialog";
import { RefreshFromDbButton } from "./RefreshFromDbButton";
import { hasSuspiciousLength } from "./secretValidators";
import { TestProgressIndicator, type TestProgressPhase } from "./TestProgressIndicator";
import { RetestCooldownSelector } from "./RetestCooldownSelector";

function n8nStatus(configured: boolean, last: LastTestInfo | null): "active" | "error" | "unconfigured" {
  if (!configured) return "unconfigured";
  if (last?.ok === false) return "error";
  return "active";
}

function testButtonTitle(configured: boolean, looksValid: boolean): string {
  if (!configured) return "Configure a Base URL primeiro";
  if (!looksValid) return "Credenciais com formato suspeito (comprimento curto) — re-salve antes de testar";
  return "Testar /healthz";
}

function progressMessage(last: LastTestInfo | null): string | null {
  if (!last) return null;
  if (last.ok) return `HTTP ${last.status ?? 200}`;
  return last.message ?? null;
}

function retestDisabledReason(configured: boolean): string {
  if (!configured) return "Configure a Base URL primeiro";
  return "Credenciais com formato suspeito — re-salve antes de testar";
}

interface N8nCardProps {
  status: "active" | "error" | "unconfigured"; base: ReturnType<typeof useSecretsManager>["secrets"][number] | undefined; apiKey: ReturnType<typeof useSecretsManager>["secrets"][number] | undefined; list: () => void; isTesting: boolean; credsOk: boolean; credsLooksValid: boolean; onTest: () => Promise<void>; timelineOpen: boolean; setTimelineOpen: (open: boolean) => void; phase: TestProgressPhase; setPhase: (phase: TestProgressPhase) => void; last: LastTestInfo | null; detailsDialogOpen: boolean; setDetailsDialogOpen: (open: boolean) => void; historyKey: number; pendingStartedAt: string | null;
}

function N8nConnectionCard(props: N8nCardProps) {
  return <Card data-retest-scope tabIndex={0} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"><CardHeader><div className="flex items-start justify-between"><div className="flex items-center gap-2"><Workflow className="h-5 w-5 text-primary" /><CardTitle>n8n</CardTitle></div><ConnectionStatusBadge status={props.status} /></div><CardDescription>Conecte uma instância n8n para automatizar workflows a partir de eventos do sistema.</CardDescription></CardHeader><CardContent className="space-y-4 max-w-2xl"><SecretField label="Base URL" secretName="N8N_BASE_URL" status={props.base} onSaved={props.list} connectionId="n8n" helperText="Ex: https://n8n.suaempresa.com" /><SecretField label="API Key" secretName="N8N_API_KEY" status={props.apiKey} onSaved={props.list} connectionId="n8n" /><div className="pt-2 flex flex-wrap gap-2"><Button size="sm" disabled={props.isTesting || !props.credsLooksValid} title={testButtonTitle(props.credsOk, props.credsLooksValid)} onClick={() => void props.onTest()}>{props.isTesting ? "Testando…" : "Testar /healthz"}</Button><ConnectionTimelineDrawer type="n8n" label="n8n" open={props.timelineOpen} onOpenChange={props.setTimelineOpen} /><RefreshFromDbButton onRefreshed={() => void props.list()} /><RetestCooldownSelector className="ml-auto" /></div><TestProgressIndicator phase={props.phase} latencyMs={props.last?.latency_ms ?? null} message={progressMessage(props.last)} onDismiss={() => props.setPhase("idle")} /><LastTestLine info={props.last} autoFocusOnFailure onClick={props.last?.tested_at ? () => props.setDetailsDialogOpen(true) : undefined} action={<RetestButton onRetest={props.onTest} disabled={!props.credsLooksValid} cooldownKey="n8n" disabledReason={retestDisabledReason(props.credsOk)} />} /><ConnectionTestHistoryPanel type="n8n" label="n8n" refreshKey={props.historyKey} pendingTest={props.pendingStartedAt ? { startedAt: props.pendingStartedAt } : null} /><ConnectionTestDetailsDialog open={props.detailsDialogOpen} onOpenChange={props.setDetailsDialogOpen} connectionType="n8n" connectionLabel="n8n" onViewFullHistory={() => props.setTimelineOpen(true)} /></CardContent></Card>;
}

export function N8nTab() {
  const { secrets, list } = useSecretsManager();
  const { test, isTesting, fetchLastTest } = useConnectionTester();
  const [last, setLast] = useState<LastTestInfo | null>(null);
  const [historyKey, setHistoryKey] = useState(0);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [phase, setPhase] = useState<TestProgressPhase>("idle");
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [pendingStartedAt, setPendingStartedAt] = useState<string | null>(null);

  useEffect(() => { list(); }, [list]);
  const hydrate = useCallback(async () => {
    const r = await fetchLastTest("n8n");
    setLast(r ? { ok: r.ok, tested_at: r.tested_at, latency_ms: r.latency_ms, message: r.message } : null);
  }, [fetchLastTest]);
  useEffect(() => { hydrate(); }, [hydrate]);

  const get = (n: string) => secrets.find((s) => s.name === n);
  const base = get("N8N_BASE_URL");
  const credsOk = (!!base?.has_value);
  const suspicious = hasSuspiciousLength(secrets, ["N8N_BASE_URL", "N8N_API_KEY"]);
  const credsLooksValid = (credsOk && !suspicious);
  const status = n8nStatus(credsOk, last);

  const onTest = async () => {
    setPhase("running");
    setPendingStartedAt(new Date().toISOString());
    const r = await test("n8n");
    setLast({ ok: r.ok, tested_at: r.tested_at ?? new Date().toISOString(), latency_ms: r.latency_ms, message: r.error ?? r.message, status: r.status, error_kind: r.error_kind ?? null });
    setHistoryKey((k) => k + 1);
    setPendingStartedAt(null);
    setPhase(r.ok ? "completed" : "failed");
  };

  return (
    <div className="space-y-4">
      <N8nConnectionCard status={status} base={base} apiKey={get("N8N_API_KEY")} list={list} isTesting={isTesting} credsOk={credsOk} credsLooksValid={credsLooksValid} onTest={onTest} timelineOpen={timelineOpen} setTimelineOpen={setTimelineOpen} phase={phase} setPhase={setPhase} last={last} detailsDialogOpen={detailsDialogOpen} setDetailsDialogOpen={setDetailsDialogOpen} historyKey={historyKey} pendingStartedAt={pendingStartedAt} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workflows registrados</CardTitle>
          <CardDescription>
            Cada workflow vira automaticamente um destino na aba "Webhooks → Saída".
            Crie um webhook lá com a URL do trigger n8n e selecione os eventos desejados.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
