import { useParams, useNavigate } from "react-router-dom";
import { SkeletonTransition } from "@/components/effects/SkeletonTransition";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCrmCompany } from "@/hooks/useCrmCompanies";
import { useClientOrdersHistory } from "@/hooks/useClientOrdersHistory";
import { useClientTopProducts } from "@/hooks/useClientTopProducts";
import { ClientDetailHeader } from "@/components/clients/ClientDetailHeader";
import { ClientStatsCards } from "@/components/clients/ClientStatsCards";
import { OrderCard } from "@/components/orders/OrderCard";
import { Package, TrendingUp } from "lucide-react";
import { getCompanyDisplayName } from "@/types/crm";

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: client, isLoading: loadingClient } = useCrmCompany(id);
  const { data: history, isLoading: loadingHistory } = useClientOrdersHistory(id);
  const { data: topProducts = [], isLoading: loadingProducts } = useClientTopProducts(id);

  const isLoading = loadingClient;
  
  const fallback = (
    <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-4">
      <Skeleton className="h-20" />
      <Skeleton className="h-24" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Skeleton className="lg:col-span-2 h-96" />
        <Skeleton className="h-96" />
      </div>
    </div>
  );

  if (!client) {
    return (
      <MainLayout>
        <div className="w-full max-w-[1920px] mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              Cliente não encontrado.
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const name = getCompanyDisplayName(client);
  const formatBRL = (n: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

  return (
    <MainLayout>
      <PageSEO
        title={`${name} | Clientes`}
        description={`Visão 360° de ${name}: histórico de pedidos, LTV e produtos mais comprados.`}
        path={`/clientes/${id}`}
      />
      
      <SkeletonTransition isLoading={isLoading} fallback={fallback}>
        <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-5 pb-24 md:pb-6">
          <ClientDetailHeader client={client} />

          {loadingHistory ? (
            <Skeleton className="h-24" />
          ) : (
            <ClientStatsCards
              ordersCount={history?.ordersCount ?? 0}
              totalLtv={history?.totalLtv ?? 0}
              avgTicket={history?.avgTicket ?? 0}
              lastOrderAt={history?.lastOrderAt}
            />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Pedidos */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="h-4 w-4 text-primary" /> Histórico de Pedidos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {loadingHistory ? (
                  <div className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : !history?.orders.length ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    Nenhum pedido registrado para este cliente.
                  </p>
                ) : (
                  history.orders.slice(0, 10).map((o) => (
                    <OrderCard key={o.id} order={o} onClick={() => navigate(`/pedidos/${o.id}`)} />
                  ))
                )}
              </CardContent>
            </Card>

            {/* Top produtos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-primary" /> Produtos mais comprados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {loadingProducts ? (
                  <div className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : topProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    Sem dados de produtos ainda.
                  </p>
                ) : (
                  topProducts.map((p) => (
                    <div key={(p.sku ?? "") + p.name} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                      <div className="h-10 w-10 rounded bg-muted overflow-hidden flex-shrink-0">
                        {p.image && <img src={p.image} alt={p.name} className="h-full w-full object-cover" loading="lazy" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.totalQuantity} un · {p.orderCount} {p.orderCount === 1 ? "pedido" : "pedidos"}
                        </p>
                      </div>
                      <p className="text-xs font-medium text-foreground flex-shrink-0">{formatBRL(p.totalValue)}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </SkeletonTransition>
    </MainLayout>
  );
}
