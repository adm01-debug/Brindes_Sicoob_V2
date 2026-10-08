import { useEffect, useState, useCallback, type Dispatch, type SetStateAction } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, ExternalLink, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { ConnectionStatusBadge } from "./ConnectionStatusBadge";
import { resolveSupabaseConnectionStatus, type ConnectionStatus } from "./connectionStatus";
import { CardSourceDiagnostic } from "./CardSourceDiagnostic";
import { SecretField } from "./SecretField";
import { useSecretsManager, type SecretStatus } from "@/hooks/useSecretsManager";
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
import { ConnectionDetailsDialog } from "./ConnectionDetailsDialog";

const PROJECT_URL_LABEL = "URL do projeto";
const SERVICE_ROLE_LABEL = "Service Role Key";

const ENVS = [
  {
    key: "local", name: "Lovable Cloud (Local)", readOnly: true,
    envKey: null,
    urlSecret: null, anonSecret: null, serviceSecret: null,
    description: "Banco principal do sistema. Gerenciado automaticamente pelo Lovable.",
  },
  {
    key: "promobrind", name: "Catálogo Promobrind", readOnly: false,
    envKey: "promobrind" as const,
    urlSecret: "EXTERNAL_PROMOBRIND_URL",
    anonSecret: "EXTERNAL_PROMOBRIND_ANON_KEY",
    serviceSecret: "EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY",
    description: "Banco SSOT de produtos, fornecedores e categorias.",
  },
  {
    key: "crm", name: "CRM Promobrind", readOnly: false,
    envKey: "crm" as const,
    urlSecret: "EXTERNAL_CRM_URL",
    anonSecret: "EXTERNAL_CRM_ANON_KEY",
    serviceSecret: "EXTERNAL_CRM_SERVICE_ROLE_KEY",
    description: "Banco do CRM externo (empresas, contatos, agendas).",
  },
] as const;

type SupabaseEnvironment = (typeof ENVS)[number];
type SecretsManagerState = ReturnType<typeof useSecretsManager>;
type EnvironmentSetter<T> = Dispatch<SetStateAction<Record<string, T>>>;

interface ConnectionCardRuntime {
  secrets: SecretsManagerState["secrets"];
  list: SecretsManagerState["list"];
  listError: SecretsManagerState["listError"];
  isTesting: boolean;
  lastByEnv: Record<string, LastTestInfo | null>;
  historyKeyByEnv: Record<string, number>;
  detailsDialogByEnv: Record<string, boolean>;
  phaseByEnv: Record<string, TestProgressPhase>;
  pendingByEnv: Record<string, string | null>;
  timelineOpenByEnv: Record<string, boolean>;
  overviewOpenByEnv: Record<string, boolean>;
  setDetailsDialogByEnv: EnvironmentSetter<boolean>;
  setPhaseByEnv: EnvironmentSetter<TestProgressPhase>;
  setTimelineOpenByEnv: EnvironmentSetter<boolean>;
  setOverviewOpenByEnv: EnvironmentSetter<boolean>;
  handleTest: (envKey: "promobrind" | "crm", localKey: string) => Promise<void>;
}

function testButtonTitle(issueCount: number, configured: boolean, valid: boolean): string {
  if (issueCount > 0) return `Corrija ${issueCount === 1 ? "o campo" : "os campos"} acima antes de testar`;
  if (!configured) return "Configure URL e Service Role Key primeiro";
  if (!valid) return "Credenciais com formato suspeito (comprimento curto) — re-salve antes de testar";
  return "Testar conexão real";
}

function disabledReason(issueCount: number, configured: boolean): string {
  if (issueCount > 0) return "Corrija os campos sinalizados acima antes de testar";
  if (!configured) return "Configure URL e Service Role Key primeiro";
  return "Credenciais com formato suspeito — re-salve antes de testar";
}

function progressMessage(last: LastTestInfo | null): string | null {
  if (!last) return null;
  if (last.ok) return `HTTP ${last.status ?? 200}`;
  return last.message ?? null;
}

