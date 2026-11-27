import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Database, RefreshCw, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * `audit_all_rls_compliance()` nao e executavel por `authenticated` (o grant e
 * so para postgres e service_role) e grava uma linha em `qa_rls_audits` por
 * chamada. A tela le o resultado ja auditado, dentro da policy de admin, em
 * vez de rodar a auditoria a cada abertura.
 */
interface RlsAuditRow {
  tables_total: number | null;
  tables_with_rls: number | null;
  tables_missing_rls: string[] | null;
  tables_permissive_rls: string[] | null;
  score: number | null;
  audited_at: string;
}

interface SecurityHealth {
  last_check: string;
  rls_health: number;
  system_status: string;
  recent_admin_changes: number;
}

interface SecDefinerFinding {
  function_name: string;
  arguments: string;
  problem: string;
  granted_to: string;
}

export interface DatabaseIntegrity {
  rls: RlsAuditRow | null;
  health: SecurityHealth | null;
  aclFindings: SecDefinerFinding[];
  errors: string[];
  carregadoEm: string;
}

const COLUNAS_DA_AUDITORIA = "tables_total, tables_with_rls, tables_missing_rls, tables_permissive_rls, score, audited_at";

function numeroOuZero(valor: unknown): number {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : 0;
}

function listaDeTexto(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.filter((item): item is string => typeof item === "string") : [];
}

function normalizarAuditoria(bruto: unknown): RlsAuditRow | null {
  if (!bruto || typeof bruto !== "object") return null;
  const linha = bruto as Record<string, unknown>;
  return {
    tables_total: numeroOuZero(linha.tables_total),
    tables_with_rls: numeroOuZero(linha.tables_with_rls),
    tables_missing_rls: listaDeTexto(linha.tables_missing_rls),
    tables_permissive_rls: listaDeTexto(linha.tables_permissive_rls),
    score: numeroOuZero(linha.score),
    audited_at: typeof linha.audited_at === "string" ? linha.audited_at : "",
  };
}

function normalizarAchados(bruto: unknown): SecDefinerFinding[] {
  if (!Array.isArray(bruto)) return [];
  return bruto.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const achado = item as Record<string, unknown>;
    if (typeof achado.function_name !== "string") return [];
    return [{
      function_name: achado.function_name,
      arguments: typeof achado.arguments === "string" ? achado.arguments : "",
      problem: typeof achado.problem === "string" ? achado.problem : "",
      granted_to: typeof achado.granted_to === "string" ? achado.granted_to : "",
    }];
  });
}

