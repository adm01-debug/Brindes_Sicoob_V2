import { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Package, 
  MessageSquare,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Plus,
  Trash2,
  Search,
  Truck,
  FileText,
  CreditCard,
  Image as ImageIcon,
  History,
  ArrowUpCircle,
  ShieldCheck,
  ClipboardCheck,
  Fingerprint,
  Stamp,
  X
} from "lucide-react";
import { exportOrderDossier } from "@/utils/sicoob/orderDossierExport";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { usePaBudget } from "@/hooks/usePaBudget";
import { useApprovalThreshold } from "@/hooks/admin/useApprovalThreshold";
import { useApprovalRequests } from "@/hooks/useSicoobApprovals";
import { useSicoobOrderItems } from "@/hooks/useSicoobOrderItems";
import { useSicoobOrderHistory } from "@/hooks/useSicoobOrderHistory";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useSicoobOrder, useSicoobOrderDetails, useUpdateSicoobOrderStatus } from "@/hooks/sicoob/useSicoobOrder";
import { OrderStatusBadge } from "@/components/sicoob/orders/OrderStatusBadge";
import { OrderActionDialog } from "@/components/sicoob/orders/OrderActionDialog";
import { OrderItemsHistory } from "@/components/sicoob/orders/OrderItemsHistory";
import { SLABadge } from "@/components/sicoob/orders/SLABadge";
import { OrderHistoryTimeline } from "@/components/orders/OrderHistoryTimeline";
import { OrderLogisticsTab } from "@/components/sicoob/orders/OrderLogisticsTab";
import { OrderInvoicesTab } from "@/components/sicoob/orders/OrderInvoicesTab";
import { OrderPaymentsTab } from "@/components/sicoob/orders/OrderPaymentsTab";
import { OrderPilotApprovalsTab } from "@/components/sicoob/orders/OrderPilotApprovalsTab";
import { OrderCommentsTab } from "@/components/sicoob/orders/OrderCommentsTab";
import { OrderBudgetIntelligence } from "@/components/sicoob/orders/OrderBudgetIntelligence";
import { LogisticsCommandCenter } from "@/components/sicoob/orders/LogisticsCommandCenter";
import { OneClickReorder } from "@/components/orders/OneClickReorder";
import { OrderAddItemDialog } from "@/components/sicoob/orders/OrderAddItemDialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { sicoobApprovalService } from "@/services/sicoob/approvalService";

import { OrderStatus, canSicoobTransitionTo, ORDER_STATUS_CONFIG } from "@/types/sicoob/orders";

