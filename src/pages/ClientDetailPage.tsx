import { useParams, useNavigate } from 'react-router-dom';
// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from '@/components/seo/PageSEO';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCrmCompany } from '@/hooks/useCrmCompanies';
import { useClientOrdersHistory } from '@/hooks/useClientOrdersHistory';
import { useClientTopProducts } from '@/hooks/useClientTopProducts';
import { ClientDetailHeader } from '@/components/clients/ClientDetailHeader';
import { ClientStatsCards } from '@/components/clients/ClientStatsCards';
import { OrderCard } from '@/components/orders/OrderCard';
import { Package, TrendingUp } from 'lucide-react';
import { getCompanyDisplayName } from '@/types/crm';

type ClientHistory = NonNullable<ReturnType<typeof useClientOrdersHistory>['data']>;
type TopProducts = NonNullable<ReturnType<typeof useClientTopProducts>['data']>;

const CLIENT_FALLBACK = (
  <div className="mx-auto w-full max-w-[1920px] space-y-4 px-3 py-3 sm:px-4 sm:py-4 lg:px-6 xl:px-8">
    <Skeleton className="h-20" />
    <Skeleton className="h-24" />
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <Skeleton className="h-96 lg:col-span-2" />
      <Skeleton className="h-96" />
    </div>
  </div>
);

function ClientNotFound() {
  return (
    <div className="mx-auto w-full max-w-[1920px] px-4 py-8">
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          Cliente não encontrado.
        </CardContent>
      </Card>
    </div>
  );
}

function ClientStats({
  history,
  loading,
}: {
  history: ClientHistory | undefined;
  loading: boolean;
}) {
  if (loading) return <Skeleton className="h-24" />;
  return (
    <ClientStatsCards
      ordersCount={history?.ordersCount ?? 0}
      totalLtv={history?.totalLtv ?? 0}
      avgTicket={history?.avgTicket ?? 0}
      lastOrderAt={history?.lastOrderAt}
    />
  );
}

function ClientOrders({
  history,
  loading,
  onOpen,
}: {
  history: ClientHistory | undefined;
  loading: boolean;
  onOpen: (id: string) => void;
}) {
  let content = (
    <p className="py-6 text-center text-sm text-muted-foreground">
      Nenhum pedido registrado para este cliente.
    </p>
  );
  if (loading) {
    content = (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  } else if (history?.orders.length) {
    content = (
      <>
        {history.orders.slice(0, 10).map((order) => (
          <OrderCard key={order.id} order={order} onClick={() => onOpen(order.id)} />
        ))}
      </>
    );
  }
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Package className="h-4 w-4 text-primary" /> Histórico de Pedidos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">{content}</CardContent>
    </Card>
  );
}

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function TopProduct({ product }: { product: TopProducts[number] }) {
  return (
    <div className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted/50">
      <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-muted">
        {product.image && (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{product.name}</p>
        <p className="text-xs text-muted-foreground">
          {product.totalQuantity} un · {product.orderCount}{' '}
          {product.orderCount === 1 ? 'pedido' : 'pedidos'}
        </p>
      </div>
      <p className="flex-shrink-0 text-xs font-medium text-foreground">
        {formatBRL(product.totalValue)}
      </p>
    </div>
  );
}

function ClientTopProducts({ products, loading }: { products: TopProducts; loading: boolean }) {
  let content = (
    <p className="py-6 text-center text-sm text-muted-foreground">Sem dados de produtos ainda.</p>
  );
  if (loading) {
    content = (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  } else if (products.length) {
    content = (
      <>
        {products.map((product) => (
          <TopProduct key={(product.sku ?? '') + product.name} product={product} />
        ))}
      </>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4 text-primary" /> Produtos mais comprados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">{content}</CardContent>
    </Card>
  );
}

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: client, isLoading: loadingClient } = useCrmCompany(id);
  const { data: history, isLoading: loadingHistory } = useClientOrdersHistory(id);
  const { data: topProducts = [], isLoading: loadingProducts } = useClientTopProducts(id);

  if (loadingClient) return CLIENT_FALLBACK;
  if (!client) return <ClientNotFound />;

  const name = getCompanyDisplayName(client);
  return (
    <>
      <PageSEO
        title={`${name} | Clientes`}
        description={`Visão 360° de ${name}: histórico de pedidos, LTV e produtos mais comprados.`}
        path={`/clientes/${id}`}
      />

      <div className="mx-auto w-full max-w-[1920px] space-y-5 px-3 py-3 pb-24 sm:px-4 sm:py-4 md:pb-6 lg:px-6 xl:px-8">
        <ClientDetailHeader client={client} />
        <ClientStats history={history} loading={loadingHistory} />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <ClientOrders
            history={history}
            loading={loadingHistory}
            onOpen={(orderId) => navigate(`/pedidos/${orderId}`)}
          />
          <ClientTopProducts products={topProducts} loading={loadingProducts} />
        </div>
      </div>
    </>
  );
}
