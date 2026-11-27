import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldAlert, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Tentativas de uso das edge functions `mcp-keys-*` sem JWT válido.
 *
 * A tabela `mcp_access_violations` recebe uma linha por requisição recusada e
 * acumulou ~2.060 eventos desde maio/2026 sem nenhuma superfície de leitura —
 * só admin enxerga (RLS `is_admin`), então o painel fica na aba MCP de
 * /admin/conexoes, ao lado das chaves que estão sendo atacadas.
 */

const LIMITE = 50;

interface Violacao {
  id: string;
  reason: string;
  source: string;
  operation: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function motivoLabel(reason: string): string {
  if (reason === "missing_jwt") return "Sem token";
  if (reason === "invalid_jwt") return "Token inválido";
  return reason;
}

export function McpAccessViolationsPanel() {
  const [violacoes, setViolacoes] = useState<Violacao[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    const [lista, contagem] = await Promise.all([
      supabase
        .from("mcp_access_violations")
        .select("id, reason, source, operation, ip_address, user_agent, created_at")
        .order("created_at", { ascending: false })
        .limit(LIMITE),
      supabase.from("mcp_access_violations").select("id", { count: "exact", head: true }),
    ]);

    if (lista.error) {
      toast.error("Erro ao carregar violações de acesso", { description: lista.error.message });
    } else {
      setViolacoes((lista.data ?? []) as Violacao[]);
    }
    setTotal(contagem.count ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              Tentativas de acesso indevido
              {total !== null && total > 0 && (
                <Badge variant="destructive" className="text-xs">{total.toLocaleString("pt-BR")}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Requisições às funções de chave MCP recusadas por falta de token válido.
              {total !== null && total > LIMITE && ` Exibindo as ${LIMITE} mais recentes.`}
            </CardDescription>
          </div>
          <Button size="sm" variant="ghost" onClick={() => void carregar()} disabled={loading}>
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : violacoes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma tentativa recusada registrada.</p>
        ) : (
          <ul className="space-y-2">
            {violacoes.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 border border-border rounded-md p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="destructive" className="text-xs">{motivoLabel(v.reason)}</Badge>
                    <code className="text-xs text-muted-foreground">{v.source}</code>
                    {v.operation && (
                      <Badge variant="outline" className="text-xs">{v.operation}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {v.ip_address ?? "IP desconhecido"} · {v.user_agent ?? "agente desconhecido"}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatarData(v.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
