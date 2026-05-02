import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Clock, 
  User, 
  MapPin, 
  Package, 
  History,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Plus,
  Trash2,
  Search
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
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

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


  const { data: orderData, isLoading: isLoadingOrder } = useQuery({
    queryKey: ["sicoob_order", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sicoob_orders")
        .select("id, cooperative_id, pa_id, created_by, status, total_amount, notes, delivery_address, tracking_code, created_at, updated_at, approved_by, approved_at, order_number")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  const { data: orderItems } = useQuery({
    queryKey: ["sicoob_order_items", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sicoob_order_items")
        .select("id, order_id, product_id, product_name, quantity, unit_price, total_price")
        .eq("order_id", id);
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  const { budget, remainingBudget } = usePaBudget(orderData?.pa_id);
  const { threshold, needsApproval } = useApprovalThreshold();
  const { requests, createRequest, approveRequest, rejectRequest, updateStatus } = useApprovalRequests(id);
  const { history: orderHistory } = useSicoobOrderHistory(id);
  const { addItem, removeItem } = useSicoobOrderItems(id);
  
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
      // Aprovação direta se for gestor e não houver solicitação pendente
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
            <XCircle className="h-5 w-5" />
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
              <Badge variant="secondary" className={
                orderData.status === 'waiting_approval' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                orderData.status === 'rejected' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
              }>
                {orderData.status === 'waiting_approval' ? "Aguardando Aprovação" : 
                 orderData.status === 'rejected' ? "Rejeitado" : 
                 "Confirmado"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">Criado em {new Date(orderData.created_at).toLocaleString('pt-BR')}</p>
          </div>
          <div className="ml-auto flex gap-2">
            {activeRequest && canApprove ? (
              <>
                <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="text-destructive">Rejeitar</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Rejeitar Pedido</DialogTitle>
                      <DialogDescription>
                        Informe o motivo da rejeição deste pedido.
                      </DialogDescription>
                    </DialogHeader>
                    <Textarea 
                      placeholder="Motivo da rejeição..." 
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    />
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>Cancelar</Button>
                      <Button variant="destructive" onClick={handleReject}>Confirmar Rejeição</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Button 
                  className="bg-emerald-600 hover:bg-emerald-700" 
                  onClick={handleApprove}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Aprovar Pedido
                </Button>
              </>
            ) : orderData.status === 'pending' && isOverThreshold && !activeRequest ? (
              <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                    Solicitar Aprovação
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Solicitar Aprovação de Alçada</DialogTitle>
                    <DialogDescription>
                      Este pedido de <strong>R$ {orderTotal.toLocaleString('pt-BR')}</strong> excede sua alçada de <strong>R$ {threshold.toLocaleString('pt-BR')}</strong>.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <p className="text-sm font-medium">Justifique a necessidade deste pedido:</p>
                    <Textarea 
                      placeholder="Ex: Reposição urgente de material promocional..." 
                      value={requestReason}
                      onChange={(e) => setRequestReason(e.target.value)}
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsRequestDialogOpen(false)}>Cancelar</Button>
                    <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleRequestApproval}>
                      Enviar Solicitação
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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
                          <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                              placeholder="Buscar produto..." 
                              className="pl-9"
                              value={productSearch}
                              onChange={(e) => setProductSearch(e.target.value)}
                            />
                          </div>
                          
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {products?.map(product => (
                              <div 
                                key={product.id}
                                className={`p-2 border rounded cursor-pointer flex justify-between items-center transition-colors ${selectedProductId === product.id ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}
                                onClick={() => setSelectedProductId(product.id)}
                              >
                                <div>
                                  <p className="text-sm font-medium">{product.name}</p>
                                  <p className="text-xs text-muted-foreground">R$ {product.price.toLocaleString('pt-BR')}</p>
                                </div>
                                {selectedProductId === product.id && <CheckCircle className="h-4 w-4 text-primary" />}
                              </div>
                            ))}
                          </div>

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
                          <Button disabled={!selectedProductId || addItem.isPending} onClick={handleAddItem}>
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
                        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{item.product_name || "Produto Sicoob"}</p>
                          <p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <div>
                          <p className="font-bold">R$ {Number(item.unit_price * item.quantity).toLocaleString('pt-BR')}</p>
                          <p className="text-xs text-muted-foreground">Un: R$ {Number(item.unit_price).toLocaleString('pt-BR')}</p>
                        </div>
                        {orderData.status === 'pending' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={removeItem.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
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

            <Tabs defaultValue="history">
              <TabsList>
                <TabsTrigger value="history" className="gap-2">
                  <History className="h-4 w-4" />
                  Histórico
                </TabsTrigger>
                <TabsTrigger value="comments" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Comentários
                </TabsTrigger>
              </TabsList>
              <TabsContent value="history">
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-6">
                      {orderHistory?.map((entry) => (
                        <div key={entry.id} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className={`w-2 h-2 rounded-full mt-1.5 ${
                              entry.new_status === 'confirmed' ? 'bg-emerald-500' : 
                              entry.new_status === 'rejected' ? 'bg-red-500' : 
                              entry.new_status === 'waiting_approval' ? 'bg-amber-500' : 'bg-blue-500'
                            }`} />
                            <div className="w-0.5 h-full bg-border" />
                          </div>
                          <div>
                            <p className="text-sm font-bold">
                              {entry.new_status === 'confirmed' ? 'Pedido Confirmado' : 
                               entry.new_status === 'rejected' ? 'Pedido Rejeitado' : 
                               entry.new_status === 'waiting_approval' ? 'Aguardando Aprovação' : 'Status Atualizado'}
                            </p>
                            <div className="flex flex-col gap-0.5">
                              <p className="text-xs text-muted-foreground">
                                <strong>De:</strong> {entry.previous_status} <strong>Para:</strong> {entry.new_status}
                              </p>
                              {entry.comment && (
                                <p className="text-xs text-muted-foreground bg-muted p-2 rounded mt-1 italic">
                                  "{entry.comment}"
                                </p>
                              )}
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                                <User className="h-3 w-3" />
                                {entry.user?.display_name || 'Sistema'} • {new Date(entry.created_at).toLocaleString('pt-BR')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {!orderHistory?.length && (
                        <div className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="w-2 h-2 rounded-full bg-muted mt-1.5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-muted-foreground">Pedido Criado</p>
                            <p className="text-xs text-muted-foreground">
                              Em {new Date(orderData.created_at).toLocaleString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="comments">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum comentário ainda.</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Status da Alçada</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
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
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Saldo restante para o mês vigente após subtrair os pedidos já realizados.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
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
                    {isOverBudget && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-white uppercase tracking-tighter drop-shadow-sm">Overbudget</span>
                      </div>
                    )}
                  </div>
                </div>

                {isOverBudget ? (
                  <Alert variant="destructive" className="py-2 bg-destructive/10 border-destructive/20 animate-pulse">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs font-medium">
                      <strong>ALERTA:</strong> Este pedido excede a verba total disponível no PA. O sistema bloqueará a aprovação final.
                    </AlertDescription>
                  </Alert>
                ) : isOverThreshold ? (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <p className="text-xs text-amber-600 font-medium">
                      Pedido acima da alçada. Requer aprovação de um gestor.
                    </p>
                  </div>
                ) : (
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