function pendingTest(startedAt: string | null | undefined): { startedAt: string } | null {
  return startedAt ? { startedAt } : null;
}

type SecretFinder = (name: string) => SecretStatus | undefined;

function findOptionalSecret(name: string | null, find: SecretFinder): SecretStatus | undefined {
  return name ? find(name) : undefined;
}

function environmentLastTest(
  env: SupabaseEnvironment,
  lastByEnv: Record<string, LastTestInfo | null>,
): LastTestInfo | null {
  return env.readOnly ? null : lastByEnv[env.key] ?? null;
}

function environmentPreflightIssues(env: SupabaseEnvironment, secrets: SecretStatus[]) {
  if (env.readOnly) return [];
  return getPreflightIssues(secrets, [
    { name: env.urlSecret, label: PROJECT_URL_LABEL },
    { name: env.serviceSecret, label: SERVICE_ROLE_LABEL },
  ]);
}

function environmentSuspicious(env: SupabaseEnvironment, secrets: SecretStatus[]): boolean {
  if (env.readOnly) return false;
  return hasSuspiciousLength(secrets, [env.urlSecret, env.anonSecret, env.serviceSecret]);
}

function connectionCardData(
  env: SupabaseEnvironment,
  secrets: SecretStatus[],
  lastByEnv: Record<string, LastTestInfo | null>,
  find: SecretFinder,
) {
  const url = findOptionalSecret(env.urlSecret, find);
  const anon = findOptionalSecret(env.anonSecret, find);
  const service = findOptionalSecret(env.serviceSecret, find);
  const last = environmentLastTest(env, lastByEnv);
  const configured = Boolean(url?.has_value && service?.has_value);
  const valid = configured && !environmentSuspicious(env, secrets);
  const preflightIssues = environmentPreflightIssues(env, secrets);
  const status = resolveSupabaseConnectionStatus({ readOnly: env.readOnly, url, service, last });
  const canTest = !env.readOnly && valid && preflightIssues.length === 0;
  return { url, anon, service, last, configured, valid, preflightIssues, status, canTest };
}

