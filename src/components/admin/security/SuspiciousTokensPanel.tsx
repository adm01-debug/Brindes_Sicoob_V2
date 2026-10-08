import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, RefreshCw, ShieldOff } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FailureRow {
  resource_type: string;
  resource_id: string | null;
  ip_address: string;
  reason: string;
  created_at: string;
}

interface GroupedFailure {
  resource_type: string;
  resource_id: string;
  total: number;
  distinctIps: number;
  reasons: Set<string>;
  first: string;
  last: string;
}

export function SuspiciousTokensPanel() {
  const [rows, setRows] = useState<FailureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("public_token_failures")
      .select("resource_type, resource_id, ip_address, reason, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(2000);
    if (!error) setRows((data || []) as FailureRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const i = setInterval(load, 30_000);
    return () => clearInterval(i);
  }, []);

  const grouped = useMemo<GroupedFailure[]>(() => {
    const map = new Map<string, GroupedFailure>();
    for (const r of rows) {
      if (!r.resource_id) continue;
      const key = `${r.resource_type}::${r.resource_id}`;
      let g = map.get(key);
      if (!g) {
        g = {
          resource_type: r.resource_type,
          resource_id: r.resource_id,
          total: 0,
          distinctIps: 0,
          reasons: new Set(),
          first: r.created_at,
          last: r.created_at,
        };
        map.set(key, g);
      }
      g.total++;
      g.reasons.add(r.reason);
      if (r.created_at < g.first) g.first = r.created_at;
      if (r.created_at > g.last) g.last = r.created_at;
    }
    // Compute distinct IPs per group
    for (const g of map.values()) {
      const ips = new Set(rows.filter((r) => r.resource_id === g.resource_id && r.resource_type === g.resource_type).map((r) => r.ip_address));
      g.distinctIps = ips.size;
    }
    return Array.from(map.values())
      .filter((g) => g.total > 3)
      .sort((a, b) => b.total - a.total);
  }, [rows]);

  const revokeToken = async (g: GroupedFailure) => {
    setRevoking(`${g.resource_type}::${g.resource_id}`);
    try {
      if (g.resource_type === "quote") {
        const { error } = await supabase
          .from("quote_approval_tokens")
          .update({ status: "expired" })
          .eq("quote_id", g.resource_id)
          .eq("status", "active");
        if (error) throw error;
      } else if (g.resource_type === "kit") {
        const { error } = await supabase
          .from("kit_share_tokens")
          .update({ status: "expired" })
          .eq("kit_id", g.resource_id)
          .eq("status", "active");
        if (error) throw error;
      }
      toast({ title: "Token revogado", description: `${g.resource_type} ${g.resource_id.slice(0, 8)}…` });
      load();
    } catch (err) {
      toast({
        title: "Erro ao revogar",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setRevoking(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Tokens públicos suspeitos (24h)</CardTitle>
          <CardDescription>
            Recursos com mais de 3 falhas de validação. Auto-expiração ocorre após 5 falhas/hora — ações manuais cobrem casos de adivinhação distribuída.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Resource ID</TableHead>
                <TableHead className="text-right">Falhas</TableHead>
                <TableHead className="text-right">IPs distintos</TableHead>
                <TableHead>Razões</TableHead>
                <TableHead>Primeira</TableHead>
                <TableHead>Última</TableHead>
                <TableHead>Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grouped.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum token suspeito</TableCell></TableRow>
              ) : grouped.map((g) => {
                const key = `${g.resource_type}::${g.resource_id}`;
                const severity = g.total > 20 ? "destructive" : g.total > 10 ? "secondary" : "outline";
                return (
                  <TableRow key={key}>
                    <TableCell><Badge variant="outline" className="text-xs">{g.resource_type}</Badge></TableCell>
                    <TableCell className="font-mono text-xs max-w-[220px] truncate" title={g.resource_id}>{g.resource_id}</TableCell>
                    <TableCell className="text-right"><Badge variant={severity} className="text-xs tabular-nums">{g.total}</Badge></TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{g.distinctIps}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{Array.from(g.reasons).join(", ")}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(g.first), "dd/MM HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(g.last), { locale: ptBR, addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 px-2 text-xs gap-1"
                        disabled={revoking === key}
                        onClick={() => revokeToken(g)}
                      >
                        <ShieldOff className="h-3 w-3" /> Revogar
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