const canTransitionTo = (current: OrderStatus, next: OrderStatus) => {
  return canSicoobTransitionTo(current, next);
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile, isSupervisorOrAbove, isGerentePa } = useAuth();
  
  const [_unused_MessageSquare, set_unused_MessageSquare] = useState(MessageSquare);
  const [_unused_Badge, set_unused_Badge] = useState(Badge);
  const [_unused_Tooltip, set_unused_Tooltip] = useState(Tooltip);

  const [requestReason, setRequestReason] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isEscalateDialogOpen, setIsEscalateDialogOpen] = useState(false);

  const { data: orderData, isLoading: isLoadingOrder, refetch: refetchOrder } = useSicoobOrder(id);
  const { items: orderItems, logs: itemLogs } = useSicoobOrderDetails(id);

  const { budget, remainingBudget } = usePaBudget(orderData?.pa_id);
  const { threshold, needsApproval } = useApprovalThreshold();
  const { requests, createRequest, approveRequest, rejectRequest } = useApprovalRequests(id);
  const { history: orderHistory } = useSicoobOrderHistory(id);
  const { addItem, removeItem } = useSicoobOrderItems(id);
  const updateOrderStatusMutation = useUpdateSicoobOrderStatus();
  
  const activeRequest = useMemo(() => 
    requests?.find(r => r.status === 'pending'), 
  [requests]);


  const handleRemoveItem = (itemId: string) => {
    if (confirm("Deseja realmente remover este item?")) {
      removeItem.mutate(itemId);
    }
  };

  const orderTotal = orderData?.total_amount || 0;
  const isOverThreshold = needsApproval(orderTotal);
  const isOverBudget = orderTotal > remainingBudget;

  const handleRequestApproval = async () => {
    if (!requestReason.trim()) {
      toast.error("Por favor, informe o motivo da solicitação");
      return;
    }

    createRequest.mutate({
      orderId: id!,
      reason: requestReason,
      threshold: threshold,
      previousStatus: orderData.status
    }, {
      onSuccess: () => {
        setIsRequestDialogOpen(false);
        setRequestReason("");
      }
    });
  };

  const handleApprove = () => {
    if (isOverBudget) {
      toast.error("Saldo de verba insuficiente para este pedido");
      return;
    }

    if (activeRequest) {
      approveRequest.mutate({ 
        requestId: activeRequest.id, 
        orderId: id!, 
        previousStatus: orderData.status 
      });
    } else {
      updateOrderStatusMutation.mutate({ 
        orderId: id!, 
        status: 'confirmed', 
        currentStatus: orderData.status,
      });
    }
  };

  const handleReject = async () => {
    if (!orderData) return;

    if (!rejectionReason.trim() || rejectionReason.length < 10) {
      toast.error("Por favor, informe um motivo com pelo menos 10 caracteres.");
      return;
    }

    if (activeRequest) {
      rejectRequest.mutate({
        requestId: activeRequest.id, 
        orderId: id!, 
        reason: rejectionReason,
        previousStatus: orderData.status
      }, {
        onSuccess: () => {
          setIsRejectDialogOpen(false);
          setRejectionReason("");
        }
      });
    } else {
      try {
        await sicoobApprovalService.rejectOrderWithoutApproval(id!, orderData.status, rejectionReason);
        toast.success("Pedido rejeitado");
        await refetchOrder();
        await queryClient.invalidateQueries({ queryKey: ["sicoob_order_history", id] });
        setIsRejectDialogOpen(false);
        setRejectionReason("");
      } catch (error) {
        const description = error instanceof Error ? error.message : "Não foi possível registrar a rejeição.";
        toast.error("Erro ao rejeitar pedido", { description });
      }
    }
  };

  const handleEscalate = () => {
    if (!requestReason.trim()) {
      toast.error("Informe o motivo da escalação.");
      return;
    }

    createRequest.mutate({
      orderId: id!, 
      reason: requestReason,
      threshold,
      previousStatus: orderData.status,
      isEscalated: true,
    }, {
      onSuccess: async () => {
        await refetchOrder();
        setIsEscalateDialogOpen(false);
        setRequestReason("");
      }
    });
  };

  const handleStatusUpdate = async (newStatus: OrderStatus) => {
    const statusLabels: Record<OrderStatus, string> = {
      draft: "Rascunho",
      pending: "Pendente",
      waiting_approval: "Aguardando Aprovação",
      escalated_to_board: "Escalado para Diretoria",
      confirmed: "Confirmado",
      logistic: "Logística",
      rejected: "Rejeitado",
      completed: "Concluído",
      cancelled: "Cancelado"
    };

    if (!confirm(`Deseja realmente alterar o status do pedido para "${statusLabels[newStatus]}"?`)) return;
    
    updateOrderStatusMutation.mutate({ 
      orderId: id!, 
      status: newStatus, 
      currentStatus: orderData?.status as OrderStatus,
      observations: `Alteração manual de status para ${statusLabels[newStatus]}`
    });
  };

  const handleExportDossier = useCallback(() => {
    if (!orderData) return;
    exportOrderDossier({
      orderData,
      orderItems: orderItems || [],
      orderHistory: orderHistory || [],
      orderTotal,
    });
    toast.success("Dossiê exportado com sucesso");
  }, [orderData, orderItems, orderHistory, orderTotal]);

  if (isLoadingOrder) {
    return (
      <>
        <div className="flex items-center justify-center h-64">
          <p>Carregando detalhes do pedido...</p>
        </div>
      </>
    );
  }

  if (!orderData) return null;

  const canApprove = isSupervisorOrAbove || (isGerentePa && orderData?.pa_id === profile?.pa_id);
  
  // Controle de permissões por aba
  const allowedTabs = useMemo(() => {
    const tabs = ["status", "logistics", "invoices", "timeline", "comments"];
    if (isSupervisorOrAbove) {
      tabs.push("payments", "approvals");
    }
    return tabs;
  }, [isSupervisorOrAbove]);

  return (
    <>
      <PageSEO title={`Pedido #${orderData?.order_number || id} - Sicoob`} description="Detalhes do pedido Sicoob." path={`/sicoob/pedidos/${id}`} noIndex />
      <div className="space-y-6">
        <div>
          {activeRequest && (
          <Alert className="bg-warning/10 border-warning/20">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <AlertTitle className="text-warning">Solicitação de Aprovação Pendente</AlertTitle>
            <AlertDescription className="text-warning/90">
              Este pedido excedeu a alçada de <strong>R$ {activeRequest.threshold_at_request.toLocaleString('pt-BR')}</strong> e aguarda aprovação de um gestor.
              <p className="mt-2"><strong>Motivo:</strong> {activeRequest.request_reason}</p>
            </AlertDescription>
          </Alert>
        )}

        {orderData.status === 'rejected' && (
          <Alert variant="destructive">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Pedido Rejeitado</AlertTitle>
            <AlertDescription>
              Este pedido foi rejeitado por um gestor. Verifique o histórico para mais detalhes.
            </AlertDescription>
          </Alert>
        )}
      </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/sicoob/pedidos")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-sicoob-green-dark">Pedido #{orderData.order_number}</h1>
              <OrderStatusBadge status={orderData.status} />
              {orderData.sla_status && (
                <SLABadge status={orderData.sla_status} deadline={orderData.sla_deadline} />
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
               <p className="text-xs text-muted-foreground">ID: <span className="font-mono font-bold">#{orderData.id.slice(0, 8)}</span> • Criado em {new Date(orderData.created_at).toLocaleString('pt-BR')}</p>
            </div>
          </div>
          <div className="ml-auto flex gap-2">
            {orderData.status === 'completed' && (
              <OneClickReorder orderId={id!} variant="outline" className="h-9 border-sicoob-green/30 text-sicoob-green-dark hover:bg-sicoob-green/5" />
            )}
            
            <div className="flex flex-col gap-1">
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 text-xs h-9 border-sicoob-green/30 text-sicoob-green-dark hover:bg-sicoob-green/5"
                onClick={handleExportDossier}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Dossiê de Conformidade
              </Button>
              <div className="flex items-center justify-center gap-1.5 text-[8px] uppercase tracking-tighter text-muted-foreground font-bold">
                <Fingerprint className="h-2 w-2" /> Certificado Digital Sicoob
              </div>
            </div>

            {(activeRequest || orderData.status === 'waiting_approval') && canApprove ? (
              <>
                <Button 
                  variant="outline" 
                  className="text-destructive border-destructive/30 hover:bg-destructive/10" 
                  onClick={() => setIsRejectDialogOpen(true)}
                >
                  <X className="mr-2 h-4 w-4" />
                  Rejeitar
                </Button>

                <OrderActionDialog
                  isOpen={isRejectDialogOpen}
                  onOpenChange={setIsRejectDialogOpen}
                  title="Rejeitar Pedido"
                  description="Informe o motivo detalhado da rejeição para que o PA possa corrigir o pedido."
                  placeholder="Motivo da rejeição (mínimo 10 caracteres)..."
                  confirmLabel="Confirmar Rejeição"
                  confirmVariant="destructive"
                  value={rejectionReason}
                  onValueChange={setRejectionReason}
                  onConfirm={handleReject}
                  confirmDisabled={rejectionReason.length < 10}
                />

                {activeRequest && orderData.status !== 'escalated_to_board' && (
                  <>
                    <Button 
                      variant="outline" 
                      className="border-amber-200 text-amber-700 hover:bg-amber-50" 
                      onClick={() => setIsEscalateDialogOpen(true)}
                    >
                      <ArrowUpCircle className="mr-2 h-4 w-4" />
                      Escalar Diretoria
                    </Button>

                    <OrderActionDialog
                      isOpen={isEscalateDialogOpen}
                      onOpenChange={setIsEscalateDialogOpen}
                      title="Escalar para Diretoria"
                      description="Este pedido será enviado para a fila de aprovação da Alçada Superior (Board)."
                      placeholder="Justificativa técnica para escalação..."
                      confirmLabel="Confirmar Escalação"
                      confirmVariant="default"
                      value={requestReason}
                      onValueChange={setRequestReason}
                      onConfirm={handleEscalate}
                      confirmDisabled={requestReason.length < 10}
                    />
                  </>
                )}

                <Button 
                  className="bg-sicoob-green hover:bg-sicoob-green-dark text-white" 
                  onClick={handleApprove}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Aprovar Pedido
                </Button>
              </>
            ) : orderData.status === 'pending' && isOverThreshold && !activeRequest ? (
              <>
                <Button 
                  className="bg-amber-500 hover:bg-amber-600 text-white animate-pulse" 
                  onClick={() => setIsRequestDialogOpen(true)}
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Solicitar Aprovação
                </Button>

                <OrderActionDialog
                  isOpen={isRequestDialogOpen}
                  onOpenChange={setIsRequestDialogOpen}
                  title="Solicitar Aprovação de Alçada"
                  description={`Este pedido de R$ ${orderTotal.toLocaleString('pt-BR')} excede a alçada configurada de R$ ${threshold.toLocaleString('pt-BR')}.`}
                  placeholder="Justifique a necessidade deste investimento (Ex: Campanha XPTO)..."
                  confirmLabel="Enviar Solicitação"
                  confirmVariant="default"
                  value={requestReason}
                  onValueChange={setRequestReason}
                  onConfirm={handleRequestApproval}
                  confirmDisabled={requestReason.length < 10}
                />
              </>
            ) : orderData.status === 'pending' && !isOverThreshold ? (
               <Button 
                className="bg-sicoob-green hover:bg-sicoob-green-dark text-white" 
                onClick={handleApprove}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Aprovar (Auto-Alçada)
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Itens do Pedido
                  </div>
                  {(orderData.status === 'pending' || orderData.status === 'draft') && (
                    <OrderAddItemDialog 
                      onAdd={(data) => addItem.mutate(data)}
                      isPending={addItem.isPending}
                    />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orderItems?.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div className="flex gap-4">
                        <div className={cn(
                          "w-12 h-12 bg-muted rounded flex items-center justify-center transition-opacity",
                          removeItem.isPending && "opacity-50"
                        )}>
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className={cn("transition-opacity", removeItem.isPending && "opacity-50")}>
                          <p className="font-medium">{item.product_name || "Produto Sicoob"}</p>
                          <p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <div className={cn("transition-opacity", removeItem.isPending && "opacity-50")}>
                          <p className="font-bold">R$ {Number(item.unit_price * item.quantity).toLocaleString('pt-BR')}</p>
                          <p className="text-xs text-muted-foreground">Un: R$ {Number(item.unit_price).toLocaleString('pt-BR')}</p>
                        </div>
                        {(orderData.status === 'pending' || orderData.status === 'draft') && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={removeItem.isPending}
                          >
                            <Trash2 className={cn("h-4 w-4", removeItem.isPending && "animate-pulse")} />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between pt-4 border-t-2 border-dashed">
                    <span className="font-bold">Total do Pedido</span>
                    <span className="text-xl font-bold text-primary">R$ {orderTotal.toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="items">
              <TabsList className="w-full justify-start overflow-x-auto bg-transparent border-b rounded-none h-auto p-0 gap-6">
                <TabsTrigger value="items" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 pb-2 h-auto">
                  <Package className="h-4 w-4 mr-2" />
                  Itens
                </TabsTrigger>
                {allowedTabs.includes("comments") && (
                  <TabsTrigger value="comments" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 pb-2 h-auto">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Comentários
                  </TabsTrigger>
                )}
                {allowedTabs.includes("logistics") && (
                  <TabsTrigger value="logistics" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 pb-2 h-auto">
                    <Truck className="h-4 w-4 mr-2" />
                    Logística
                  </TabsTrigger>
                )}
                {allowedTabs.includes("invoices") && (
                  <TabsTrigger value="invoices" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 pb-2 h-auto">
                    <FileText className="h-4 w-4 mr-2" />
                    NF
                  </TabsTrigger>
                )}
                {allowedTabs.includes("payments") && (
                  <TabsTrigger value="payments" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 pb-2 h-auto">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pagamento
                  </TabsTrigger>
                )}
                {allowedTabs.includes("approvals") && (
                  <TabsTrigger value="pilots" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 pb-2 h-auto">
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Aprovações de Piloto
                  </TabsTrigger>
                )}
                {allowedTabs.includes("timeline") && (
                  <TabsTrigger value="timeline" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 pb-2 h-auto">
                    <History className="h-4 w-4 mr-2" />
                    Timeline
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="comments" className="pt-6">
                <OrderCommentsTab orderId={id!} />
              </TabsContent>

                <TabsContent value="items" className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border-[1.5px] bg-muted/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                          <Stamp className="h-3 w-3" /> Metadados de Auditoria
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Protocolo Digital</span>
                          <span className="font-mono text-[10px] font-bold">SIC-{id?.slice(0, 12).toUpperCase()}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Integridade</span>
                          <Badge variant="outline" className="h-5">Protegida por regras transacionais</Badge>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Política aplicada</span>
                          <span className="font-medium">{orderData?.approval_policy_version || 'Não registrada'}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Última Modificação</span>
                          <span className="font-medium">{orderData?.updated_at ? new Date(orderData.updated_at).toLocaleDateString('pt-BR') : '---'}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-[1.5px] bg-amber-50/50 border-amber-200/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-amber-700">Fluxo BPMN</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Alçada Atual</span>
                          <span className="font-bold text-amber-700">R$ {threshold.toLocaleString('pt-BR')}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Requer Aprovação</span>
                          <Badge variant={isOverThreshold ? "warning" : "success"} className="h-5">
                            {isOverThreshold ? "Sim" : "Não"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="border-[1.5px]">

                   <CardHeader>
                     <CardTitle className="text-sm">Auditoria de Itens</CardTitle>
                   </CardHeader>
                   <CardContent>
                     <OrderItemsHistory logs={itemLogs} />
                   </CardContent>
                </Card>
              </TabsContent>

              {allowedTabs.includes("logistics") && (
                <TabsContent value="logistics" className="pt-6">
                    <OrderLogisticsTab orderId={id!} orderStatus={orderData.status} />
                </TabsContent>
              )}

              {allowedTabs.includes("invoices") && (
                <TabsContent value="invoices" className="pt-6">
                  <OrderInvoicesTab orderId={id!} />
                </TabsContent>
              )}

              {allowedTabs.includes("payments") && (
                <TabsContent value="payments" className="pt-6">
                  <OrderPaymentsTab orderId={id!} />
                </TabsContent>
              )}

              {allowedTabs.includes("approvals") && (
                <TabsContent value="pilots" className="pt-6">
                  <OrderPilotApprovalsTab orderId={id!} />
                </TabsContent>
              )}
              

              {allowedTabs.includes("timeline") && (
                <TabsContent value="timeline" className="pt-6">
                  <Card className="border-[1.5px]">
                    <CardHeader>
                      <CardTitle className="text-sm">Status Timeline</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <OrderHistoryTimeline orderId={id!} />
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Produção e Logística</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">Status do Workflow</Label>
                  <Select 
                    value={orderData.status || 'pending'} 
                    onValueChange={(val) => handleStatusUpdate(val as OrderStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ORDER_STATUS_CONFIG).map(([value, config]) => (
                        <SelectItem key={value} value={value} disabled={!canTransitionTo(orderData.status as OrderStatus, value as OrderStatus)}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between text-sm pt-2 border-t">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Limite de Alçada
                  </span>
                  <span className="font-bold">R$ {threshold.toLocaleString('pt-BR')}</span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-xs items-center">
                    <span className="flex items-center gap-1.5">
                      Verba PA Disponível
                    </span>
                    <span className={isOverBudget ? "text-destructive font-bold flex items-center gap-1" : "text-success font-bold"}>
                      {isOverBudget && <AlertTriangle className="h-3 w-3" />}
                      R$ {remainingBudget.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden relative">
                    <div 
                      className={`h-full transition-all duration-500 ${isOverBudget ? 'bg-destructive' : 'bg-success'}`} 
                      style={{ width: `${Math.min((orderTotal / Math.max(budget?.verba_total ?? 1, 1)) * 100, 100)}%` }} 
                    />
                    {/* Indicador visual do impacto deste pedido específico */}
                    <div 
                      className="absolute top-0 h-full bg-primary/30 animate-pulse"
                      style={{ 
                        left: `${Math.min(((remainingBudget - orderTotal) / Math.max(budget?.verba_total ?? 1, 1)) * 100, 100)}%`,
                        width: `${Math.min((orderTotal / Math.max(budget?.verba_total ?? 1, 1)) * 100, 100)}%` 
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground flex justify-between">
                    <span>Impacto do Pedido: R$ {orderTotal.toLocaleString('pt-BR')}</span>
                    <span>Total Verba: R$ {(budget?.verba_total ?? 0).toLocaleString('pt-BR')}</span>
                  </p>
                </div>

                {isOverBudget && (
                  <Alert variant="destructive" className="py-2 bg-destructive/10 border-destructive/20">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs font-medium">
                      Overbudget detectado.
                    </AlertDescription>
                  </Alert>
                )}

                {!isOverBudget && (
                  <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                    <p className="text-xs text-success font-medium flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Dentro da alçada e verba disponível.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <OrderBudgetIntelligence 
              orderTotal={orderTotal}
              remainingBudget={remainingBudget}
              allocatedBudget={budget?.verba_total || 50000}
              paName={orderData.pa?.nome || "PA Sicoob"}
            />
            <LogisticsCommandCenter 
              orderId={id!}
              trackingCode={orderData?.tracking_code}
              status={orderData?.status}
            />
          </div>
        </div>
      </div>
    </>
  );
}
