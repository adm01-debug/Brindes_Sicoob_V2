import { useState } from "react";
// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Activity, ShieldCheck, FileText, AlertTriangle, Download, Search, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Database } from "@/integrations/supabase/types";

type RLSAuditLog = Database["public"]["Tables"]["sicoob_rls_audit_logs"]["Row"];

export function summarizeLatestRlsAuditLogs(logs: RLSAuditLog[] | undefined) {
  const latestByTable = new Map<string, RLSAuditLog>();
  for (const log of logs ?? []) {
    if (!latestByTable.has(log.table_name)) latestByTable.set(log.table_name, log);
  }
  const latest = [...latestByTable.values()];
  return {
    conformingTables: latest.filter((log) => log.status === "success").length,
    tablesWithIssues: latest.filter((log) => log.status !== "success").length,
  };
}

function csvCell(value: string | boolean | null) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export default function RLSAuditPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["rls_audit_logs", filter, search],
    queryFn: async () => {
      let query = supabase
        .from("sicoob_rls_audit_logs")
        .select("id, executed_at, table_name, status, issue_details, resolved")
        .order("executed_at", { ascending: false });

      if (filter === "denied") {
        query = query.eq("status", "failure");
      } else if (filter === "allowed") {
        query = query.eq("status", "success");
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      
      if (search) {
        return data.filter((log) =>
          log.table_name.toLowerCase().includes(search.toLowerCase()) ||
          log.status.toLowerCase().includes(search.toLowerCase()) ||
          log.issue_details?.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      return data;
    }
  });

  const handleExportCSV = () => {
    if (!logs || logs.length === 0) return;
    
    const headers = ["Data/Hora", "Tabela", "Status", "Resolvido", "Detalhes"];
    const csvData = logs.map((log) => [
      format(new Date(log.executed_at ?? 0), "yyyy-MM-dd HH:mm:ss"),
      log.table_name,
      log.status === "success" ? "CONFORME" : "PROBLEMA",
      log.resolved ? "SIM" : "NÃO",
      log.issue_details || ""
    ]);

    const csvContent = [headers, ...csvData].map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `rls-audit-${format(new Date(), "yyyyMMdd")}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Relatório CSV exportado com sucesso!");
  };

  const auditSummary = summarizeLatestRlsAuditLogs(logs);

  return (
    <>
      <PageSEO title="Auditoria de RLS - Sicoob" description="Monitoramento de segurança e acesso." path="/admin/seguranca/rls" />
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-sicoob-green-dark" />
            <h1 className="text-2xl font-bold text-sicoob-green-dark">Relatório de Auditoria RLS</h1>
          </div>
          <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-success/5 border-success/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tabelas conformes</p>
                  <p className="text-3xl font-bold text-success">{auditSummary.conformingTables}</p>
                </div>
                <ShieldCheck className="h-8 w-8 text-success/40" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-destructive/5 border-destructive/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Problemas encontrados</p>
                  <p className="text-3xl font-bold text-destructive">{auditSummary.tablesWithIssues}</p>
                </div>
                <ShieldAlert className="h-8 w-8 text-destructive/40" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Última Operação</p>
                  <p className="text-lg font-bold truncate max-w-[150px]">
                    {logs?.[0]?.table_name || "N/A"}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-muted-foreground/40" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Filtros e Logs
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por tabela ou detalhe..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="allowed">Conformes</SelectItem>
                  <SelectItem value="denied">Com problema</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="p-8 text-center">Carregando auditoria...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Data/Hora</th>
                      <th className="text-left p-3">Tabela</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Resolvido</th>
                      <th className="text-left p-3">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs?.map((log: RLSAuditLog) => (
                      <tr key={log.id} className="border-b hover:bg-muted/50">
                        <td className="p-3 text-muted-foreground">
                          {format(new Date(log.executed_at ?? 0), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                        </td>
                        <td className="p-3 font-mono text-xs">{log.table_name}</td>
                        <td className="p-3">
                          {log.status === "success" ? (
                            <Badge className="bg-success/20 text-success border-success/30">CONFORME</Badge>
                          ) : (
                            <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                              <AlertTriangle className="h-3 w-3" /> PROBLEMA
                            </Badge>
                          )}
                        </td>
                        <td className="p-3">{log.resolved ? "Sim" : "Não"}</td>
                        <td className="p-3 text-xs text-muted-foreground max-w-xs truncate">
                          {log.issue_details || "Nenhum problema identificado"}
                        </td>
                      </tr>
                    ))}
                    {!logs?.length && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground italic">
                          Nenhum registro de auditoria encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
