import { useMemo } from "react";
import { CheckCircle2, AlertTriangle, GitCompare, KeyRound, Database } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Painel de comparação: chaves esperadas (canônicas) × integration_credentials × external_connections.
 *
 * Regras (espelham `sync_external_connections_from_credentials`):
 *  - Para cada env_key em ENV_KEYS, esperamos 3 secrets:
 *      EXTERNAL_<KEY>_URL, EXTERNAL_<KEY>_ANON_KEY, EXTERNAL_<KEY>_SERVICE_ROLE_KEY
 *  - E uma linha em external_connections com env_key = <KEY> e type = 'supabase'.
 */

const ENV_KEYS = [
  { key: "promobrind", label: "Catálogo Promobrind" },
  { key: "crm", label: "CRM Promobrind" },
] as const;

const SECRET_SUFFIXES = ["URL", "ANON_KEY", "SERVICE_ROLE_KEY"] as const;

type SecretRow = { name: string; has_value?: boolean };
type ExtRow = { env_key: string | null; type: string | null; name: string | null };
type ExtRowWithKey = ExtRow & { env_key: string };

const hasEnvKey = (connection: ExtRow): connection is ExtRowWithKey => Boolean(connection.env_key);

export type ExpectedKeysMatchPanelProps = {
  secrets: SecretRow[];
  extConns: ExtRow[];
  loading?: boolean;
};

type EnvDiagnosis = {
  envKey: string;
  label: string;
  expectedSecrets: { name: string; present: boolean; hasValue: boolean }[];
  hasExtConn: boolean;
  extName: string | null;
  ok: boolean;
  issues: string[];
};

function buildDiagnosis(key: string, label: string, secrets: Map<string, SecretRow>, connections: Map<string, ExtRow>): EnvDiagnosis {
  const expectedSecrets = SECRET_SUFFIXES.map(suffix => {
    const name = `EXTERNAL_${key.toUpperCase()}_${suffix}`;
    const row = secrets.get(name);
    return { name, present: Boolean(row), hasValue: Boolean(row?.has_value) };
  });
  const connection = connections.get(key);
  const issues = expectedSecrets.flatMap(secret => !secret.present ? [`Faltando: ${secret.name}`] : !secret.hasValue ? [`Vazio: ${secret.name}`] : []);
  if (!connection) issues.push(`Sem linha em external_connections (env_key=${key})`);
  return { envKey: key, label, expectedSecrets, hasExtConn: Boolean(connection), extName: connection?.name ?? null, ok: issues.length === 0, issues };
}

function useExpectedKeysDiagnosis(secrets: SecretRow[], extConns: ExtRow[]) {
  const secretMap = useMemo(() => {
    const map = new Map<string, SecretRow>();
    for (const secret of secrets) map.set(secret.name.toUpperCase(), secret);
    return map;
  }, [secrets]);
  const extByEnvKey = useMemo(() => {
    const map = new Map<string, ExtRow>();
    for (const connection of extConns) if (connection.env_key) map.set(connection.env_key.toLowerCase(), connection);
    return map;
  }, [extConns]);
  const diagnoses = useMemo(() => ENV_KEYS.map(({ key, label }) => buildDiagnosis(key, label, secretMap, extByEnvKey)), [secretMap, extByEnvKey]);
  const expectedSecretNames = useMemo(() => {
    const set = new Set<string>();
    for (const { key } of ENV_KEYS) {
      for (const suffix of SECRET_SUFFIXES) set.add(`EXTERNAL_${key.toUpperCase()}_${suffix}`);
    }
    return set;
  }, []);
  const expectedEnvKeys = useMemo(() => new Set(ENV_KEYS.map(entry => entry.key.toLowerCase())), []);
  const orphanSecrets = useMemo(() => secrets.filter(secret => secret.name.startsWith("EXTERNAL_") && !expectedSecretNames.has(secret.name.toUpperCase())).map(secret => secret.name), [secrets, expectedSecretNames]);
  const orphanExtConns = useMemo(() => extConns.filter(hasEnvKey).filter(connection => !expectedEnvKeys.has(connection.env_key.toLowerCase())).map(connection => ({ env_key: connection.env_key, name: connection.name })), [extConns, expectedEnvKeys]);
  const totalIssues = diagnoses.reduce((total, diagnosis) => total + diagnosis.issues.length, 0) + orphanSecrets.length + orphanExtConns.length;
  return { diagnoses, orphanSecrets, orphanExtConns, totalIssues };
}

function SecretStatus({ secret }: { secret: EnvDiagnosis['expectedSecrets'][number] }) {
  const state = !secret.present ? "missing" : !secret.hasValue ? "empty" : "ok";
  const className = state === "ok" ? "border-green-500/40 text-green-700 text-[10px]" : state === "empty" ? "border-amber-500/40 text-amber-700 text-[10px]" : "border-destructive/40 text-destructive text-[10px]";
  return <li className="flex items-center justify-between gap-2 text-[11px] font-mono"><span className="flex items-center gap-1.5 min-w-0 truncate"><KeyRound className="h-3 w-3 text-muted-foreground shrink-0" /><span className="truncate">{secret.name}</span></span><Badge variant="outline" className={className}>{state === "ok" ? "ok" : state === "empty" ? "vazio" : "faltando"}</Badge></li>;
}

