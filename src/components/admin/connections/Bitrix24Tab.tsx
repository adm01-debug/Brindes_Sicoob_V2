import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase } from "lucide-react";
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
import { hasSuspiciousLength, getPreflightIssues } from "./secretValidators";
import { ConnectionPreflightAlert } from "./ConnectionPreflightAlert";
import { TestProgressIndicator, type TestProgressPhase } from "./TestProgressIndicator";
import { RetestCooldownSelector } from "./RetestCooldownSelector";

function connectionStatus(configured: boolean, last: LastTestInfo | null): "active" | "error" | "unconfigured" {
  if (!configured) return "unconfigured";
  if (last?.ok === false) return "error";
  return "active";
}

function testTitle(issueCount: number, configured: boolean, looksValid: boolean): string {
  if (issueCount > 0) return "Corrija o campo acima antes de testar";
  if (!configured) return "Configure o Webhook URL primeiro";
  if (!looksValid) return "Webhook com formato suspeito (comprimento curto) — re-salve antes de testar";
  return "Testar conexão";
}

function retestReason(issueCount: number, configured: boolean): string {
  if (issueCount > 0) return "Corrija os campos sinalizados acima antes de testar";
  if (!configured) return "Configure o Webhook URL primeiro";
  return "Webhook com formato suspeito — re-salve antes de testar";
}

function progressMessage(last: LastTestInfo | null): string | null {
  if (!last) return null;
  if (last.ok) return `HTTP ${last.status ?? 200}`;
  return last.message ?? null;
}

function credentialsLookValid(configured: boolean, suspicious: boolean): boolean {
  return configured && !suspicious;
}

function canRunTest(looksValid: boolean, issueCount: number): boolean {
  return looksValid && issueCount === 0;
}

interface BitrixCardProps {
  status: "active" | "error" | "unconfigured"; wh: ReturnType<typeof useSecretsManager>["secrets"][number] | undefined; get: (name: string) => ReturnType<typeof useSecretsManager>["secrets"][number] | undefined; list: () => void; issues: ReturnType<typeof getPreflightIssues>; isTesting: boolean; canTest: boolean; credsOk: boolean; credsLooksValid: boolean; onTest: () => Promise<void>; timelineOpen: boolean; setTimelineOpen: (open: boolean) => void; phase: TestProgressPhase; setPhase: (phase: TestProgressPhase) => void; last: LastTestInfo | null; setDetailsDialogOpen: (open: boolean) => void; historyKey: number; pendingStartedAt: string | null; detailsDialogOpen: boolean;
}

function BitrixCard(props: BitrixCardProps) {
  return <Card data-retest-scope tabIndex={0} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"><CardHeader><div className="flex items-start justify-between"><div className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary" /><CardTitle>Bitrix24</CardTitle></div><ConnectionStatusBadge status={props.status} /></div><CardDescription>Sincronização automática de orçamentos e contatos com o Bitrix24.</CardDescription></CardHeader><CardContent className="space-y-4 max-w-2xl"><SecretField label="Webhook URL completa" secretName="BITRIX24_WEBHOOK_URL" status={props.wh} onSaved={props.list} connectionId="bitrix24" helperText="Ex: https://seudominio.bitrix24.com.br/rest/1/abc123xyz/" /><SecretField label="Domínio Bitrix24" secretName="BITRIX24_DOMAIN" status={props.get("BITRIX24_DOMAIN")} onSaved={props.list} connectionId="bitrix24" /><SecretField label="User ID" secretName="BITRIX24_USER_ID" status={props.get("BITRIX24_USER_ID")} onSaved={props.list} connectionId="bitrix24" /><SecretField label="Token" secretName="BITRIX24_TOKEN" status={props.get("BITRIX24_TOKEN")} onSaved={props.list} connectionId="bitrix24" /><ConnectionPreflightAlert issues={props.issues} /><div className="pt-2 flex flex-wrap gap-2"><Button size="sm" disabled={props.isTesting || !props.canTest} title={testTitle(props.issues.length, props.credsOk, props.credsLooksValid)} onClick={() => void props.onTest()}>{props.isTesting ? "Testando…" : "Testar conexão (crm.contact.fields)"}</Button><ConnectionTimelineDrawer type="bitrix24" label="Bitrix24" open={props.timelineOpen} onOpenChange={props.setTimelineOpen} /><RefreshFromDbButton onRefreshed={() => void props.list()} /><RetestCooldownSelector className="ml-auto" /></div><TestProgressIndicator phase={props.phase} latencyMs={props.last?.latency_ms ?? null} message={progressMessage(props.last)} onDismiss={() => props.setPhase("idle")} /><LastTestLine info={props.last} autoFocusOnFailure onClick={props.last?.tested_at ? () => props.setDetailsDialogOpen(true) : undefined} action={<RetestButton onRetest={props.onTest} disabled={!props.canTest} cooldownKey="bitrix24" disabledReason={retestReason(props.issues.length, props.credsOk)} />} /><ConnectionTestHistoryPanel type="bitrix24" label="Bitrix24" refreshKey={props.historyKey} pendingTest={props.pendingStartedAt ? { startedAt: props.pendingStartedAt } : null} /><ConnectionTestDetailsDialog open={props.detailsDialogOpen} onOpenChange={props.setDetailsDialogOpen} connectionType="bitrix24" connectionLabel="Bitrix24" onViewFullHistory={() => props.setTimelineOpen(true)} /></CardContent></Card>;
}

