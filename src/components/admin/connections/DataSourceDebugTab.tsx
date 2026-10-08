import { useEffect, useState, useCallback, useMemo } from "react";
import { Bug, Database, KeyRound, RefreshCw, CheckCircle2, AlertCircle, Search, X, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useSecretsManager } from "@/hooks/useSecretsManager";
import { ExpectedKeysMatchPanel } from "./ExpectedKeysMatchPanel";
import { LastSyncRunPanel } from "./LastSyncRunPanel";
import { CredentialCacheMetricsPanel } from "./CredentialCacheMetricsPanel";
import { BridgeProductsPreviewPanel } from "./BridgeProductsPreviewPanel";
import { FieldSourceDrillDownDialog, type FieldDrillDownData } from "./FieldSourceDrillDownDialog";
import { toast } from "sonner";

const ACTIVE_BADGE_CLASS = "bg-green-600";

type ExternalConnRow = {
  id: string;
  name: string | null;
  type: string | null;
  status: string | null;
  env_key: string | null;
  last_test_at: string | null;
  updated_at: string | null;
};

type DataSourceMap = {
  field: string;
  description: string;
  source: "integration_credentials" | "external_connections" | "ambos (sync trigger)";
  notes: string;
};

const FIELD_MAP: DataSourceMap[] = [
  {
    field: "URL / API Key (valor mascarado)",
    description: "Valores mostrados nos cards Catálogo/CRM Promobrind",
    source: "integration_credentials",
    notes: "Lido via edge function `secrets-manager` (RLS por admin)",
  },
  {
    field: "Status (Ativo/Inativo)",
    description: "Badge verde/cinza nos cards e tabela Overview",
    source: "ambos (sync trigger)",
    notes: "SSOT em `integration_credentials`; espelhado por trigger",
  },
  {
    field: "Histórico de testes (last_test_at, latência)",
    description: "Coluna 'Último teste' em ConnectionsOverviewTable",
    source: "external_connections",
    notes: "Atualizado pelo botão 'Testar conexão' e auto-test cron",
  },
  {
    field: "Health agregado (Pulse Bar, Saúde)",
    description: "Indicador no topo + zona Saúde",
    source: "external_connections",
    notes: "Usa status + last_test_at desta tabela",
  },
  {
    field: "Lista de produtos (catálogo)",
    description: "Dados do banco Promobrind",
    source: "integration_credentials",
    notes: "URL/key consumidos pelo `external-db-bridge` em runtime",
  },
];

type SecretRow = ReturnType<typeof useSecretsManager>["secrets"][number];

function includesQuery(values: Array<string | null | undefined>, query: string): boolean {
  return values.some(value => (value ?? "").toLowerCase().includes(query));
}

function filterSecrets(secrets: SecretRow[], query: string): SecretRow[] {
  return query ? secrets.filter(secret => includesQuery([secret.name, secret.source], query)) : secrets;
}

function filterConnections(connections: ExternalConnRow[], query: string): ExternalConnRow[] {
  return query
    ? connections.filter(connection => includesQuery([connection.name, connection.type, connection.status], query))
    : connections;
}

function formatTimestamp(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleString("pt-BR") : "—";
}

function maskedSecretDisplay(secret: SecretRow | undefined, emptyLabel = "(vazio)"): string {
  if (!secret?.has_value) return emptyLabel;
  return secret.masked_suffix ? `••••${secret.masked_suffix}` : "(valor presente)";
}

function secretSample(secret: SecretRow, includeName = true) {
  return {
    label: includeName ? secret.name : "",
    display: maskedSecretDisplay(secret, "(vazio)"),
    badge: {
      text: secret.has_value ? secret.source ?? "db" : "vazio",
      tone: secret.has_value ? "ok" as const : "warn" as const,
    },
  };
}

function credentialsDrill(base: Pick<FieldDrillDownData, "field" | "description" | "source" | "notes">, secrets: SecretRow[]): FieldDrillDownData {
  return {
    ...base,
    technicalSource: {
      kind: "edge_function",
      name: "secrets-manager (action: list)",
      snippet: "supabase.functions.invoke('secrets-manager', {\n  body: { action: 'list' }\n})\n// retorna: [{ name, has_value, masked_suffix, source, updated_at }]",
    },
    samples: secrets.filter(secret => secret.name.startsWith("EXTERNAL_")).map(secret => secretSample(secret)),
    emptyMessage: "Nenhum secret EXTERNAL_* retornado pela edge function.",
  };
}

