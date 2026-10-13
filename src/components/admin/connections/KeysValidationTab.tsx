import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, AlertTriangle, XCircle, CheckCircle2, RefreshCw, Search, X, ChevronDown, ChevronRight, Database, Briefcase, Workflow, Plug } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useSecretsManager, type SecretStatus } from "@/hooks/useSecretsManager";
import { cn } from "@/lib/utils";

const MUTED_TEXT = "text-muted-foreground";
const DESTRUCTIVE_TEXT = "text-destructive";
const AMBER_TEXT = "text-amber-600";
const LARGE_METRIC_CLASS = "text-3xl font-bold tabular-nums";

type Severity = "required" | "recommended" | "optional";

type ExpectedKey = {
  name: string;
  severity: Severity;
  /** O que quebra se faltar. */
  impact: string;
};

type FeatureGroup = {
  id: string;
  label: string;
  description: string;
  Icon: typeof Database;
  /** Áreas da UI que dependem deste grupo. */
  uiSurfaces: string[];
  keys: ExpectedKey[];
};

/**
 * Contrato canônico de chaves esperadas por feature.
 * Espelha `ALLOWED_SECRETS` em supabase/functions/secrets-manager/index.ts.
 */
const FEATURE_GROUPS: FeatureGroup[] = [
  {
    id: "catalog",
    label: "Catálogo Promobrind",
    description: "Banco externo que alimenta toda a listagem de produtos, variantes e imagens.",
    Icon: Database,
    uiSurfaces: ["/filtros", "/produto/:slug", "Kit Maker", "Comparador", "Busca semântica"],
    keys: [
      {
        name: "EXTERNAL_PROMOBRIND_URL",
        severity: "required",
        impact: "Sem URL, a edge function external-db-bridge não conecta — catálogo fica vazio.",
      },
      {
        name: "EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY",
        severity: "required",
        impact: "Sem service role, queries falham com 401 — produtos/variantes não carregam.",
      },
      {
        name: "EXTERNAL_PROMOBRIND_ANON_KEY",
        severity: "recommended",
        impact: "Necessária apenas se usarmos o client público no futuro — hoje é fallback.",
      },
    ],
  },
  {
    id: "crm",
    label: "CRM Promobrind",
    description: "Banco externo para empresas, contatos e sincronização de orçamentos.",
    Icon: Database,
    uiSurfaces: ["Seletor de empresa", "Orçamentos", "/orcamentos/novo", "/admin/empresas"],
    keys: [
      {
        name: "EXTERNAL_CRM_URL",
        severity: "required",
        impact: "Sem URL, o seletor de empresas e a sync de orçamentos param.",
      },
      {
        name: "EXTERNAL_CRM_SERVICE_ROLE_KEY",
        severity: "required",
        impact: "Sem service role, leituras protegidas (companies, contatos) retornam 401.",
      },
      {
        name: "EXTERNAL_CRM_ANON_KEY",
        severity: "recommended",
        impact: "Reservada para fluxos públicos. Hoje opcional.",
      },
    ],
  },
  {
    id: "bitrix24",
    label: "Bitrix24",
    description: "Integração CRM Bitrix24 (sync de orçamentos, deals e contatos).",
    Icon: Briefcase,
    uiSurfaces: ["Sync de orçamentos → Bitrix24", "/admin/conexoes › Bitrix24"],
    keys: [
      {
        name: "BITRIX24_WEBHOOK_URL",
        severity: "required",
        impact: "Sem webhook, nenhum payload é entregue ao Bitrix24.",
      },
      {
        name: "BITRIX24_DOMAIN",
        severity: "required",
        impact: "Necessário para construir URLs e validar tenant.",
      },
      {
        name: "BITRIX24_USER_ID",
        severity: "required",
        impact: "Identifica o usuário-bot que cria os registros.",
      },
      {
        name: "BITRIX24_TOKEN",
        severity: "required",
        impact: "Token de autenticação do webhook Bitrix24.",
      },
    ],
  },
  {
    id: "n8n",
    label: "n8n (Automação)",
    description: "Disparos automatizados, webhooks de workflows e jobs agendados via n8n.",
    Icon: Workflow,
    uiSurfaces: ["/admin/conexoes › n8n", "Workflows automáticos pós-orçamento"],
    keys: [
      {
        name: "N8N_BASE_URL",
        severity: "required",
        impact: "Sem URL base, nenhum workflow n8n é disparado.",
      },
      {
        name: "N8N_API_KEY",
        severity: "required",
        impact: "Sem API key, todas as chamadas ao n8n retornam 401.",
      },
    ],
  },
  {
    id: "mcp",
    label: "MCP (Claude/IA)",
    description: "Canal seguro para o assistente do Lovable consumir recursos do projeto.",
    Icon: Plug,
    uiSurfaces: ["/admin/conexoes › MCP", "Integração com Claude Desktop"],
    keys: [
      {
        name: "MCP_SHARED_SECRET",
        severity: "recommended",
        impact: "Necessário apenas se MCP estiver ativado. Sem ele, o canal é rejeitado.",
      },
    ],
  },
];

