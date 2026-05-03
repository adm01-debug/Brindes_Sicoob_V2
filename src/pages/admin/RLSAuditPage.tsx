import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, FileText, AlertTriangle, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

export default function RLSAuditPage() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["rls_audit_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sicoob_rls_audit_logs")
        .select(`
          *,
          user:profiles!user_id(display_name, role)
        `)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    }
  });

  return (
    <MainLayout>
      <PageSEO title="Auditoria de RLS - Sicoob" description="Monitoramento de segurança e acesso." path="/admin/seguranca/rls" />
      
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-8 w-8 text-sicoob-green-dark" />
          <h1 className="text-2xl font-bold text-sicoob-green-dark">Relatório de Auditoria RLS</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Logs de Acesso Recentes
            </CardTitle>
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
