import React, { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Check, X, Eye, ShieldCheck, AlertCircle, Clock, Download, FileJson, Calendar as CalendarIcon, History } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function GestorApprovalsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pending");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });

  const { data: pendingOrders, isLoading } = useQuery({
    queryKey: ["pending_approvals_list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          singular:singular_id(name, razao_social)
        `)
        .eq("status", "enviado_gestor")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const { data: approvalHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["approval_history_list", dateRange],
    queryFn: async () => {
      let query = supabase
        .from("order_approval_history")
        .select(`
          *,
          order:order_id(order_number, client_name, client_company),
          approver:approver_id(full_name, email)
        `)
        .order("created_at", { ascending: false });

      if (dateRange.from) {
        query = query.gte("created_at", dateRange.from.toISOString());
      }
      if (dateRange.to) {
        query = query.lte("created_at", dateRange.to.toISOString());
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const exportToCSV = () => {
    if (!approvalHistory || approvalHistory.length === 0) {
      toast.error("Nenhum dado para exportar.");
      return;
    }

    const headers = ["ID Pedido", "Data", "Decisão", "Subtotal", "Limite na Época", "Aprovador", "Motivo"];
    const rows = approvalHistory.map(h => [
      h.order?.order_number || h.order_id,
      format(new Date(h.created_at), "dd/MM/yyyy HH:mm"),
      h.decision === 'approved' ? 'Aprovado' : 'Reprovado',
      h.subtotal_at_time,
      h.threshold_at_time || "N/A",
      h.approver?.full_name || h.approver?.email || "N/A",
      h.reason || ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `historico_alçadas_${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.click();
    toast.success("Histórico exportado com sucesso!");
  };

  const approveMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const order = pendingOrders?.find(o => o.id === orderId);
      
      const { error: updateError } = await supabase
        .from("orders")
        .update({ status: "aprovado_gestor" })
        .eq("id", orderId);
      if (updateError) throw updateError;

      await supabase.from("order_approval_history").insert({
        order_id: orderId,
        approver_id: user?.id,
        decision: "approved",
        subtotal_at_time: order?.total || 0,
        reason: "Aprovação manual via painel de gestão."
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending_approvals_list"] });
      toast.success("Pedido aprovado com sucesso!");
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const order = pendingOrders?.find(o => o.id === orderId);
      
      const { error: updateError } = await supabase
        .from("orders")
        .update({ status: "cancelado" })
        .eq("id", orderId);
      if (updateError) throw updateError;

      await supabase.from("order_approval_history").insert({
        order_id: orderId,
        approver_id: user?.id,
        decision: "rejected",
        subtotal_at_time: order?.total || 0,
        reason: "Pedido reprovado pelo gestor da Singular."
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending_approvals_list"] });
      toast.error("Pedido reprovado.");
    }
  });

  return (
    <MainLayout>
      <PageSEO title="Fila de Aprovações" description="Gerencie as aprovações de alçada da sua Singular." path="/gestor/aprovacoes" />
      
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            Fila de Aprovações
          </h1>
          <p className="text-muted-foreground">Analise pedidos que excederam o limite de alçada dos PAs.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Solicitações Pendentes</CardTitle>
            <CardDescription>Pedidos aguardando sua validação para seguir para o vendedor.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground">Carregando fila...</div>
            ) : pendingOrders?.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground space-y-3">
                <Check className="h-10 w-10 mx-auto opacity-20" />
                <p>Nenhuma aprovação pendente no momento.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Motivo Alçada</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingOrders?.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold">#{order.order_number}</span>
                          <span className="text-xs text-muted-foreground">{order.client_company || order.client_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {new Date(order.created_at).toLocaleDateString("pt-BR")}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">{formatCurrency(order.total || 0)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1.5 border-amber-200 bg-amber-50 text-amber-700">
                          <AlertCircle className="h-3 w-3" />
                          Excedeu Alçada (PA)
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" asChild>
                            <Link to={`/pedidos/${order.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => rejectMutation.mutate(order.id)}
                            disabled={rejectMutation.isPending}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="default" 
                            size="icon" 
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => approveMutation.mutate(order.id)}
                            disabled={approveMutation.isPending}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