type EvalRow = {
  group: FeatureGroup;
  expected: ExpectedKey;
  status: "ok" | "empty" | "missing";
  source: SecretStatus["source"] | null;
  maskedSuffix: string | null;
};

function classifyKey(expected: ExpectedKey, secrets: SecretStatus[]): EvalRow["status"] {
  const s = secrets.find((x) => x.name === expected.name);
  if (!s) return "missing";
  if (!s.has_value) return "empty";
  return "ok";
}

const SEV_BADGE: Record<Severity, { label: string; cls: string }> = {
  required: { label: "obrigatório", cls: "border-destructive/40 text-destructive bg-destructive/5" },
  recommended: { label: "recomendado", cls: "border-amber-500/40 text-amber-700 bg-amber-500/5" },
  optional: { label: "opcional", cls: "border-muted-foreground/30 text-muted-foreground" },
};

const STATUS_META: Record<EvalRow["status"], { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  ok: { label: "configurado", cls: "border-green-500/40 text-green-700 bg-green-500/5", Icon: CheckCircle2 },
  empty: { label: "vazio", cls: "border-amber-500/40 text-amber-700 bg-amber-500/5", Icon: AlertTriangle },
  missing: { label: "faltando", cls: "border-destructive/40 text-destructive bg-destructive/5", Icon: XCircle },
};

interface VisibleGroup {
  group: FeatureGroup;
  rows: EvalRow[];
  allRows: EvalRow[];
  groupOk: boolean;
  groupBlockers: number;
  groupWarnings: number;
}

function matchesKeyFilter(row: EvalRow, group: FeatureGroup, query: string, onlyIssues: boolean): boolean {
  if (onlyIssues && row.status === "ok") return false;
  if (!query) return true;
  const normalizedName = row.expected.name.toLowerCase();
  const normalizedLabel = group.label.toLowerCase();
  return normalizedName.includes(query) || normalizedLabel.includes(query) || group.uiSurfaces.some((surface) => surface.toLowerCase().includes(query));
}

function buildVisibleGroups(evaluations: EvalRow[], query: string, onlyIssues: boolean): VisibleGroup[] {
  return FEATURE_GROUPS.map((group) => {
    const allRows = evaluations.filter((row) => row.group.id === group.id);
    const rows = allRows.filter((row) => matchesKeyFilter(row, group, query, onlyIssues));
    const issues = allRows.filter((row) => row.status !== "ok");
    return {
      group, rows, allRows,
      groupOk: issues.length === 0,
      groupBlockers: issues.filter((row) => row.expected.severity === "required").length,
      groupWarnings: issues.filter((row) => row.expected.severity === "recommended").length,
    };
  }).filter((group) => group.rows.length > 0);
}

function ValidationKeyRow({ row }: { row: EvalRow }) {
  const statusMeta = STATUS_META[row.status];
  const StatusIcon = statusMeta.Icon;
  const severity = SEV_BADGE[row.expected.severity];
  return (
    <li className="py-2.5 flex items-start justify-between gap-3 flex-wrap">
      <div className="min-w-0 flex-1"><div className="flex items-center gap-2 flex-wrap"><code className="text-xs font-mono px-1.5 py-0.5 rounded bg-muted">{row.expected.name}</code><Badge variant="outline" className={cn("text-[10px]", severity.cls)}>{severity.label}</Badge>{row.status === "ok" && row.source && <Badge variant="outline" className="text-[10px] uppercase font-mono">{row.source}{row.maskedSuffix ? ` • ••••${row.maskedSuffix}` : ""}</Badge>}</div><p className={cn("text-[11px] mt-1", row.status === "ok" ? MUTED_TEXT : "text-foreground")}>{row.status === "ok" ? "Sem impacto — chave presente." : row.expected.impact}</p></div>
      <Badge variant="outline" className={cn("shrink-0", statusMeta.cls)}><StatusIcon className="h-3 w-3 mr-1" />{statusMeta.label}</Badge>
    </li>
  );
}