function statusDrill(base: Pick<FieldDrillDownData, "field" | "description" | "source" | "notes">, connections: ExternalConnRow[]): FieldDrillDownData {
  return {
    ...base,
    technicalSource: {
      kind: "trigger",
      name: "sync_external_connections_from_credentials()",
      snippet: "-- SSOT: integration_credentials.length > 0\n-- Espelho: external_connections.status\n--   = 'active' se URL e SERVICE_ROLE_KEY presentes,\n--   senão 'unconfigured'.\nINSERT INTO external_connections(...) ON CONFLICT (env_key, type) DO UPDATE\n  SET status = EXCLUDED.status, updated_at = now();",
    },
    samples: connections.map(connection => ({
      label: `${connection.name ?? connection.id} (env_key=${connection.env_key ?? "—"})`,
      display: `status = ${connection.status ?? "—"}`,
      badge: {
        text: connection.status ?? "—",
        tone: connection.status === "active" ? "ok" as const : connection.status === "unconfigured" ? "warn" as const : "neutral" as const,
      },
    })),
  };
}

function historyDrill(base: Pick<FieldDrillDownData, "field" | "description" | "source" | "notes">, connections: ExternalConnRow[]): FieldDrillDownData {
  return {
    ...base,
    technicalSource: {
      kind: "table_query",
      name: "external_connections.last_test_at",
      snippet: "supabase\n  .from('external_connections')\n  .select('id,name,status,last_test_at,updated_at')\n  .order('updated_at', { ascending: false })",
    },
    samples: connections.map(connection => ({
      label: connection.name ?? connection.id,
      display: `last_test_at = ${formatTimestamp(connection.last_test_at)}`,
      badge: { text: connection.last_test_at ? "registrado" : "nunca testado", tone: connection.last_test_at ? "ok" as const : "warn" as const },
    })),
  };
}

function healthPercentage(active: number, total: number): string {
  return `${total === 0 ? 0 : Math.round((active / total) * 100)}%`;
}

function healthDrill(base: Pick<FieldDrillDownData, "field" | "description" | "source" | "notes">, connections: ExternalConnRow[]): FieldDrillDownData {
  const total = connections.length;
  const active = connections.filter(connection => connection.status === "active").length;
  const allActive = total > 0 && active === total;
  return {
    ...base,
    technicalSource: {
      kind: "hook",
      name: "derived from external_connections",
      snippet: "// Cálculo no client\nconst total  = rows.length;\nconst active = rows.filter(r => r.status === 'active').length;\nconst health = total === 0 ? 0 : active / total; // 0..1",
    },
    samples: [
      { label: "Conexões totais", display: `${total} linha(s) em external_connections`, badge: { text: String(total), tone: "neutral" } },
      {
        label: "Conexões ativas",
        display: `${active} com status = 'active'`,
        badge: { text: allActive ? "100%" : healthPercentage(active, total), tone: allActive ? "ok" : active === 0 ? "error" : "warn" },
      },
      ...connections.map(connection => ({
        label: connection.name ?? connection.id,
        display: `status=${connection.status ?? "—"} • last_test=${formatTimestamp(connection.last_test_at)}`,
        badge: { text: connection.status ?? "—", tone: (connection.status === "active" ? "ok" : "warn") as "ok" | "warn" },
      })),
    ],
  };
}

function catalogDrill(base: Pick<FieldDrillDownData, "field" | "description" | "source" | "notes">, secrets: SecretRow[]): FieldDrillDownData {
  const names = ["EXTERNAL_PROMOBRIND_URL", "EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY"];
  return {
    ...base,
    technicalSource: {
      kind: "edge_function",
      name: "external-db-bridge (op: select_products)",
      snippet: "// Edge function lê EXTERNAL_PROMOBRIND_URL + _SERVICE_ROLE_KEY\n// (de integration_credentials, via secrets-manager interno)\n// e cria um client Supabase apontando para o BD do catálogo.\nconst client = createClient(URL, SERVICE_ROLE_KEY);\nawait client.from('products').select(...);",
    },
    samples: names.map(name => {
      const secret = secrets.find(candidate => candidate.name === name);
      return {
        label: name,
        display: maskedSecretDisplay(secret),
        badge: { text: secret?.has_value ? secret.source ?? "db" : "vazio", tone: secret?.has_value ? "ok" as const : "error" as const },
      };
    }),
  };
}