async function carregarIntegridade(): Promise<DatabaseIntegrity> {
  const erros: string[] = [];

  const auditoria = await supabase
    .from("qa_rls_audits")
    .select(COLUNAS_DA_AUDITORIA)
    .order("audited_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (auditoria.error) erros.push(`Auditoria de RLS: ${auditoria.error.message}`);

  const saude = await supabase.rpc("check_security_health" as never);
  if (saude.error) erros.push(`Saúde do sistema: ${saude.error.message}`);

  const acl = await supabase.rpc("audit_security_definer_acl" as never);
  if (acl.error) erros.push(`Permissões de função: ${acl.error.message}`);

  return {
    rls: normalizarAuditoria(auditoria.data),
    health: saude.error ? null : (saude.data as unknown as SecurityHealth),
    aclFindings: normalizarAchados(acl.data),
    errors: erros,
    carregadoEm: new Date().toISOString(),
  };
}

export interface Resumo {
  ok: boolean;
  detail: string;
}

/** Dado mais velho que isso nao sustenta um selo verde. */
export const IDADE_MAXIMA_AUDITORIA_MS = 7 * 24 * 60 * 60 * 1000;

export function auditoriaVencida(rls: RlsAuditRow | null, agora: Date = new Date()): boolean {
  if (!rls?.audited_at) return true;
  const quando = new Date(rls.audited_at).getTime();
  if (!Number.isFinite(quando)) return true;
  return agora.getTime() - quando > IDADE_MAXIMA_AUDITORIA_MS;
}

export function resumoRls(rls: RlsAuditRow | null, agora: Date = new Date()): Resumo {
  if (!rls) return { ok: false, detail: "Nenhuma auditoria de RLS registrada" };
  const semRls = listaDeTexto(rls.tables_missing_rls);
  const permissivas = listaDeTexto(rls.tables_permissive_rls);
  const comRls = numeroOuZero(rls.tables_with_rls);
  const total = numeroOuZero(rls.tables_total);
  if (semRls.length === 0 && permissivas.length === 0) {
    if (auditoriaVencida(rls, agora)) {
      return { ok: false, detail: `${comRls}/${total} tabelas com RLS na última auditoria, mas o dado está desatualizado` };
    }
    return { ok: true, detail: `${comRls}/${total} tabelas com RLS — score ${numeroOuZero(rls.score).toFixed(2)}%` };
  }
  return { ok: false, detail: `${semRls.length} sem RLS, ${permissivas.length} permissiva(s) — score ${numeroOuZero(rls.score).toFixed(2)}%` };
}

export function resumoAcl(achados: SecDefinerFinding[], falhou: boolean): Resumo {
  if (falhou) return { ok: false, detail: "Não foi possível ler as permissões" };
  if (achados.length === 0) return { ok: true, detail: "Nenhuma função SECURITY DEFINER exposta sem controle" };
  return { ok: false, detail: `${achados.length} função(ões) com permissão indevida` };
}

/**
 * `check_security_health()` devolve `system_status` fixo em 'SECURE'. O status
 * exibido e recalculado a partir dos achados reais das auditorias.
 */
export function resumoHealth(health: SecurityHealth | null, temAchado: boolean): Resumo {
  if (!health) return { ok: false, detail: "Sem leitura de saúde" };
  const alteracoes = numeroOuZero(health.recent_admin_changes);
  if (temAchado) return { ok: false, detail: `Achados de integridade abertos — ${alteracoes} alteração(ões) de admin nas últimas 24h` };
  return { ok: true, detail: `Sem achados — ${alteracoes} alteração(ões) de admin nas últimas 24h` };
}

/** Tabelas particionadas contam em `tables_total` mas o pai pode nao ter sido verificado. */
export function avisoDeCobertura(rls: RlsAuditRow | null): string | null {
  if (!rls) return null;
  const total = numeroOuZero(rls.tables_total);
  const comRls = numeroOuZero(rls.tables_with_rls);
  const semRls = listaDeTexto(rls.tables_missing_rls);
  if (semRls.length === 0 && total > comRls) {
    return `${total - comRls} tabela(s) do total não aparecem como verificadas (inclui particionadas) — o score trata como ausência.`;
  }
  return null;
}

const COR_DO_STATUS: Record<string, "default" | "secondary" | "destructive"> = { OK: "default", PARCIAL: "secondary", ATENCAO: "destructive" };

function ItemDeIntegridade({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <li className="flex items-start gap-2 rounded-md border border-border/50 p-2.5">
      {ok ? <CheckCircle2 className="h-4 w-4 mt-0.5 text-success shrink-0" /> : <XCircle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />}
      <div className="min-w-0">
        <p className="text-sm font-medium leading-tight">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>
      </div>
    </li>
  );
}

function ListaDeAchadosRls({ rls }: { rls: RlsAuditRow }) {
  const semRls = listaDeTexto(rls.tables_missing_rls);
  const permissivas = listaDeTexto(rls.tables_permissive_rls);
  if (semRls.length === 0 && permissivas.length === 0) return null;
  return (
    <div className="rounded-md border border-destructive/40 p-2.5 text-xs">
      {semRls.length > 0 && <p>Sem RLS: {semRls.join(", ")}</p>}
      {permissivas.length > 0 && <p>Permissivas: {permissivas.join(", ")}</p>}
    </div>
  );
}

function ListaDeAchadosAcl({ achados }: { achados: SecDefinerFinding[] }) {
  if (achados.length === 0) return null;
  return (
    <div className="rounded-md border border-destructive/40 p-2.5 text-xs space-y-1">
      {achados.map((f) => (
        <p key={`${f.function_name}${f.arguments}`}>
          <span className="font-mono">{f.function_name}({f.arguments})</span> — {f.problem} para {f.granted_to}
        </p>
      ))}
    </div>
  );
}

function CabecalhoDaIntegridade({ dados, carregando, recarregar }: { dados: DatabaseIntegrity; carregando: boolean; recarregar: () => void }) {
  const status = statusDeIntegridade(dados);
  return (
    <div className="flex items-center gap-2">
      <Badge variant={COR_DO_STATUS[status]}>{status}</Badge>
      <Button variant="ghost" size="sm" className="ml-auto" onClick={recarregar} disabled={carregando}>
        <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${carregando ? "animate-spin" : ""}`} />
        Reverificar
      </Button>
    </div>
  );
}

/**
 * Leitura parcial nao pode virar selo verde: se qualquer RPC falhou, o estado
 * e desconhecido, nao aprovado.
 */
export function statusDeIntegridade(dados: DatabaseIntegrity): "OK" | "ATENCAO" | "PARCIAL" {
  const temAchado = !resumoRls(dados.rls).ok || dados.aclFindings.length > 0;
  if (temAchado) return "ATENCAO";
  return dados.errors.length > 0 ? "PARCIAL" : "OK";
}

function DatabaseIntegrityBody({ dados, carregando, recarregar }: { dados: DatabaseIntegrity | null; carregando: boolean; recarregar: () => void }) {
  if (!dados) return <p className="text-sm text-muted-foreground">{carregando ? "Verificando…" : "Sem dados"}</p>;
  const temAchado = !resumoRls(dados.rls).ok || dados.aclFindings.length > 0;
  const itens = [
    { label: "RLS em todas as tabelas", ...resumoRls(dados.rls) },
    { label: "SECURITY DEFINER", ...resumoAcl(dados.aclFindings, dados.errors.some((e) => e.startsWith("Permissões"))) },
    { label: "Saúde do sistema", ...resumoHealth(dados.health, temAchado) },
  ];
  const aviso = avisoDeCobertura(dados.rls);
  return (
    <div className="space-y-3">
      <CabecalhoDaIntegridade dados={dados} carregando={carregando} recarregar={recarregar} />
      <ul className="grid gap-2 sm:grid-cols-3">
        {itens.map((item) => <ItemDeIntegridade key={item.label} {...item} />)}
      </ul>
      {dados.rls && <ListaDeAchadosRls rls={dados.rls} />}
      <ListaDeAchadosAcl achados={dados.aclFindings} />
      {aviso && (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          {aviso}
        </p>
      )}
      {dados.rls?.audited_at && (
        <p className="text-xs text-muted-foreground">
          Última auditoria de RLS registrada em {new Date(dados.rls.audited_at).toLocaleString("pt-BR")}.
          {" "}O painel lê o resultado gravado; não executa a auditoria a cada abertura.
        </p>
      )}
      {dados.errors.length > 0 && (
        <div className="rounded-md border border-destructive/40 p-2.5 text-xs space-y-1">
          {dados.errors.map((erro) => <p key={erro} className="text-destructive">{erro}</p>)}
        </div>
      )}
    </div>
  );
}

export function DatabaseIntegrityCard() {
  const [dados, setDados] = useState<DatabaseIntegrity | null>(null);
  const [carregando, setCarregando] = useState(true);
  const { toast } = useToast();

  const recarregar = useCallback(async () => {
    setCarregando(true);
    try {
      const resultado = await carregarIntegridade();
      setDados(resultado);
      if (resultado.errors.length > 0) {
        toast({
          title: "Parte da integridade não pôde ser lida",
          description: resultado.errors.join(" · "),
          variant: "destructive",
        });
      }
    } catch (erro) {
      toast({
        title: "Não foi possível verificar a integridade",
        description: erro instanceof Error ? erro.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setCarregando(false);
    }
  }, [toast]);

  useEffect(() => { void recarregar(); }, [recarregar]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="h-4 w-4 text-muted-foreground" />
          Integridade do banco
        </CardTitle>
        <CardDescription>
          RLS por tabela, permissões de funções SECURITY DEFINER e saúde geral, lidos direto do banco
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DatabaseIntegrityBody dados={dados} carregando={carregando} recarregar={recarregar} />
      </CardContent>
    </Card>
  );
}