function GroupHealthBadges({ view }: { view: VisibleGroup }) {
  if (view.groupOk) return <Badge variant="outline" className="border-green-500/40 text-green-700 bg-green-500/5"><CheckCircle2 className="h-3 w-3 mr-1" /> ok</Badge>;
  return <>{view.groupBlockers > 0 && <Badge variant="outline" className="border-destructive/40 text-destructive bg-destructive/5"><XCircle className="h-3 w-3 mr-1" /> {view.groupBlockers} bloqueador(es)</Badge>}{view.groupWarnings > 0 && <Badge variant="outline" className="border-amber-500/40 text-amber-700 bg-amber-500/5"><AlertTriangle className="h-3 w-3 mr-1" /> {view.groupWarnings} aviso(s)</Badge>}</>;
}

function groupTone(view: VisibleGroup): "green" | "red" | "amber" {
  if (view.groupOk) return "green";
  if (view.groupBlockers > 0) return "red";
  return "amber";
}

function FeatureGroupCard({ view, collapsed, onToggle }: { view: VisibleGroup; collapsed: boolean; onToggle: () => void }) {
  const Icon = view.group.Icon;
  const configured = view.allRows.filter((row) => row.status === "ok").length;
  const tone = groupTone(view);
  return (
    <Card className={cn(tone === "red" && "border-destructive/40", tone === "amber" && "border-amber-500/40")}>
      <CardHeader className="pb-3"><div className="flex items-start justify-between gap-3 flex-wrap">
        <button type="button" onClick={onToggle} className="flex items-start gap-3 text-left flex-1 min-w-0" aria-expanded={!collapsed}>
          <div className="mt-0.5">{collapsed ? <ChevronRight className={cn("h-4 w-4", MUTED_TEXT)} /> : <ChevronDown className={cn("h-4 w-4", MUTED_TEXT)} />}</div>
          <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", tone === "green" ? "bg-green-500/10" : tone === "red" ? "bg-destructive/10" : "bg-amber-500/10")}><Icon className={cn("h-4 w-4", tone === "green" ? "text-green-600" : tone === "red" ? DESTRUCTIVE_TEXT : AMBER_TEXT)} /></div>
          <div className="min-w-0"><CardTitle className="text-base">{view.group.label}</CardTitle><CardDescription className="text-xs">{view.group.description}</CardDescription><div className="flex flex-wrap gap-1 mt-1.5">{view.group.uiSurfaces.map((surface) => <Badge key={surface} variant="outline" className="text-[10px] font-mono">{surface}</Badge>)}</div></div>
        </button>
        <div className="flex items-center gap-1.5 shrink-0"><GroupHealthBadges view={view} /><span className="text-[10px] text-muted-foreground tabular-nums ml-1">{configured}/{view.allRows.length}</span></div>
      </div></CardHeader>
      {!collapsed && <CardContent className="pt-0"><ul className="divide-y border-t">{view.rows.map((row) => <ValidationKeyRow key={row.expected.name} row={row} />)}</ul></CardContent>}
    </Card>
  );
}

function ValidationGroups({ loading, evaluations, groups, collapsed, onToggle }: { loading: boolean; evaluations: EvalRow[]; groups: VisibleGroup[]; collapsed: Set<string>; onToggle: (id: string) => void }) {
  if (loading && evaluations.length === 0) return <div className="space-y-3">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-32 w-full" />)}</div>;
  if (groups.length === 0) return <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Nenhum resultado para os filtros atuais.</CardContent></Card>;
  return <div className="space-y-3">{groups.map((view) => <FeatureGroupCard key={view.group.id} view={view} collapsed={collapsed.has(view.group.id)} onToggle={() => onToggle(view.group.id)} />)}</div>;
}

function ValidationHeader({ loading, onReload }: { loading: boolean; onReload: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div className="flex items-start gap-3"><div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" /></div><div><h2 className="text-lg font-semibold">Validação de chaves para UI e catálogos</h2><p className="text-sm text-muted-foreground max-w-2xl">Confronta o contrato canônico (definido em <code className="text-xs px-1 py-0.5 rounded bg-muted">secrets-manager</code>) com o estado atual de <code className="text-xs px-1 py-0.5 rounded bg-muted">integration_credentials</code> e ENV. Bloqueadores destacam chaves obrigatórias faltando.</p></div></div>
      <Button variant="outline" size="sm" onClick={onReload} disabled={loading}><RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />Recarregar</Button>
    </div>
  );
}

