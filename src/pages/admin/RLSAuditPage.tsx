import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, FileText, AlertTriangle, User, Download, Search, Filter, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function RLSAuditPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["rls_audit_logs", filter, search],
    queryFn: async () => {
      let query = supabase
        .from("sicoob_rls_audit_logs")
        .select(`
          *,
          user:profiles!user_id(display_name, role)
        `)
        .order("created_at", { ascending: false });

      if (filter === "denied") {
        query = query.eq("is_allowed", false);
      } else if (filter === "allowed") {
        query = query.eq("is_allowed", true);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      
      if (search) {
        return data.filter((log: any) => 
          log.table_name.toLowerCase().includes(search.toLowerCase()) ||
          log.user?.display_name?.toLowerCase().includes(search.toLowerCase()) ||
          log.policy_name?.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      return data;
    }
  });

  const handleExportCSV = () => {
    if (!logs || logs.length === 0) return;
    
    const headers = ["Data/Hora", "Usuário", "Papel", "Operação", "Tabela", "Status", "Política"];
    const csvData = logs.map((log: any) => [
      format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss"),
      log.user?.display_name || "N/A",
      log.user?.role || "N/A",
      log.operation,
      log.table_name,
      log.is_allowed ? "PERMITIDO" : "NEGADO",
      log.policy_name || "N/A"
    ]);

    const csvContent = [headers, ...csvData].map(e => e.join(",")).join("\n");
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

  const deniedCount = logs?.filter((l: any) => !l.is_allowed).length || 0;

  return (
    <MainLayout>
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
                  <p className="text-sm text-muted-foreground">Acessos Permitidos</p>
                  <p className="text-3xl font-bold text-success">{logs?.filter((l: any) => l.is_allowed).length || 0}</p>
                </div>
                <ShieldCheck className="h-8 w-8 text-success/40" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-destructive/5 border-destructive/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Acessos Negados</p>
                  <p className="text-3xl font-bold text-destructive">{deniedCount}</p>
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
                    {logs?.[0]?.operation || "N/A"}
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
                  placeholder="Buscar por tabela ou usuário..."
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
                  <SelectItem value="allowed">Permitidos</SelectItem>
                  <SelectItem value="denied">Negados</SelectItem>
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
                      <th className="text-left p-3">Usuário</th>
                      <th className="text-left p-3">Operação</th>
                      <th className="text-left p-3">Tabela</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs?.map((log: any) => (
                      <tr key={log.id} className="border-b hover:bg-muted/50">
                        <td className="p-3 text-muted-foreground">
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col">
                            <span className="font-medium">{log.user?.display_name || "Desconhecido"}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">{log.user?.role}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline">{log.operation}</Badge>
                        </td>
                        <td className="p-3 font-mono text-xs">{log.table_name}</td>
                        <td className="p-3">
                          {log.is_allowed ? (
                            <Badge className="bg-success/20 text-success border-success/30">PERMITIDO</Badge>
                          ) : (
                            <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                              <AlertTriangle className="h-3 w-3" /> NEGADO
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground max-w-xs truncate">
                          {log.policy_name || "N/A"}
                        </td>
                      </tr>
                    ))}
                    {!logs?.length && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground italic">
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
    </MainLayout>
  );
}