export function SupabaseConnectionsTab() {
  const { secrets, list, listError } = useSecretsManager();
  const { test, isTesting, fetchLastTest } = useConnectionTester();
  const [lastByEnv, setLastByEnv] = useState<Record<string, LastTestInfo | null>>({});
  const [historyKeyByEnv, setHistoryKeyByEnv] = useState<Record<string, number>>({});
  const [detailsDialogByEnv, setDetailsDialogByEnv] = useState<Record<string, boolean>>({});
  const [phaseByEnv, setPhaseByEnv] = useState<Record<string, TestProgressPhase>>({});
  const [pendingByEnv, setPendingByEnv] = useState<Record<string, string | null>>({});
  const [timelineOpenByEnv, setTimelineOpenByEnv] = useState<Record<string, boolean>>({});
  const [overviewOpenByEnv, setOverviewOpenByEnv] = useState<Record<string, boolean>>({});

  useEffect(() => { list(); }, [list]);

  const hydrate = useCallback(async () => {
    const entries = await Promise.all(
      ENVS.flatMap((environment) => environment.envKey ? [environment] : []).map(async (e) => {
        const last = await fetchLastTest("supabase", { env_key: e.envKey });
        return [e.key, last ? {
          ok: last.ok,
          tested_at: last.tested_at,
          latency_ms: last.latency_ms,
          message: last.message,
        } as LastTestInfo : null] as const;
      }),
    );
    setLastByEnv(Object.fromEntries(entries));
  }, [fetchLastTest]);

  useEffect(() => { hydrate(); }, [hydrate]);

  const get = (n: string) => secrets.find((s) => s.name === n);

  const handleTest = async (envKey: "promobrind" | "crm", localKey: string) => {
    setPhaseByEnv((cur) => ({ ...cur, [localKey]: "running" }));
    setPendingByEnv((cur) => ({ ...cur, [localKey]: new Date().toISOString() }));
    const r = await test("supabase", { env_key: envKey });
    setLastByEnv((cur) => ({
      ...cur,
      [localKey]: {
        ok: r.ok,
        tested_at: r.tested_at ?? new Date().toISOString(),
        latency_ms: r.latency_ms,
        message: r.error ?? r.message,
        status: r.status,
        error_kind: r.error_kind ?? null,
      },
    }));
    setHistoryKeyByEnv((cur) => ({ ...cur, [localKey]: (cur[localKey] ?? 0) + 1 }));
    setPendingByEnv((cur) => ({ ...cur, [localKey]: null }));
    setPhaseByEnv((cur) => ({ ...cur, [localKey]: r.ok ? "completed" : "failed" }));
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {ENVS.map((env) => {
        const card = connectionCardData(env, secrets, lastByEnv, get);
        return (
          <Card key={env.key} data-retest-scope tabIndex={0} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{env.name}</CardTitle>
                </div>
                <ConnectionStatusBadge status={card.status} />
              </div>
              <CardDescription>{env.description}</CardDescription>
            </CardHeader>
            <ConnectionCardContent
              env={env}
              runtime={{
                secrets, list, listError, isTesting, lastByEnv, historyKeyByEnv,
                detailsDialogByEnv, phaseByEnv, pendingByEnv, timelineOpenByEnv,
                overviewOpenByEnv, setDetailsDialogByEnv, setPhaseByEnv,
                setTimelineOpenByEnv, setOverviewOpenByEnv, handleTest,
              }}
              status={card.status}
              url={card.url}
              anon={card.anon}
              service={card.service}
              last={card.last}
              canTest={card.canTest}
              configured={card.configured}
              valid={card.valid}
              preflightIssues={card.preflightIssues}
            />
          </Card>
        );
      })}
    </div>
  );
}

interface ConnectionCardContentProps {
  env: SupabaseEnvironment;
  runtime: ConnectionCardRuntime;
  status: ConnectionStatus;
  url?: SecretStatus;
  anon?: SecretStatus;
  service?: SecretStatus;
  last: LastTestInfo | null;
  canTest: boolean;
  configured: boolean;
  valid: boolean;
  preflightIssues: ReturnType<typeof getPreflightIssues>;
}

function ConnectionCardContent(props: ConnectionCardContentProps) {
  if (props.env.readOnly) {
    return (
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Credenciais gerenciadas automaticamente. Não requer configuração manual.
        </p>
      </CardContent>
    );
  }
  return <EditableConnectionContent {...props} env={props.env} />;
}

type EditableEnvironment = Extract<SupabaseEnvironment, { readOnly: false }>;

interface EditableConnectionContentProps extends Omit<ConnectionCardContentProps, "env"> {
  env: EditableEnvironment;
}

function detailsClick(
  last: LastTestInfo | null,
  envKey: string,
  setter: EnvironmentSetter<boolean>,
): (() => void) | undefined {
  if (!last?.tested_at) return undefined;
  return () => setter((current) => ({ ...current, [envKey]: true }));
}

