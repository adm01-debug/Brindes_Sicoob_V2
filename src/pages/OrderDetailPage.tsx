import { useParams, useNavigate } from "react-router-dom";
import { Package, ArrowLeft, FileText, CreditCard, Clock } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { OrderStatusTimeline } from "@/components/orders/OrderStatusTimeline";
import { OrderFulfillmentManager } from "@/components/orders/OrderFulfillmentManager";
import { OrderInvoicesManager } from "@/components/orders/OrderInvoicesManager";
import { OrderPilotWorkflow } from "@/components/orders/OrderPilotWorkflow";
import { OrderAuditTimeline } from "@/components/orders/OrderAuditTimeline";
import { OrderComments } from "@/components/orders/OrderComments";
import { OrderSellerActions } from "@/components/orders/OrderSellerActions";
import { useOrderDetail, useUpdateOrder, ORDER_STATUS_LABELS, OrderStatus } from "@/hooks/useOrders";

import { OrderDetailHeader } from "@/components/orders/detail/OrderDetailHeader";
import { OrderItemsList } from "@/components/orders/detail/OrderItemsList";
import { OrderSummary } from "@/components/orders/detail/OrderSummary";
import { OrderClientInfo } from "@/components/orders/detail/OrderClientInfo";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { data, isLoading } = useOrderDetail(id);
  const { mutate: updateOrder, isPending: isSaving } = useUpdateOrder(id, data?.order?.status);

  if (isLoading) {
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

  if (!data?.order) {
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

  const { order, items } = data;

  return (
    <MainLayout>
      <PageSEO title={`Pedido #${order.order_number}`} description={`Detalhes do pedido ${order.order_number}`} path={`/pedidos/${id}`} noIndex />
      <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-24 md:pb-6 animate-fade-in">
        
        <OrderDetailHeader order={order} items={items} />

        <OrderStatusTimeline status={order.status} orderId={order.id} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <OrderSellerActions order={order} />

            <div className="space-y-0">
              <OrderItemsList items={items} />
              <Card className="mt-[-1px] rounded-t-none">
                <CardContent className="pt-0">
                  <OrderSummary order={order} />
                </CardContent>
              </Card>
            </div>

            <OrderFulfillmentManager orderId={order.id} currentFulfillmentStatus={order.fulfillment_status} />
            <OrderInvoicesManager orderId={order.id} />
            <OrderPilotWorkflow orderId={order.id} />
            <OrderComments orderId={order.id} />
            <OrderAuditTimeline orderId={order.id} />
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Gerenciar Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Status do Pedido</Label>
                  <Select 
                    value={order.status} 
                    onValueChange={(val) => updateOrder({ status: val as OrderStatus })} 
                    disabled={isSaving}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ORDER_STATUS_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
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

            <OrderClientInfo order={order} />

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
