import { useParams, useNavigate } from 'react-router-dom';
import {
  Package,
  ArrowLeft,
  FileText,
  CreditCard,
  Clock,
  Truck,
  MessageSquare,
} from 'lucide-react';
// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from '@/components/seo/PageSEO';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrderStatusTimeline } from '@/components/orders/OrderStatusTimeline';
import { OrderFulfillmentManager } from '@/components/orders/OrderFulfillmentManager';
import { OrderInvoicesManager } from '@/components/orders/OrderInvoicesManager';
import { OrderLogisticsTracking } from '@/components/orders/OrderLogisticsTracking';
import { OrderPilotWorkflow } from '@/components/orders/OrderPilotWorkflow';
import { OrderAuditTimeline } from '@/components/orders/OrderAuditTimeline';
import { OrderComments } from '@/components/orders/OrderComments';
import { OrderSellerActions } from '@/components/orders/OrderSellerActions';
import {
  useOrderDetail,
  useUpdateOrder,
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from '@/hooks/orders/useOrders';

import { OrderDetailHeader } from '@/components/orders/detail/OrderDetailHeader';
import { OrderItemsList } from '@/components/orders/detail/OrderItemsList';
import { OrderSummary } from '@/components/orders/detail/OrderSummary';
import { OrderClientInfo } from '@/components/orders/detail/OrderClientInfo';
import type { OrderItem, OrderRow } from '@/types/orders';

function OrderLoading() {
  return (
    <div className="mx-auto w-full max-w-[1920px] space-y-3 px-3 py-3 pb-24 sm:space-y-4 sm:px-4 sm:py-4 md:pb-6 lg:px-6 xl:px-8">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-20 w-full" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    </div>
  );
}

function OrderNotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Package className="mb-4 h-16 w-16 text-muted-foreground/40" />
      <h2 className="mb-2 font-display text-xl font-semibold">Pedido não encontrado</h2>
      <p className="mb-4 text-muted-foreground">
        O pedido solicitado não existe ou você não tem permissão.
      </p>
      <Button onClick={onBack} variant="outline">
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar aos Pedidos
      </Button>
    </div>
  );
}

function OrderTabs({ order, items }: { order: OrderRow; items: OrderItem[] }) {
  return (
    <>
      <OrderSellerActions order={order} />
      <Tabs defaultValue="items" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="items" className="gap-2">
            <Package className="h-4 w-4" /> Itens
          </TabsTrigger>
          <TabsTrigger value="logistics" className="gap-2">
            <Truck className="h-4 w-4" /> Logística
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-2">
            <FileText className="h-4 w-4" /> Notas
          </TabsTrigger>
          <TabsTrigger value="chat" className="gap-2">
            <MessageSquare className="h-4 w-4" /> Chat
          </TabsTrigger>
        </TabsList>
        <TabsContent value="items" className="mt-4 space-y-6">
          <div className="space-y-0">
            <OrderItemsList items={items} />
            <Card className="mt-[-1px] rounded-t-none">
              <CardContent className="pt-0">
                <OrderSummary order={order} />
              </CardContent>
            </Card>
          </div>
          <OrderPilotWorkflow orderId={order.id} />
        </TabsContent>
        <TabsContent value="logistics" className="mt-4 space-y-4">
          <OrderLogisticsTracking orderId={order.id} />
          <OrderFulfillmentManager
            orderId={order.id}
            currentFulfillmentStatus={order.fulfillment_status}
          />
        </TabsContent>
        <TabsContent value="invoices" className="mt-4">
          <OrderInvoicesManager orderId={order.id} />
        </TabsContent>
        <TabsContent value="chat" className="mt-4">
          <OrderComments orderId={order.id} />
        </TabsContent>
      </Tabs>
      <OrderAuditTimeline orderId={order.id} />
    </>
  );
}

function StatusManager({
  order,
  isSaving,
  updateOrder,
  openQuote,
}: {
  order: OrderRow;
  isSaving: boolean;
  updateOrder: (patch: Partial<OrderRow>) => void;
  openQuote: (quoteId: string) => void;
}) {
  const quoteId = order.quote_id;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Gerenciar Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>Status do Pedido</Label>
          <Select
            value={order.status}
            onValueChange={(value) => updateOrder({ status: value as OrderStatus })}
            disabled={isSaving}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ORDER_STATUS_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {quoteId && (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={() => openQuote(quoteId)}
          >
            <FileText className="h-4 w-4" />
            Ver Orçamento Original
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function OrderConditions({ order }: { order: OrderRow }) {
  if (!order.payment_terms && !order.delivery_time) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CreditCard className="h-5 w-5 text-primary" />
          Condições
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {order.payment_terms && (
          <div className="flex items-start gap-2 text-sm">
            <CreditCard className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Pagamento</p>
              <p className="font-medium">{order.payment_terms}</p>
            </div>
          </div>
        )}
        {order.delivery_time && (
          <div className="flex items-start gap-2 text-sm">
            <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Prazo</p>
              <p className="font-medium">{order.delivery_time}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OrderNotes({ order }: { order: OrderRow }) {
  if (!order.notes && !order.internal_notes) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Observações</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {order.notes && (
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Públicas</p>
            <p className="whitespace-pre-line text-sm">{order.notes}</p>
          </div>
        )}
        {order.internal_notes && (
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Internas</p>
            <p className="whitespace-pre-line text-sm text-muted-foreground">
              {order.internal_notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OrderDetails({
  order,
  items,
  isSaving,
  updateOrder,
  navigate,
}: {
  order: OrderRow;
  items: OrderItem[];
  isSaving: boolean;
  updateOrder: (patch: Partial<OrderRow>) => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  return (
    <div className="mx-auto w-full max-w-[1920px] space-y-3 px-3 py-3 pb-24 sm:space-y-4 sm:px-4 sm:py-4 md:pb-6 lg:px-6 xl:px-8">
      <OrderDetailHeader order={order} items={items} />
      <OrderStatusTimeline status={order.status} orderId={order.id} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <OrderTabs order={order} items={items} />
        </div>
        <div className="space-y-6">
          <StatusManager
            order={order}
            isSaving={isSaving}
            updateOrder={updateOrder}
            openQuote={(quoteId) => navigate(`/orcamentos/${quoteId}`)}
          />
          <OrderClientInfo order={order} />
          <OrderConditions order={order} />
          <OrderNotes order={order} />
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useOrderDetail(id);
  const { mutate: updateOrder, isPending: isSaving } = useUpdateOrder(id, data?.order?.status);

  if (isLoading) return <OrderLoading />;
  if (!data?.order) {
    return <OrderNotFound onBack={() => navigate('/pedidos')} />;
  }

  const { order, items } = data;
  return (
    <>
      <PageSEO
        title={`Pedido #${order.order_number}`}
        description={`Detalhes do pedido ${order.order_number}`}
        path={`/pedidos/${id}`}
        noIndex
      />
      <OrderDetails
        order={order}
        items={items}
        isSaving={isSaving}
        updateOrder={updateOrder}
        navigate={navigate}
      />
    </>
  );
}