function ValidationFilters({ filter, onlyIssues, issuesCount, onFilterChange, onOnlyIssuesChange }: { filter: string; onlyIssues: boolean; issuesCount: number; onFilterChange: (value: string) => void; onOnlyIssuesChange: () => void }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="relative flex-1 min-w-[240px] max-w-md"><Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" /><Input value={filter} onChange={(event) => onFilterChange(event.target.value)} placeholder="Buscar por chave, feature ou superfície da UI…" className="h-9 pl-7 pr-7 text-sm" aria-label="Buscar chave" />{filter && <button type="button" onClick={() => onFilterChange("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted" aria-label="Limpar busca"><X className="h-3 w-3 text-muted-foreground" /></button>}</div>
      <Button variant={onlyIssues ? "default" : "outline"} size="sm" onClick={onOnlyIssuesChange}><AlertTriangle className="h-3.5 w-3.5 mr-1.5" />Só problemas {issuesCount > 0 && `(${issuesCount})`}</Button>
    </div>
  );
}

function configurationScore(ok: number, total: number): number {
  return total === 0 ? 0 : Math.round((ok / total) * 100);
}

export function KeysValidationTab() {
  const { secrets, list, isLoading: loading } = useSecretsManager();
  const [filter, setFilter] = useState("");
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    list();
  }, [list]);

  const evaluations: EvalRow[] = useMemo(() => {
    const out: EvalRow[] = [];
    for (const group of FEATURE_GROUPS) {
      for (const k of group.keys) {
        const s = secrets.find((x) => x.name === k.name);
        out.push({
          group,
          expected: k,
          status: classifyKey(k, secrets),
          source: s?.has_value ? s.source ?? null : null,
          maskedSuffix: s?.masked_suffix ?? null,
        });
      }
    }
    return out;
  }, [secrets]);

  // KPIs globais
  const totals = useMemo(() => {
    const total = evaluations.length;
    const ok = evaluations.filter((e) => e.status === "ok").length;
    const issues = evaluations.filter((e) => e.status !== "ok");
    const blockers = issues.filter((e) => e.expected.severity === "required").length;
    const warnings = issues.filter((e) => e.expected.severity === "recommended").length;
    return { total, ok, blockers, warnings, issuesCount: issues.length };
  }, [evaluations]);

  const score = configurationScore(totals.ok, totals.total);
  const query = filter.trim().toLowerCase();

  const visibleGroups = useMemo(() => buildVisibleGroups(evaluations, query, onlyIssues), [evaluations, query, onlyIssues]);

  function toggleCollapsed(id: string) {
    setCollapsed((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <ValidationHeader loading={loading} onReload={() => void list()} />

      {/* KPIs */}
      {(<div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Score de configuração</CardTitle>
            <CardDescription className="text-xs">{totals.ok} de {totals.total} chaves ok</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? <Skeleton className="h-8 w-20" /> : (
              <>
                <div className={cn(LARGE_METRIC_CLASS, score === 100 ? "text-green-600" : score >= 80 ? AMBER_TEXT : DESTRUCTIVE_TEXT)}>
                  {score}%
                </div>
                <Progress value={score} className="h-1.5" />
              </>
            )}
          </CardContent>
        </Card>
        <Card className={totals.blockers > 0 ? "border-destructive/40 bg-destructive/5" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <XCircle className={cn("h-4 w-4", totals.blockers > 0 ? DESTRUCTIVE_TEXT : MUTED_TEXT)} />
              Bloqueadores
            </CardTitle>
            <CardDescription className="text-xs">Chaves obrigatórias faltando</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={cn(LARGE_METRIC_CLASS, totals.blockers > 0 ? DESTRUCTIVE_TEXT : MUTED_TEXT)}>
              {totals.blockers}
            </div>
          </CardContent>
        </Card>
        <Card className={totals.warnings > 0 ? "border-amber-500/40 bg-amber-500/5" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <AlertTriangle className={cn("h-4 w-4", totals.warnings > 0 ? AMBER_TEXT : MUTED_TEXT)} />
              Avisos
            </CardTitle>
            <CardDescription className="text-xs">Recomendadas faltando</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={cn(LARGE_METRIC_CLASS, totals.warnings > 0 ? AMBER_TEXT : MUTED_TEXT)}>
              {totals.warnings}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Configuradas
            </CardTitle>
            <CardDescription className="text-xs">Com valor presente</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums text-green-600">{totals.ok}</div>
          </CardContent>
        </Card>
      </div>)}

      {/* Filtros */}
      <ValidationFilters filter={filter} onlyIssues={onlyIssues} issuesCount={totals.issuesCount} onFilterChange={setFilter} onOnlyIssuesChange={() => setOnlyIssues((value) => !value)} />

      {/* Grupos */}
      <ValidationGroups loading={loading} evaluations={evaluations} groups={visibleGroups} collapsed={collapsed} onToggle={toggleCollapsed} />
    </div>
  );
}
