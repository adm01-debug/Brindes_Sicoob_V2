import React from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatters";
import { format } from "date-fns";
import { Check, X, Clock, AlertTriangle, Eye, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

export default function GestorApprovalsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: approvals, isLoading } = useQuery({
    queryKey: ["sicoob-pending-approvals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sicoob_approval_requests')
        .select(`
          *,
          sicoob_orders (
            id,
            total_amount,
            status,
            postos_atendimento (nome),
            created_at,
            profiles:created_by (full_name)
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching approvals:", error);
        throw error;
      }
      return data;
    }
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, orderId }: { id: string, orderId: string }) => {
      // In a real scenario, this would be a single transaction or a database function
      // First update the request
      const { error: reqError } = await supabase
        .from('sicoob_approval_requests')
        .update({ 
          status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (reqError) throw reqError;

      // Then update the order
      const { error: orderError } = await supabase
        .from('sicoob_orders')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (orderError) throw orderError;
    },
    onSuccess: () => {
      toast.success("Pedido aprovado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["sicoob-pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["sicoob-gestor-stats"] });
    },
    onError: (error) => {
      console.error("Error approving:", error);
      toast.error("Erro ao aprovar pedido.");
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, orderId, reason }: { id: string, orderId: string, reason: string }) => {
      const { error: reqError } = await supabase
        .from('sicoob_approval_requests')
        .update({ 
          status: 'rejected',
          rejection_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (reqError) throw reqError;

      const { error: orderError } = await supabase
        .from('sicoob_orders')
        .update({ 
          status: 'rejected'
        })
        .eq('id', orderId);

      if (orderError) throw orderError;
    },
    onSuccess: () => {
      toast.success("Pedido rejeitado.");
      queryClient.invalidateQueries({ queryKey: ["sicoob-pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["sicoob-gestor-stats"] });
    },
    onError: (error) => {
      console.error("Error rejecting:", error);
      toast.error("Erro ao rejeitar pedido.");
    }
  });

  const handleApprove = (id: string, orderId: string) => {
    if (confirm("Tem certeza que deseja aprovar este pedido?")) {
      approveMutation.mutate({ id, orderId });
    }
  };

  const handleReject = (id: string, orderId: string) => {
    const reason = prompt("Por favor, informe o motivo da rejeição:");
    if (reason) {
      rejectMutation.mutate({ id, orderId, reason });
    }
  };

  return (
    <MainLayout>
      <PageSEO title="Aprovações Pendentes" description="Gerencie pedidos que excederam o orçamento." path="/gestor/aprovacoes" noIndex />
      <div className="container mx-auto p-6 space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-display tracking-tight text-sicoob-green-dark">Fila de Aprovações</h1>
            <p className="text-muted-foreground">Pedidos que aguardam validação por excederem o orçamento do PA.</p>
          </div>
        </div>

        <Card className="border-[1.5px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Solicitações Pendentes
            </CardTitle>
            <CardDescription>
              Analise cuidadosamente cada pedido antes de aprovar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : approvals?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Check className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Nenhuma aprovação pendente no momento.</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Data Solicitação</TableHead>
                      <TableHead>PA / Solicitante</TableHead>
                      <TableHead>Valor Pedido</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Excesso</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvals?.map((req) => {
                      const excess = req.amount_at_request - req.threshold_at_request;
                      return (
                        <TableRow key={req.id}>
                          <TableCell className="text-sm">
                            {format(new Date(req.created_at), 'dd/MM/yyyy HH:mm')}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{req.sicoob_orders?.postos_atendimento?.nome}</div>
                            <div className="text-xs text-muted-foreground">{req.sicoob_orders?.profiles?.full_name}</div>
                          </TableCell>
                          <TableCell className="font-semibold text-sicoob-green-dark">
                            {formatCurrency(req.amount_at_request)}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm" title={req.request_reason}>
                            {req.request_reason}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-red-600 bg-red-50 border-red-200 gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {formatCurrency(excess)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" asChild>
                                <Link to={`/sicoob/pedidos/${req.order_id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                                onClick={() => handleReject(req.id, req.order_id)}
                                disabled={approveMutation.isPending || rejectMutation.isPending}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                className="bg-sicoob-green hover:bg-sicoob-green-dark text-white"
                                onClick={() => handleApprove(req.id, req.order_id)}
                                disabled={approveMutation.isPending || rejectMutation.isPending}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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