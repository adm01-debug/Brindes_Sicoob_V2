import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Building2, Mail, Package, Phone, User, CreditCard, Clock, FileText, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { OrderStatusTimeline } from "@/components/orders/OrderStatusTimeline";
import { OrderFulfillmentManager } from "@/components/orders/OrderFulfillmentManager";
import { OrderPilotWorkflow } from "@/components/orders/OrderPilotWorkflow";
import { OrderAuditTimeline } from "@/components/orders/OrderAuditTimeline";
import { OrderComments } from "@/components/orders/OrderComments";
import { OrderSellerActions } from "@/components/orders/OrderSellerActions";
import { ORDER_STATUS_LABELS } from "@/hooks";

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-warning/20 text-warning border-warning/30" },
  confirmed: { label: "Confirmado", color: "bg-primary/20 text-primary border-primary/30" },
  in_production: { label: "Em Produção", color: "bg-primary/15 text-primary/80 border-primary/25" },
  shipped: { label: "Enviado", color: "bg-primary/10 text-primary/70 border-primary/20" },
  delivered: { label: "Entregue", color: "bg-primary/20 text-primary border-primary/30" },
  cancelled: { label: "Cancelado", color: "bg-destructive/20 text-destructive border-destructive/30" },
};

const fulfillmentConfig: Record<string, { label: string; color: string }> = {
  unfulfilled: { label: "Não Processado", color: "bg-warning/20 text-warning border-warning/30" },
  partial: { label: "Parcial", color: "bg-warning/15 text-warning/80 border-warning/25" },
  fulfilled: { label: "Completo", color: "bg-primary/20 text-primary border-primary/30" },
};

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface OrderItem {
  id: string;
  product_name: string | null;
  product_sku: string | null;
  product_image_url: string | null;
  quantity: number | null;
  unit_price: number | null;
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    fetchOrder();
  }, [id, user]);

  const fetchOrder = async () => {
    setLoading(true);
    const [orderRes, itemsRes] = await Promise.all([
      // rls-allow: lookup por id; RLS valida ownership
      supabase.from("orders").select("*").eq("id", id!).maybeSingle(),
      supabase.from("order_items").select("*").eq("order_id", id!),
    ]);

    if (orderRes.data) {
      setOrder(orderRes.data);
      setTrackingNumber(orderRes.data.tracking_number || "");
    }
    if (itemsRes.data) setItems(itemsRes.data);
    setLoading(false);
  };

  const updateStatus = async (newStatus: string) => {
    setIsSaving(true);
    const { error } = await supabase
      // rls-allow: lookup por id; RLS valida ownership
      .from("orders")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", id!);

    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      toast.success(`Status atualizado para ${statusConfig[newStatus]?.label || newStatus}`);
      setOrder((prev: any) => ({ ...prev, status: newStatus }));
    }
    setIsSaving(false);
  };

  const updateTracking = async () => {
    setIsSaving(true);
    const { error } = await supabase
      // rls-allow: lookup por id; RLS valida ownership
      .from("orders")
      .update({ tracking_number: trackingNumber, updated_at: new Date().toISOString() })
      .eq("id", id!);

    if (error) {
      toast.error("Erro ao salvar rastreio");
    } else {
      toast.success("Código de rastreio atualizado");
      setOrder((prev: any) => ({ ...prev, tracking_number: trackingNumber }));
    }
    setIsSaving(false);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-24 md:pb-6 animate-fade-in">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!order) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="h-16 w-16 text-muted-foreground/40 mb-4" />
          <h2 className="font-display text-xl font-semibold mb-2">Pedido não encontrado</h2>
          <p className="text-muted-foreground mb-4">O pedido solicitado não existe ou você não tem permissão.</p>
          <Button onClick={() => navigate("/pedidos")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar aos Pedidos
          </Button>
        </div>
      </MainLayout>
    );
  }

  const sc = statusConfig[order.status] || { label: order.status, color: "" };
  const fc = fulfillmentConfig[order.fulfillment_status] || { label: order.fulfillment_status, color: "" };

  return (
    <MainLayout>
      <PageSEO title={`Pedido #${order.order_number}`} description={`Detalhes do pedido ${order.order_number}`} path={`/pedidos/${id}`} noIndex />
      <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-24 md:pb-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" aria-label="Voltar" onClick={() => navigate("/pedidos")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-display text-2xl font-bold">Pedido #{order.order_number}</h1>
              <p className="text-sm text-muted-foreground">
                Criado em {format(new Date(order.created_at), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={sc.color}>{sc.label}</Badge>
            <Badge variant="outline" className={fc.color}>{fc.label}</Badge>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => {
              const data = {
                items: items.map(it => ({
                  ...it,
                  total: (it.quantity || 0) * (it.unit_price || 0)
                })),
                filename: `pedido_${order.order_number}`,
                columns: [
                  { header: "Produto", key: "product_name" },
                  { header: "SKU", key: "product_sku" },
                  { header: "Qtd", key: "quantity" },
                  { header: "Preço", key: "unit_price" },
                  { header: "Subtotal", key: "total" },
                ]
              };
              exportToPDF(data as any);
            }}>
              <Download className="h-4 w-4" /> PDF
            </Button>
          </div>
        </div>

        <OrderStatusTimeline status={order.status} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Seller Quick Actions */}
            <OrderSellerActions order={order} />

            {/* Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-5 w-5 text-primary" />
                  Itens do Pedido ({items.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhum item encontrado.</p>
                ) : (
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 p-3 rounded-lg border border-border/50 bg-muted/20">
                        {item.product_image_url ? (
                          <img
                            src={item.product_image_url}
                            alt={item.product_name || ""}
                            className="w-14 h-14 rounded-md object-cover border" loading="lazy" />
                        ) : (
                          <div className="w-14 h-14 rounded-md bg-muted flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.product_name}</p>
                          {item.product_sku && (
                            <p className="text-xs text-muted-foreground">SKU: {item.product_sku}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{item.quantity}x {formatCurrency(item.unit_price || 0)}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency((item.quantity || 0) * (item.unit_price || 0))}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Totals */}
                <Separator className="my-4" />
                <div className="space-y-2">
                  {order.subtotal != null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span>{formatCurrency(order.subtotal)}</span>
                    </div>
                  )}
                  {order.discount_amount > 0 && (
                    <div className="flex justify-between text-sm text-destructive">
                      <span>Desconto:</span>
                      <span>-{formatCurrency(order.discount_amount)}</span>
                    </div>
                  )}
                  {order.shipping_cost > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Frete:</span>
                      <span>{formatCurrency(order.shipping_cost)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span className="text-primary">{formatCurrency(order.total || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Logística */}
            <OrderFulfillmentManager order={order} />

            {/* Fluxo de Piloto */}
            <OrderPilotWorkflow orderId={order.id} />

            {/* Chat/Comentários */}
            <OrderComments orderId={order.id} />

            {/* Auditoria */}
            <OrderAuditTimeline orderId={order.id} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Management */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Gerenciar Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Status do Pedido</Label>
                  <Select value={order.status} onValueChange={updateStatus} disabled={isSaving}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusConfig).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {order.quote_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => navigate(`/orcamentos/${order.quote_id}`)}
                  >
                    <FileText className="h-4 w-4" />
                    Ver Orçamento Original
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Client Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.client_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{order.client_name}</span>
                  </div>
                )}
                {order.client_company && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{order.client_company}</span>
                  </div>
                )}
                {order.client_email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{order.client_email}</span>
                  </div>
                )}
                {order.client_phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{order.client_phone}</span>
                  </div>
                )}
                {!order.client_name && !order.client_company && (
                  <p className="text-sm text-muted-foreground">Sem informações do cliente</p>
                )}
              </CardContent>
            </Card>

            {/* Commercial Conditions */}
            {(order.payment_terms || order.delivery_time) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Condições
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {order.payment_terms && (
                    <div className="flex items-start gap-2 text-sm">
                      <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Pagamento</p>
                        <p className="font-medium">{order.payment_terms}</p>
                      </div>
                    </div>
                  )}
                  {order.delivery_time && (
                    <div className="flex items-start gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Prazo</p>
                        <p className="font-medium">{order.delivery_time}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {(order.notes || order.internal_notes) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Observações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {order.notes && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Públicas</p>
                      <p className="text-sm whitespace-pre-line">{order.notes}</p>
                    </div>
                  )}
                  {order.internal_notes && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Internas</p>
                      <p className="text-sm whitespace-pre-line text-muted-foreground">{order.internal_notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