function buildDrillData(field: string | null, secrets: SecretRow[], connections: ExternalConnRow[]): FieldDrillDownData | null {
  if (!field) return null;
  const row = FIELD_MAP.find(candidate => candidate.field === field);
  if (!row) return null;
  const base = { field: row.field, description: row.description, source: row.source, notes: row.notes };
  if (field === "URL / API Key (valor mascarado)") return credentialsDrill(base, secrets);
  if (field === "Status (Ativo/Inativo)") return statusDrill(base, connections);
  if (field === "Histórico de testes (last_test_at, latência)") return historyDrill(base, connections);
  if (field === "Health agregado (Pulse Bar, Saúde)") return healthDrill(base, connections);
  if (field === "Lista de produtos (catálogo)") return catalogDrill(base, secrets);
  return { ...base, technicalSource: { kind: "table_query", name: "—", snippet: "—" }, samples: [] };
}

function DebugHeader({ loading, onRefresh }: { loading: boolean; onRefresh: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
          <Bug className="h-5 w-5 text-amber-600" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Debug de Origem de Dados</h2>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Compara as duas fontes que alimentam esta tela: <code className="text-xs px-1 py-0.5 rounded bg-muted">integration_credentials</code> (SSOT, valores secretos) e <code className="text-xs px-1 py-0.5 rounded bg-muted">external_connections</code> (espelho operacional, histórico de testes).
          </p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
        Recarregar
      </Button>
    </div>
  );
}

function SourceCountCard({ title, description, count, loading, icon }: {
  title: string;
  description: string;
  count: number;
  loading: boolean;
  icon: typeof Database;
}) {
  const Icon = icon;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2"><Icon className="h-4 w-4 text-primary" />{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-8 w-16" /> : <div className="text-3xl font-bold tabular-nums">{count}</div>}
        <p className="text-xs text-muted-foreground mt-1">linha(s) {title === "integration_credentials" ? "acessíveis via edge function" : "na tabela espelhada"}</p>
      </CardContent>
    </Card>
  );
}

function SyncCard({ loading, inSync, difference }: { loading: boolean; inSync: boolean; difference: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          {inSync ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-amber-600" />}
          Sincronização
        </CardTitle>
        <CardDescription className="text-xs">Trigger: <code className="text-[10px]">sync_external_connections_from_credentials</code></CardDescription>
      </CardHeader>
      <CardContent>
        {loading
          ? <Skeleton className="h-8 w-24" />
          : <Badge variant={inSync ? "default" : "secondary"} className={inSync ? ACTIVE_BADGE_CLASS : ""}>{inSync ? "Espelhado" : "Divergente"}</Badge>}
        <p className="text-xs text-muted-foreground mt-2">
          {inSync ? "Ambas tabelas têm o mesmo nº de linhas." : `Diferença de ${difference} linha(s).`}
        </p>
      </CardContent>
    </Card>
  );
}

function CountsCards(props: { integrationCount: number; externalCount: number; secretsLoading: boolean; extLoading: boolean; inSync: boolean }) {
  const loading = props.secretsLoading || props.extLoading;
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <SourceCountCard title="integration_credentials" description="SSOT — valores secretos (mascarados)" count={props.integrationCount} loading={props.secretsLoading} icon={KeyRound} />
      <SourceCountCard title="external_connections" description="Espelho operacional + histórico" count={props.externalCount} loading={props.extLoading} icon={Database} />
      <SyncCard loading={loading} inSync={props.inSync} difference={Math.abs(props.integrationCount - props.externalCount)} />
    </div>
  );
}

function sourceBadgeClass(source: DataSourceMap["source"]): string {
  if (source === "integration_credentials") return "border-primary/40 text-primary";
  if (source === "external_connections") return "border-blue-500/40 text-blue-600";
  return "border-green-500/40 text-green-700";
}

