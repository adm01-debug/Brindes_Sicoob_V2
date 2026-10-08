import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Database,
} from 'lucide-react';
import { PageSEO } from '@/components/seo/PageSEO';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ExternalConnectionsSyncLogPanel } from '@/components/admin/connections/ExternalConnectionsSyncLogPanel';
import { supabase } from '@/integrations/supabase/client';

const REQUIRED_SECRETS_BY_ENV: Record<string, string[]> = {
  promobrind: [
    'EXTERNAL_PROMOBRIND_URL',
    'EXTERNAL_PROMOBRIND_ANON_KEY',
    'EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY',
  ],
  crm: ['EXTERNAL_CRM_URL', 'EXTERNAL_CRM_ANON_KEY', 'EXTERNAL_CRM_SERVICE_ROLE_KEY'],
};

interface ConnectionRow {
  id: string;
  type: string;
  name: string;
  env_key: string | null;
  status: string;
  secret_refs: string[] | null;
  updated_at: string;
}

interface CredentialRow {
  secret_name: string;
  length: number | null;
  updated_at: string;
}

interface Diagnosis {
  envKey: string;
  connection: ConnectionRow | null;
  missing: string[];
  empty: string[];
  ok: boolean;
  reason: string;
}

function fmt(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });
}

function findConnection(connections: ConnectionRow[] | null, envKey: string) {
  return (
    connections?.find(
      (connection) => connection.env_key === envKey && connection.type === 'supabase',
    ) ?? null
  );
}

function classifyCredentials(required: string[], credentials: Map<string, CredentialRow>) {
  const missing: string[] = [];
  const empty: string[] = [];
  for (const name of required) {
    const credential = credentials.get(name);
    if (!credential) missing.push(name);
    else if (!credential.length) empty.push(name);
  }
  return { missing, empty };
}

function getDiagnosisReason(connection: ConnectionRow | null, missing: string[], empty: string[]) {
  if (!connection) {
    return 'Conexão não foi criada — gatilho não disparou após salvar credenciais.';
  }
  if (missing.length > 0) {
    return `Credencial(is) faltando: ${missing.join(', ')}`;
  }
  if (empty.length > 0) {
    return `Credencial(is) com valor vazio: ${empty.join(', ')}`;
  }
  if (connection.status !== 'active') {
    return `Status atual: ${connection.status} (esperado active)`;
  }
  return 'Tudo configurado';
}

function buildDiagnosis(
  envKey: string,
  required: string[],
  connections: ConnectionRow[] | null,
  credentials: Map<string, CredentialRow>,
): Diagnosis {
  const connection = findConnection(connections, envKey);
  const { missing, empty } = classifyCredentials(required, credentials);
  const baseName = `EXTERNAL_${envKey.toUpperCase()}`;
  const criticalNames = [`${baseName}_URL`, `${baseName}_SERVICE_ROLE_KEY`];
  const criticalConfigured = criticalNames.every(
    (name) => !missing.includes(name) && !empty.includes(name),
  );
  const ok = Boolean(
    connection &&
    missing.length === 0 &&
    empty.length === 0 &&
    connection.status === 'active' &&
    criticalConfigured,
  );
  return {
    envKey,
    connection,
    missing,
    empty,
    ok,
    reason: getDiagnosisReason(connection, missing, empty),
  };
}

function CredentialStatusRow({
  name,
  diagnosis,
  credentials,
}: {
  name: string;
  diagnosis: Diagnosis;
  credentials: CredentialRow[] | null;
}) {
  const row = credentials?.find((credential) => credential.secret_name === name);
  let tone = 'text-green-600 dark:text-green-400';
  let label = `${row?.length ?? 0} chars`;
  if (diagnosis.missing.includes(name)) {
    tone = 'text-destructive';
    label = 'ausente';
  } else if (diagnosis.empty.includes(name)) {
    tone = 'text-amber-600 dark:text-amber-400';
    label = 'vazia';
  }
  return (
    <li className="flex items-center justify-between gap-2">
      <code className="font-mono text-[10px]">{name}</code>
      <span className={tone}>{label}</span>
    </li>
  );
}

function ConnectionStatusBadge({ ok }: { ok: boolean }) {
  return (
    <Badge
      variant="outline"
      className={
        ok
          ? 'gap-1 border-green-500/40 text-green-600 dark:text-green-400'
          : 'gap-1 border-destructive/40 text-destructive'
      }
    >
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
      {ok ? 'ok' : 'falha'}
    </Badge>
  );
}

