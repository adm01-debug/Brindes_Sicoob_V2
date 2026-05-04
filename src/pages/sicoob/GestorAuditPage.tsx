import React from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { History, Search, FileText, CheckCircle, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function GestorAuditPage() {
  const [searchTerm, setSearchTerm] = React.useState("");

  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ["sicoob-gestor-audit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sicoob_manager_audit')
        .select(`
          *,
          sicoob_orders (
            id,
            total_amount,
            postos_atendimento (nome)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error("Error fetching audit logs:", error);
        throw error;
      }
      return data;
    }
  });

  const filteredLogs = auditLogs?.filter(log => 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.sicoob_orders?.postos_atendimento?.nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MainLayout>
      <PageSEO title="Log de Auditoria" description="Histórico de ações realizadas por gestores." path="/gestor/auditoria" noIndex />
      <div className="container mx-auto p-6 space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-display tracking-tight text-sicoob-green-dark">Auditoria de Gestão</h1>
            <p className="text-muted-foreground">Rastreabilidade total das aprovações e ações administrativas.</p>
          </div>
        </div>

        <Card className="border-[1.5px]">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-sicoob-green" />
                Histórico de Ações
              </CardTitle>
              <CardDescription>
                Últimas 100 ações registradas no sistema.
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Filtrar ações ou PA..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : filteredLogs?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Nenhum registro de auditoria encontrado.</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>PA Alvo</TableHead>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs?.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs">
                          {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss')}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={
                              log.action === 'approve' 
                                ? "bg-status-delivered/10 text-status-delivered border-status-delivered/20 gap-1" 
                                : log.action === 'reject' 
                                  ? "bg-destructive/10 text-destructive border-destructive/20 gap-1"
                                  : "gap-1"
                            }
                          >
                            {log.action === 'approve' ? <CheckCircle className="h-3 w-3" /> : log.action === 'reject' ? <XCircle className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                            {log.action === 'approve' ? 'Aprovação' : log.action === 'reject' ? 'Rejeição' : log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {log.sicoob_orders?.postos_atendimento?.nome || "Sistema"}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {log.order_id ? `#${log.order_id.substring(0, 8)}` : '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">
                          {JSON.stringify(log.details)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}