function EditableConnectionContent({
  env, runtime, status, url, anon, service, last, canTest, configured, valid, preflightIssues,
}: EditableConnectionContentProps) {
  const {
    list, listError, isTesting, historyKeyByEnv, detailsDialogByEnv, phaseByEnv,
    pendingByEnv, timelineOpenByEnv, overviewOpenByEnv, setDetailsDialogByEnv,
    setPhaseByEnv, setTimelineOpenByEnv, setOverviewOpenByEnv, handleTest,
  } = runtime;
  const issueCount = preflightIssues.length;
  return (
    <CardContent className="space-y-4">
      <CardSourceDiagnostic
        fields={[
          { label: PROJECT_URL_LABEL, status: url },
          { label: "Anon Key", status: anon },
          { label: SERVICE_ROLE_LABEL, status: service },
        ]}
        loadError={listError}
      />
      <SecretField label={PROJECT_URL_LABEL} secretName={env.urlSecret} status={url} onSaved={list} connectionId={env.key} />
      <SecretField label="Anon Key" secretName={env.anonSecret} status={anon} onSaved={list} connectionId={env.key} />
      <SecretField label={SERVICE_ROLE_LABEL} secretName={env.serviceSecret} status={service} onSaved={list} connectionId={env.key}
        helperText="Nunca exposto ao frontend. Usado apenas em edge functions admin." />
      <ConnectionPreflightAlert issues={preflightIssues} />
      <div className="flex flex-wrap gap-2 pt-2">
        <Button
          size="sm"
          variant="outline"
          disabled={isTesting || !canTest}
          title={testButtonTitle(issueCount, configured, valid)}
          onClick={() => handleTest(env.envKey, env.key)}
        >
          {isTesting ? "Testando…" : "Testar conexão"}
        </Button>
        <ConnectionTimelineDrawer
          type="supabase"
          label={env.name}
          triggerVariant="ghost"
          open={Boolean(timelineOpenByEnv[env.key])}
          onOpenChange={(value) => setTimelineOpenByEnv((current) => ({ ...current, [env.key]: value }))}
        />
        <RefreshFromDbButton onRefreshed={() => { void list(); }} />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setOverviewOpenByEnv((current) => ({ ...current, [env.key]: true }))}
          title="Ver status, máscara e última rotação sem expor segredos"
        >
          <Eye className="h-4 w-4 mr-1" /> Ver detalhes
        </Button>
        <Button size="sm" variant="ghost" asChild>
          <Link to="/admin/external-db">
            <ExternalLink className="h-4 w-4 mr-1" /> Ver schema
          </Link>
        </Button>
        <RetestCooldownSelector className="ml-auto" />
      </div>
      <TestProgressIndicator
        phase={phaseByEnv[env.key] ?? "idle"}
        latencyMs={last?.latency_ms ?? null}
        message={progressMessage(last)}
        onDismiss={() => setPhaseByEnv((current) => ({ ...current, [env.key]: "idle" }))}
      />
      <LastTestLine
        info={last}
        autoFocusOnFailure
        onClick={detailsClick(last, env.key, setDetailsDialogByEnv)}
        action={
          <RetestButton
            onRetest={() => handleTest(env.envKey, env.key)}
            disabled={!canTest}
            cooldownKey={`supabase:${env.envKey}`}
            disabledReason={disabledReason(issueCount, configured)}
          />
        }
      />
      <ConnectionTestHistoryPanel
        type="supabase"
        envKey={env.envKey}
        label={env.name}
        refreshKey={historyKeyByEnv[env.key] ?? 0}
        pendingTest={pendingTest(pendingByEnv[env.key])}
      />
      <ConnectionTestDetailsDialog
        open={Boolean(detailsDialogByEnv[env.key])}
        onOpenChange={(value) => setDetailsDialogByEnv((current) => ({ ...current, [env.key]: value }))}
        connectionType="supabase"
        connectionLabel={env.name}
        envKey={env.envKey}
        onViewFullHistory={() => setTimelineOpenByEnv((current) => ({ ...current, [env.key]: true }))}
      />
      <ConnectionDetailsDialog
        open={Boolean(overviewOpenByEnv[env.key])}
        onOpenChange={(value) => setOverviewOpenByEnv((current) => ({ ...current, [env.key]: value }))}
        connectionLabel={env.name}
        description={env.description}
        status={status}
        last={last}
        fields={[
          { label: PROJECT_URL_LABEL, secretName: env.urlSecret, status: url },
          { label: "Anon Key", secretName: env.anonSecret, status: anon },
          { label: SERVICE_ROLE_LABEL, secretName: env.serviceSecret, status: service, sensitive: true },
        ]}
        onOpenFullHistory={() => setTimelineOpenByEnv((current) => ({ ...current, [env.key]: true }))}
      />
    </CardContent>
  );
}