function getConnectionDetails(connection: ConnectionRow | null) {
  if (!connection) {
    return { name: '—', status: '—', updatedAt: '—', secretCount: 0 };
  }
  return {
    name: connection.name,
    status: connection.status,
    updatedAt: fmt(connection.updated_at),
    secretCount: connection.secret_refs?.length ?? 0,
  };
}

function ConnectionDiagnosisCard({
  diagnosis,
  credentials,
}: {
  diagnosis: Diagnosis;
  credentials: CredentialRow[] | null;
}) {
  const details = getConnectionDetails(diagnosis.connection);
  const requiredSecrets = REQUIRED_SECRETS_BY_ENV[diagnosis.envKey] ?? [];
  return (
    <Card className={diagnosis.ok ? '' : 'border-destructive/40'}>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="h-4 w-4 text-muted-foreground" />
          {diagnosis.envKey}
        </CardTitle>
        <ConnectionStatusBadge ok={diagnosis.ok} />
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-muted-foreground">Nome</div>
            <div className="font-medium">{details.name}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Status atual</div>
            <div className="font-medium">{details.status}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Última atualização</div>
            <div className="font-medium">{details.updatedAt}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Refs de segredo</div>
            <div className="font-medium tabular-nums">{details.secretCount}</div>
          </div>
        </div>
        <div>
          <div className="mb-1 text-muted-foreground">Credenciais esperadas</div>
          <ul className="space-y-1">
            {requiredSecrets.map((name) => (
              <CredentialStatusRow
                key={name}
                name={name}
                diagnosis={diagnosis}
                credentials={credentials}
              />
            ))}
          </ul>
        </div>
        <Alert variant={diagnosis.ok ? 'default' : 'destructive'} className="py-2">
          <AlertDescription className="text-xs">{diagnosis.reason}</AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

export default function AdminConexoesStatusPage() {
  const [conns, setConns] = useState<ConnectionRow[] | null>(null);
  const [creds, setCreds] = useState<CredentialRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [{ data: connData, error: connErr }, { data: credData, error: credErr }] =
      await Promise.all([
        supabase
          .from('external_connections')
          .select('id, type, name, env_key, status, secret_refs, updated_at')
          .order('env_key', { ascending: true }),
        supabase
          .from('integration_credentials')
          .select('secret_name, length, updated_at')
          .like('secret_name', 'EXTERNAL_%'),
      ]);

    if (connErr || credErr) {
      setError(connErr?.message ?? credErr?.message ?? 'Falha ao ler dados');
    } else {
      setConns((connData ?? []) as ConnectionRow[]);
      setCreds((credData ?? []) as CredentialRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const diagnoses = useMemo<Diagnosis[]>(() => {
    if (!creds) return [];
    const credByName = new Map(creds.map((c) => [c.secret_name, c]));
    return Object.entries(REQUIRED_SECRETS_BY_ENV).map(([envKey, required]) =>
      buildDiagnosis(envKey, required, conns, credByName),
    );
  }, [conns, creds]);

  return (
    <div className="container mx-auto max-w-6xl space-y-6 py-6">
      <PageSEO
        title="Status da sincronização de conexões | Brindes Sicoob"
        description="Histórico recente da sincronização de external_connections e diagnóstico de credenciais."
      />

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link to="/admin/conexoes">
              <ArrowLeft className="mr-1 h-4 w-4" /> Voltar para Conexões
            </Link>
          </Button>
          <h1 className="font-display text-2xl font-semibold">Status da sincronização</h1>
          <p className="text-sm text-muted-foreground">
            Histórico recente e diagnóstico da sincronização entre{' '}
            <code>integration_credentials</code> e <code>external_connections</code>.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          <span className="ml-2">Atualizar</span>
        </Button>
      </div>

      <Separator />

      {/* Diagnóstico por ambiente */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-medium">
          <ShieldAlert className="h-4 w-4 text-muted-foreground" /> Diagnóstico por ambiente
        </h2>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Falha ao carregar diagnóstico</AlertTitle>
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          {loading && !conns
            ? [0, 1].map((i) => <Skeleton key={i} className="h-44 w-full" />)
            : diagnoses.map((diagnosis) => (
                <ConnectionDiagnosisCard
                  key={diagnosis.envKey}
                  diagnosis={diagnosis}
                  credentials={creds}
                />
              ))}
        </div>
      </section>

      <Separator />

      {/* Histórico de execuções */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Histórico de execuções</h2>
        <ExternalConnectionsSyncLogPanel />
      </section>
    </div>
  );
}