export function Bitrix24Tab() {
  const { secrets, list } = useSecretsManager();
  const { test, isTesting, fetchLastTest } = useConnectionTester();
  const [last, setLast] = useState<LastTestInfo | null>(null);
  const [historyKey, setHistoryKey] = useState(0);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [phase, setPhase] = useState<TestProgressPhase>("idle");
  const [pendingStartedAt, setPendingStartedAt] = useState<string | null>(null);
  const [timelineOpen, setTimelineOpen] = useState(false);

  useEffect(() => { list(); }, [list]);

  const hydrate = useCallback(async () => {
    const r = await fetchLastTest("bitrix24");
    setLast(r ? { ok: r.ok, tested_at: r.tested_at, latency_ms: r.latency_ms, message: r.message } : null);
  }, [fetchLastTest]);
  useEffect(() => { hydrate(); }, [hydrate]);

  const get = (n: string) => secrets.find((s) => s.name === n);
  const wh = get("BITRIX24_WEBHOOK_URL");
  const credsOk = (!!wh?.has_value);
  const suspicious = hasSuspiciousLength(secrets, ["BITRIX24_WEBHOOK_URL"]);
  const credsLooksValid = credentialsLookValid(credsOk, suspicious);
  const preflightIssues = getPreflightIssues(secrets, [
    { name: "BITRIX24_WEBHOOK_URL", label: "Webhook URL" },
  ]);
  const canTest = canRunTest(credsLooksValid, preflightIssues.length);
  const status = connectionStatus(credsOk, last);

  const onTest = async () => {
    setPhase("running");
    setPendingStartedAt(new Date().toISOString());
    const r = await test("bitrix24");
    setLast({ ok: r.ok, tested_at: r.tested_at ?? new Date().toISOString(), latency_ms: r.latency_ms, message: r.error ?? r.message, status: r.status, error_kind: r.error_kind ?? null });
    setHistoryKey((k) => k + 1);
    setPendingStartedAt(null);
    setPhase(r.ok ? "completed" : "failed");
  };

  return <BitrixCard status={status} wh={wh} get={get} list={list} issues={preflightIssues} isTesting={isTesting} canTest={canTest} credsOk={credsOk} credsLooksValid={credsLooksValid} onTest={onTest} timelineOpen={timelineOpen} setTimelineOpen={setTimelineOpen} phase={phase} setPhase={setPhase} last={last} setDetailsDialogOpen={setDetailsDialogOpen} historyKey={historyKey} pendingStartedAt={pendingStartedAt} detailsDialogOpen={detailsDialogOpen} />;
}