function DiagnosisCard({ diagnosis }: { diagnosis: EnvDiagnosis }) {
  return <div className={`rounded-lg border p-3 space-y-2 ${diagnosis.ok ? "border-green-500/30 bg-green-500/5" : "border-amber-500/30 bg-amber-500/5"}`}><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2 min-w-0">{diagnosis.ok ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" /> : <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />}<div className="min-w-0"><div className="text-sm font-semibold truncate">{diagnosis.label}</div><div className="text-[10px] font-mono text-muted-foreground">env_key={diagnosis.envKey}</div></div></div><Badge variant="outline" className={diagnosis.hasExtConn ? "border-blue-500/40 text-blue-600 text-[10px]" : "border-destructive/40 text-destructive text-[10px]"}><Database className="h-3 w-3 mr-1" />{diagnosis.hasExtConn ? "ext: ok" : "ext: ausente"}</Badge></div><ul className="space-y-1">{diagnosis.expectedSecrets.map(secret => <SecretStatus key={secret.name} secret={secret} />)}</ul>{diagnosis.issues.length > 0 && <div className="text-[11px] text-amber-700 dark:text-amber-400 pt-1 border-t border-amber-500/20">{diagnosis.issues.map(issue => <div key={issue}>• {issue}</div>)}</div>}</div>;
}

function OrphanSecretsCard({ names }: { names: string[] }) {
  return <div className="rounded-lg border p-3"><div className="flex items-center justify-between mb-2"><div className="text-xs font-semibold flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5 text-primary" />Credenciais sem correspondência</div><Badge variant="outline" className="text-[10px]">{names.length}</Badge></div><p className="text-[11px] text-muted-foreground mb-2">Secrets <code className="text-[10px]">EXTERNAL_*</code> em <code className="text-[10px]">integration_credentials</code> que não pertencem a um <code className="text-[10px]">env_key</code> esperado.</p>{names.length === 0 ? <p className="text-[11px] text-muted-foreground italic">Nenhuma — todas as credenciais batem com o contrato.</p> : <ul className="space-y-1 text-[11px] font-mono">{names.map(name => <li key={name} className="flex items-center justify-between gap-2 border-b last:border-0 pb-1"><span className="truncate">{name}</span><Badge variant="outline" className="border-amber-500/40 text-amber-700 text-[10px]">órfão</Badge></li>)}</ul>}</div>;
}

function OrphanConnectionsCard({ connections }: { connections: { env_key: string; name: string | null }[] }) {
  return <div className="rounded-lg border p-3"><div className="flex items-center justify-between mb-2"><div className="text-xs font-semibold flex items-center gap-1.5"><Database className="h-3.5 w-3.5 text-primary" />external_connections sem correspondência</div><Badge variant="outline" className="text-[10px]">{connections.length}</Badge></div><p className="text-[11px] text-muted-foreground mb-2">Linhas em <code className="text-[10px]">external_connections</code> cujo <code className="text-[10px]">env_key</code> não está no contrato.</p>{connections.length === 0 ? <p className="text-[11px] text-muted-foreground italic">Nenhuma — todas as conexões espelham um env_key esperado.</p> : <ul className="space-y-1 text-[11px] font-mono">{connections.map(connection => <li key={connection.env_key} className="flex items-center justify-between gap-2 border-b last:border-0 pb-1"><span className="truncate">{connection.name ?? "—"} <span className="text-muted-foreground">({connection.env_key})</span></span><Badge variant="outline" className="border-amber-500/40 text-amber-700 text-[10px]">órfão</Badge></li>)}</ul>}</div>;
}

export function ExpectedKeysMatchPanel({ secrets, extConns, loading }: ExpectedKeysMatchPanelProps) {
  const result = useExpectedKeysDiagnosis(secrets, extConns);
  return <Card><CardHeader><div className="flex items-start justify-between gap-3 flex-wrap"><div className="flex items-start gap-3"><div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><GitCompare className="h-4 w-4 text-primary" aria-hidden="true" /></div><div><CardTitle className="text-base">Comparação de chaves esperadas</CardTitle><CardDescription>Confronta o contrato canônico (<code className="text-[10px] px-1 rounded bg-muted">EXTERNAL_&lt;KEY&gt;_URL/ANON_KEY/SERVICE_ROLE_KEY</code>) com <code className="text-[10px] px-1 rounded bg-muted">integration_credentials</code> e <code className="text-[10px] px-1 rounded bg-muted">external_connections</code>.</CardDescription></div></div>{!loading && <Badge variant={result.totalIssues === 0 ? "default" : "secondary"} className={result.totalIssues === 0 ? "bg-green-600" : "bg-amber-500/15 text-amber-700 border-amber-500/30"}>{result.totalIssues === 0 ? "Sem divergências" : `${result.totalIssues} divergência(s)`}</Badge>}</div></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 md:grid-cols-2">{result.diagnoses.map(diagnosis => <DiagnosisCard key={diagnosis.envKey} diagnosis={diagnosis} />)}</div><div className="grid gap-3 md:grid-cols-2"><OrphanSecretsCard names={result.orphanSecrets} /><OrphanConnectionsCard connections={result.orphanExtConns} /></div></CardContent></Card>;
}