function FieldMapCard({ onSelect }: { onSelect: (field: string) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mapa de campos → fonte</CardTitle>
        <CardDescription>De onde cada dado mostrado em /admin/conexoes é lido</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2 pr-3 font-medium">Campo / UI</th><th className="py-2 pr-3 font-medium">Origem</th><th className="py-2 pr-3 font-medium">Observações</th><th className="py-2 font-medium text-right">Drill-down</th></tr></thead>
            <tbody>
              {FIELD_MAP.map(row => (
                <tr
                  key={row.field}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(row.field)}
                  onKeyDown={(event) => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); onSelect(row.field); } }}
                  className="border-b last:border-0 align-top cursor-pointer hover:bg-muted/40 focus:bg-muted/60 outline-none"
                  aria-label={`Ver origem técnica e amostras de ${row.field}`}
                >
                  <td className="py-2 pr-3"><div className="font-medium">{row.field}</div><div className="text-xs text-muted-foreground">{row.description}</div></td>
                  <td className="py-2 pr-3"><Badge variant="outline" className={sourceBadgeClass(row.source)}>{row.source}</Badge></td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground">{row.notes}</td>
                  <td className="py-2 text-right"><ChevronRight className="inline h-4 w-4 text-muted-foreground" aria-hidden="true" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function CredentialRowsContent({ loading, all, filtered, filter }: { loading: boolean; all: SecretRow[]; filtered: SecretRow[]; filter: string }) {
  if (loading) return <Skeleton className="h-32 w-full" />;
  if (all.length === 0) return <p className="text-xs text-muted-foreground">Nenhuma credencial encontrada.</p>;
  if (filtered.length === 0) return <p className="text-xs text-muted-foreground">Nenhum resultado para “{filter}”.</p>;
  return (
    <ul className="space-y-1.5 text-xs font-mono">
      {filtered.map(secret => (
        <li key={secret.name} className="flex items-center justify-between gap-2 border-b pb-1.5 last:border-0">
          <span className="truncate">{secret.name}</span>
          <div className="flex items-center gap-1.5">
            {secret.masked_suffix && <span className="text-[10px] text-muted-foreground">••••{secret.masked_suffix}</span>}
            <Badge variant={secret.has_value ? "default" : "secondary"} className={`text-[10px] ${secret.has_value ? ACTIVE_BADGE_CLASS : ""}`}>
              {secret.has_value ? secret.source ?? "db" : "vazio"}
            </Badge>
          </div>
        </li>
      ))}
    </ul>
  );
}

function FilterInput({ value, onChange, placeholder, label }: { value: string; onChange: (value: string) => void; placeholder: string; label: string }) {
  return (
    <div className="relative mt-2">
      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
      <Input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="h-8 text-xs pl-7 pr-7" aria-label={label} />
      {value && <button type="button" onClick={() => onChange("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted" aria-label="Limpar filtro"><X className="h-3 w-3 text-muted-foreground" /></button>}
    </div>
  );
}

function CredentialRowsCard({ all, filtered, filter, loading, onFilter }: { all: SecretRow[]; filtered: SecretRow[]; filter: string; loading: boolean; onFilter: (value: string) => void }) {
  const count = filter ? `${filtered.length}/${all.length}` : String(all.length);
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap"><CardTitle className="text-sm">integration_credentials (linhas)</CardTitle><span className="text-[10px] text-muted-foreground tabular-nums">{count} linha(s)</span></div>
        <FilterInput value={filter} onChange={onFilter} placeholder="Filtrar por nome (ex.: PROMOBRIND, CRM)…" label="Filtrar credenciais por nome" />
      </CardHeader>
      <CardContent><CredentialRowsContent loading={loading} all={all} filtered={filtered} filter={filter} /></CardContent>
    </Card>
  );
}

function ExternalRowsContent({ loading, error, all, filtered, filter }: { loading: boolean; error: string | null; all: ExternalConnRow[] | null; filtered: ExternalConnRow[]; filter: string }) {
  if (loading) return <Skeleton className="h-32 w-full" />;
  if (error) return <p className="text-xs text-destructive">Erro: {error}</p>;
  if (!all || all.length === 0) return <p className="text-xs text-muted-foreground">Nenhuma linha encontrada.</p>;
  if (filtered.length === 0) return <p className="text-xs text-muted-foreground">Nenhum resultado para “{filter}”.</p>;
  return (
    <ul className="space-y-1.5 text-xs font-mono">
      {filtered.map(connection => (
        <li key={connection.id} className="flex items-center justify-between gap-2 border-b pb-1.5 last:border-0">
          <span className="truncate">{connection.name ?? connection.id}</span>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px]">{connection.type ?? "—"}</Badge>
            <Badge variant={connection.status === "active" ? "default" : "secondary"} className={`text-[10px] ${connection.status === "active" ? ACTIVE_BADGE_CLASS : ""}`}>{connection.status ?? "—"}</Badge>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ExternalRowsCard({ all, filtered, filter, loading, error, onFilter }: { all: ExternalConnRow[] | null; filtered: ExternalConnRow[]; filter: string; loading: boolean; error: string | null; onFilter: (value: string) => void }) {
  const total = all?.length ?? 0;
  const count = filter ? `${filtered.length}/${total}` : String(total);
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap"><CardTitle className="text-sm">external_connections (linhas)</CardTitle><span className="text-[10px] text-muted-foreground tabular-nums">{count} linha(s)</span></div>
        <FilterInput value={filter} onChange={onFilter} placeholder="Filtrar por nome, tipo ou status…" label="Filtrar conexões externas" />
      </CardHeader>
      <CardContent><ExternalRowsContent loading={loading} error={error} all={all} filtered={filtered} filter={filter} /></CardContent>
    </Card>
  );
}

export function DataSourceDebugTab() {
  const { secrets, list, isLoading: secretsLoading } = useSecretsManager();
  const [extConns, setExtConns] = useState<ExternalConnRow[] | null>(null);
  const [extLoading, setExtLoading] = useState(false);
  const [extError, setExtError] = useState<string | null>(null);
  const [credFilter, setCredFilter] = useState("");
  const [extFilter, setExtFilter] = useState("");

  const loadExternal = useCallback(async () => {
    setExtLoading(true);
    setExtError(null);
    const { data, error } = await supabase
      .from("external_connections")
      .select("id,name,type,status,env_key,last_test_at,updated_at")
      .order("updated_at", { ascending: false });
    if (error) {
      setExtError(error.message);
      setExtConns([]);
    } else {
      setExtConns((data ?? []) as ExternalConnRow[]);
    }
    setExtLoading(false);
  }, []);

  useEffect(() => {
    list();
    loadExternal();
  }, [list, loadExternal]);

  const refresh = useCallback(() => {
    list();
    loadExternal();
    toast.success("Dados de debug recarregados");
  }, [list, loadExternal]);

  const integrationCount = secrets.length;
  const externalCount = (extConns?.length ?? 0);
  const inSync = (!secretsLoading && !extLoading && integrationCount === externalCount);

  const credQuery = credFilter.trim().toLowerCase();
  const filteredSecrets = filterSecrets(secrets, credQuery);
  const extQuery = extFilter.trim().toLowerCase();
  const filteredExtConns = filterConnections(extConns ?? [], extQuery);

  // Drill-down: dialog do campo selecionado
  const [drillField, setDrillField] = useState<string | null>(null);
  const drillData = useMemo(
    () => buildDrillData(drillField, secrets, extConns ?? []),
    [drillField, secrets, extConns],
  );

  return (
    <div className="space-y-4">
      <DebugHeader loading={secretsLoading || extLoading} onRefresh={refresh} />

      <CountsCards integrationCount={integrationCount} externalCount={externalCount} secretsLoading={secretsLoading} extLoading={extLoading} inSync={inSync} />

      <FieldMapCard onSelect={setDrillField} />

      {/* Comparação de chaves esperadas × fontes */}
      {(<ExpectedKeysMatchPanel
        secrets={secrets}
        extConns={(extConns ?? []).map((c) => ({ env_key: c.env_key, type: c.type, name: c.name }))}
        loading={secretsLoading || extLoading}
      />)}

      {/* Última execução do trigger de sync */}
      <LastSyncRunPanel />

      {/* Métricas de cache da SSOT (resolveCredential) */}
      <CredentialCacheMetricsPanel />

      {/* Pré-visualização paginada dos produtos retornados pelo external-db-bridge */}
      <BridgeProductsPreviewPanel />

      {/* Raw rows */}
      <div className="grid gap-3 lg:grid-cols-2">
        <CredentialRowsCard all={secrets} filtered={filteredSecrets} filter={credFilter} loading={secretsLoading} onFilter={setCredFilter} />
        <ExternalRowsCard all={extConns} filtered={filteredExtConns} filter={extFilter} loading={extLoading} error={extError} onFilter={setExtFilter} />
      </div>

      <FieldSourceDrillDownDialog
        open={drillField !== null}
        onOpenChange={(o) => { if (!o) setDrillField(null); }}
        data={drillData}
      />
    </div>
  );
}
