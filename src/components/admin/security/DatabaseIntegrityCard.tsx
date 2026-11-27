import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Database, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RlsCompliance {
  score: number;
  total: number;
  with_rls: number;
  missing: string[];
  permissive: string[];
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
  rls: RlsCompliance | null;
  health: SecurityHealth | null;
  aclFindings: SecDefinerFinding[];
  error: string | null;
}

async function carregarIntegridade(): Promise<DatabaseIntegrity> {
  const [rls, health, acl] = await Promise.all([
    supabase.rpc("audit_all_rls_compliance" as never),
    supabase.rpc("check_security_health" as never),
    supabase.rpc("audit_security_definer_acl" as never),
  ]);
  const erro = rls.error ?? health.error ?? acl.error;
  return {
    rls: (rls.data as unknown as RlsCompliance) ?? null,
    health: (health.data as unknown as SecurityHealth) ?? null,
    aclFindings: (acl.data as unknown as SecDefinerFinding[]) ?? [],
    error: erro ? erro.message : null,
  };
}

export function resumoRls(rls: RlsCompliance | null) {
  if (!rls) return { ok: false, detail: "Sem leitura do inventário" };
  const semRls = rls.missing.length;
  const permissivas = rls.permissive.length;
  if (semRls === 0 && permissivas === 0) {
    return { ok: true, detail: `${rls.with_rls}/${rls.total} tabelas com RLS — score ${rls.score.toFixed(2)}%` };
  }
  return {
    ok: false,
    detail: `${semRls} sem RLS, ${permissivas} permissiva(s) — score ${rls.score.toFixed(2)}%`,
  };
}

export function resumoAcl(achados: SecDefinerFinding[]) {
  if (achados.length === 0) {
    return { ok: true, detail: "Nenhuma função SECURITY DEFINER exposta sem controle" };
  }
  return { ok: false, detail: `${achados.length} função(ões) com permissão indevida` };
}

export function resumoHealth(health: SecurityHealth | null) {
  if (!health) return { ok: false, detail: "Sem leitura de saúde" };
  const quando = new Date(health.last_check).toLocaleString("pt-BR");
  return {
    ok: health.system_status === "SECURE",
    detail: `${health.system_status} — ${health.recent_admin_changes} alteração(ões) de admin desde ${quando}`,
  };
}

const COR_DO_STATUS: Record<string, "default" | "destructive"> = {
  SECURE: "default",
  AT_RISK: "destructive",
};

function ListaDeAchadosRls({ rls }: { rls: RlsCompliance }) {
  if (rls.missing.length === 0 && rls.permissive.length === 0) return null;
  return (
    <div className="rounded-md border border-destructive/40 p-2.5 text-xs">
      {rls.missing.length > 0 && <p>Sem RLS: {rls.missing.join(", ")}</p>}
      {rls.permissive.length > 0 && <p>Permissivas: {rls.permissive.join(", ")}</p>}
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

function CabecalhoDaIntegridade({ dados, carregando, recarregar }: { dados: DatabaseIntegrity; carregando: boolean; recarregar: () => void }) {
  const status = dados.health?.system_status ?? "DESCONHECIDO";
  return (
    <div className="flex items-center gap-2">
      <Badge variant={COR_DO_STATUS[status] ?? "destructive"}>{status}</Badge>
      {dados.error && <span className="text-xs text-destructive">{dados.error}</span>}
      <Button variant="ghost" size="sm" className="ml-auto" onClick={recarregar} disabled={carregando}>
        <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${carregando ? "animate-spin" : ""}`} />
        Reverificar
      </Button>
    </div>
  );
}

function DatabaseIntegrityBody({ dados, carregando, recarregar }: { dados: DatabaseIntegrity | null; carregando: boolean; recarregar: () => void }) {
  if (!dados) return <p className="text-sm text-muted-foreground">{carregando ? "Verificando…" : "Sem dados"}</p>;
  const itens = [
    { label: "RLS em todas as tabelas", ...resumoRls(dados.rls) },
    { label: "SECURITY DEFINER", ...resumoAcl(dados.aclFindings) },
    { label: "Saúde do sistema", ...resumoHealth(dados.health) },
  ];
  return (
    <div className="space-y-3">
      <CabecalhoDaIntegridade dados={dados} carregando={carregando} recarregar={recarregar} />
      <ul className="grid gap-2 sm:grid-cols-3">
        {itens.map((item) => <ItemDeIntegridade key={item.label} {...item} />)}
      </ul>
      {dados.rls && <ListaDeAchadosRls rls={dados.rls} />}
      <ListaDeAchadosAcl achados={dados.aclFindings} />
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
      if (resultado.error) throw new Error(resultado.error);
    } catch (erro) {
      toast({
        title: "Erro ao verificar a integridade do banco",
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
