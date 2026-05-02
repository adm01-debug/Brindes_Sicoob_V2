import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
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
  ImageIcon,
  History,
  Layout
} from "lucide-react";
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
import { useApprovalThreshold } from "@/hooks/useApprovalThreshold";
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
import { useSicoobOrder, useSicoobOrderDetails } from "@/hooks/sicoob/useSicoobOrder";
import { OrderStatusBadge } from "@/components/sicoob/orders/OrderStatusBadge";
import { OrderActionDialog } from "@/components/sicoob/orders/OrderActionDialog";
import { OrderItemsHistory } from "@/components/sicoob/orders/OrderItemsHistory";
import { OrderAuditTimeline } from "@/components/sicoob/orders/OrderAuditTimeline";
import { 
  useOrderLogistics, 
  useOrderInvoices, 
  useOrderPayments, 
  useOrderPilotApprovals,
  useOrderComments,
  useOrderTemplates
} from "@/hooks/useOrderExtensions";
import { OrderLogisticsTab } from "@/components/sicoob/orders/OrderLogisticsTab";
import { OrderInvoicesTab } from "@/components/sicoob/orders/OrderInvoicesTab";
import { OrderPaymentsTab } from "@/components/sicoob/orders/OrderPaymentsTab";
import { OrderPilotApprovalsTab } from "@/components/sicoob/orders/OrderPilotApprovalsTab";
import { OrderTemplatesTab } from "@/components/sicoob/orders/OrderTemplatesTab";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const canTransitionTo = (current: string, next: string) => {
  const transitions: Record<string, string[]> = {
    pending: ["in_production", "cancelled"],
    in_production: ["in_separation", "cancelled"],
    in_separation: ["in_transit", "cancelled"],
    in_transit: ["delivered", "cancelled"],
    delivered: ["completed"],
    completed: [],
    cancelled: []
  };
  return transitions[current]?.includes(next) || current === next;
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, isSupervisorOrAbove, isGerentePa } = useAuth();
  
  const [requestReason, setRequestReason] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedVariantColor, setSelectedVariantColor] = useState<string | null>(null);
  const [itemQuantity, setItemQuantity] = useState(1);

  const { data: orderData, isLoading: isLoadingOrder, refetch: refetchOrder } = useSicoobOrder(id);
  const { items: orderItems, logs: itemLogs } = useSicoobOrderDetails(id);

  const { budget, remainingBudget } = usePaBudget(orderData?.pa_id);
  const { threshold, needsApproval } = useApprovalThreshold();
  const { requests, createRequest, approveRequest, rejectRequest, updateStatus } = useApprovalRequests(id);
  const { history: orderHistory } = useSicoobOrderHistory(id);
  const { addItem, removeItem } = useSicoobOrderItems(id);
  
  // Extension hooks
  const { logistics, updateLogistics } = useOrderLogistics(id);
  const { invoices, addInvoice, uploadFile } = useOrderInvoices(id);
  const { payments } = useOrderPayments(id);
  const { approvals, updateApprovalStatus } = useOrderPilotApprovals(id);
  
  const { data: categories } = useCategories();
  const { data: products, isLoading: isLoadingProducts } = useProducts(
    { 
      search: productSearch, 
      category: selectedCategoryId !== "all" ? selectedCategoryId : undefined,
      limit: 20 
    }, 
    { enabled: isAddItemDialogOpen }
  );

  const selectedProduct = useMemo(() => 
    products?.find(p => p.id === selectedProductId),
  [products, selectedProductId]);

  const activeRequest = useMemo(() => 
    requests?.find(r => r.status === 'pending'), 
  [requests]);

  const handleAddItem = () => {
    if (!selectedProduct) return;

    const variantLabel = selectedVariantColor ? ` (${selectedVariantColor})` : "";
    
    addItem.mutate({
      productId: selectedProduct.id,
      productName: `${selectedProduct.name}${variantLabel}`,
      quantity: itemQuantity,
      unitPrice: selectedProduct.price,
    }, {
      onSuccess: () => {
        setIsAddItemDialogOpen(false);
        setProductSearch("");
        setSelectedCategoryId("all");
        setSelectedProductId(null);
        setSelectedVariantColor(null);
        setItemQuantity(1);
      }
    });
  };

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
      amount: orderTotal,
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
      updateStatus.mutate({ 
        orderId: id!, 
        newStatus: 'confirmed', 
        previousStatus: orderData.status,
        comment: 'Aprovação direta por gestor'
      });
    }
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      toast.error("Por favor, informe o motivo da rejeição");
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
      updateStatus.mutate({
        orderId: id!,
        newStatus: 'rejected',
        previousStatus: orderData.status,
        comment: rejectionReason
      }, {
        onSuccess: () => {
          setIsRejectDialogOpen(false);
          setRejectionReason("");
        }
      });
    }
  };

  const handleStatusUpdate = async (newStatus: any) => {
    try {
      const currentStatus = orderData?.fulfillment_status || 'pending';
      
      // Validação de transição (Sincronização bidirecional/Bloqueio)
      if (!canTransitionTo(currentStatus, newStatus)) {
        toast.error(`Transição inválida de ${currentStatus} para ${newStatus}`);
        return;
      }

      const { error } = await supabase
        .from('orders')
        .update({ fulfillment_status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;

      toast.success("Status de produção atualizado");
      refetchOrder();
    } catch (error: any) {
      toast.error("Erro ao atualizar status: " + error.message);
    }
  };

  if (isLoadingOrder) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <p>Carregando detalhes do pedido...</p>
        </div>
      </MainLayout>
    );
  }

  const canApprove = isSupervisorOrAbove || (isGerentePa && orderData?.pa_id === profile?.pa_id);
  
  // Controle de permissões por aba
  const allowedTabs = useMemo(() => {
    const tabs = ["status", "logistics", "invoices", "timeline"];
    if (isSupervisorOrAbove) {
      tabs.push("payments", "approvals", "templates");
    }
    return tabs;
  }, [isSupervisorOrAbove]);

  return (
    <MainLayout>
      <PageSEO title={`Pedido #${orderData?.order_number || id} - Sicoob`} description="Detalhes do pedido Sicoob." path={`/sicoob/pedidos/${id}`} noIndex />
...
      <div className="space-y-6">
        {activeRequest && (
          <Alert className="bg-amber-500/10 border-amber-500/20">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <AlertTitle className="text-amber-700">Solicitação de Aprovação Pendente</AlertTitle>
            <AlertDescription className="text-amber-600">
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

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/sicoob/pedidos")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Pedido #{orderData.order_number}</h1>
              <OrderStatusBadge status={orderData.status} />
            </div>
            <p className="text-sm text-muted-foreground">Criado em {new Date(orderData.created_at).toLocaleString('pt-BR')}</p>
          </div>
          <div className="ml-auto flex gap-2">
            {activeRequest && canApprove ? (
              <>
                <Button variant="outline" className="text-destructive" onClick={() => setIsRejectDialogOpen(true)}>
                  Rejeitar
                </Button>

                <OrderActionDialog
                  isOpen={isRejectDialogOpen}
                  onOpenChange={setIsRejectDialogOpen}
                  title="Rejeitar Pedido"
                  description="Informe o motivo da rejeição deste pedido."
                  placeholder="Motivo da rejeição..."
                  confirmLabel="Confirmar Rejeição"
                  confirmVariant="destructive"
                  value={rejectionReason}
                  onValueChange={setRejectionReason}
                  onConfirm={handleReject}
                />

                <Button 
                  className="bg-emerald-600 hover:bg-emerald-700" 
                  onClick={handleApprove}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Aprovar Pedido
                </Button>
              </>
            ) : orderData.status === 'pending' && isOverThreshold && !activeRequest ? (
              <>
                <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setIsRequestDialogOpen(true)}>
                  Solicitar Aprovação
                </Button>

                <OrderActionDialog
                  isOpen={isRequestDialogOpen}
                  onOpenChange={setIsRequestDialogOpen}
                  title="Solicitar Aprovação de Alçada"
                  description={`Este pedido de R$ ${orderTotal.toLocaleString('pt-BR')} excede sua alçada de R$ ${threshold.toLocaleString('pt-BR')}. Justifique a necessidade deste pedido:`}
                  placeholder="Ex: Reposição urgente de material promocional..."
                  confirmLabel="Enviar Solicitação"
                  confirmVariant="default"
                  value={requestReason}
                  onValueChange={setRequestReason}
                  onConfirm={handleRequestApproval}
                />
              </>
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
                  {orderData.status === 'pending' && (
                    <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="gap-2">
                          <Plus className="h-4 w-4" />
                          Adicionar Item
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Adicionar Item ao Pedido</DialogTitle>
                          <DialogDescription>
                            Busque um produto e informe a quantidade.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input 
                                placeholder="Buscar produto..." 
                                className="pl-9"
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                              />
                            </div>
                            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                              <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Categoria" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Todas</SelectItem>
                                {categories?.map(cat => (
                                  <SelectItem key={cat.id} value={cat.id.toString()}>
                                    {cat.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-1">
                            {isLoadingProducts ? (
                              <div className="p-4 text-center text-xs text-muted-foreground">Carregando produtos...</div>
                            ) : products?.length === 0 ? (
                              <div className="p-4 text-center text-xs text-muted-foreground">Nenhum produto encontrado.</div>
                            ) : (
                              products?.map(product => (
                                <div 
                                  key={product.id}
                                  className={`p-2 border rounded cursor-pointer flex justify-between items-center transition-colors ${selectedProductId === product.id ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}
                                  onClick={() => {
                                    setSelectedProductId(product.id);
                                    setSelectedVariantColor(null); // Reset variation when changing product
                                  }}
                                >
                                  <div>
                                    <p className="text-sm font-medium">{product.name}</p>
                                    <p className="text-xs text-muted-foreground">R$ {product.price.toLocaleString('pt-BR')}</p>
                                  </div>
                                  {selectedProductId === product.id && <CheckCircle className="h-4 w-4 text-primary" />}
                                </div>
                              ))
                            )}
                          </div>

                          {selectedProduct && selectedProduct.colors && selectedProduct.colors.length > 0 && (
                            <div className="space-y-2">
                              <label className="text-xs font-medium">Variação de Cor</label>
                              <div className="flex flex-wrap gap-2">
                                {selectedProduct.colors.map((color, idx) => (
                                  <button
                                    key={`${color.name}-${idx}`}
                                    type="button"
                                    onClick={() => setSelectedVariantColor(color.name)}
                                    className={cn(
                                      "px-3 py-1.5 rounded-full text-xs border transition-all",
                                      selectedVariantColor === color.name 
                                        ? "bg-primary text-primary-foreground border-primary" 
                                        : "bg-background hover:border-primary/50"
                                    )}
                                  >
                                    {color.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {selectedProductId && (
                            <div className="flex items-center gap-4 pt-2">
                              <div className="flex-1 space-y-1">
                                <label className="text-xs font-medium">Quantidade</label>
                                <Input 
                                  type="number" 
                                  min="1" 
                                  value={itemQuantity}
                                  onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsAddItemDialogOpen(false)}>Cancelar</Button>
                          <Button disabled={!selectedProductId || (selectedProduct?.colors?.length > 0 && !selectedVariantColor) || addItem.isPending} onClick={handleAddItem}>
                            {addItem.isPending ? "Adicionando..." : "Confirmar"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
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
                    Aprovações
                  </TabsTrigger>
                )}
                {allowedTabs.includes("templates") && (
                  <TabsTrigger value="templates" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 pb-2 h-auto">
                    <Layout className="h-4 w-4 mr-2" />
                    Templates
                  </TabsTrigger>
                )}
                {allowedTabs.includes("timeline") && (
                  <TabsTrigger value="timeline" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 pb-2 h-auto">
                    <History className="h-4 w-4 mr-2" />
                    Timeline
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="items" className="space-y-4 pt-4">
                <Card>
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
                  <OrderLogisticsTab orderId={id!} />
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
              
              {allowedTabs.includes("templates") && (
                <TabsContent value="templates" className="pt-6">
                  <OrderTemplatesTab orderId={id!} />
                </TabsContent>
              )}

              {allowedTabs.includes("timeline") && (
                <TabsContent value="timeline" className="pt-6">
                  <OrderAuditTimeline orderId={id!} />
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
                    value={orderData.fulfillment_status || 'pending'} 
                    onValueChange={handleStatusUpdate}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="in_production">Em Produção</SelectItem>
                      <SelectItem value="in_separation">Em Separação</SelectItem>
                      <SelectItem value="in_transit">Em Trânsito</SelectItem>
                      <SelectItem value="delivered">Entregue</SelectItem>
                      <SelectItem value="completed">Concluído</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
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
                    <span className={isOverBudget ? "text-destructive font-bold flex items-center gap-1" : "text-emerald-600 font-bold"}>
                      {isOverBudget && <AlertTriangle className="h-3 w-3" />}
                      R$ {remainingBudget.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden relative">
                    <div 
                      className={`h-full transition-all duration-500 ${isOverBudget ? 'bg-destructive' : 'bg-emerald-500'}`} 
                      style={{ width: `${Math.min((orderTotal / Math.max(remainingBudget, 1)) * 100, 100)}%` }} 
                    />
                  </div>
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
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Dentro da alçada e verba disponível.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
