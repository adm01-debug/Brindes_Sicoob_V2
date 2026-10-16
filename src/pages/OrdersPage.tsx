import { useCallback, useEffect, useMemo } from 'react';
// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from '@/components/seo/PageSEO';
import { useAuth } from '@/contexts/AuthContext';
import { Package, Download, FileSpreadsheet, FileText, ShoppingBag } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useOrdersList, ORDER_STATUS_LABELS } from '@/hooks/orders/useOrders';
import { OrderCard } from '@/components/orders/OrderCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useSalesScope } from '@/lib/auth/visibility-scope';
import { ScopeBadge } from '@/components/common/ScopeBadge';
import { Button } from '@/components/ui/button';
import { exportToExcel, exportToPDF } from '@/utils/orderExportUtils';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BatchExportDialog } from '@/components/orders/BatchExportDialog';
import { OrderFilters, type OrderFilterValues } from '@/components/orders/OrderFilters';
import { OrderStatsBar } from '@/components/orders/OrderStatsBar';
import { PersistentBreadcrumbs } from '@/components/common/PersistentBreadcrumbs';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { useQueryClient } from '@tanstack/react-query';
import { parseOrderQuery, toApiDateRange, writeOrderQuery } from '@/lib/navigation/filter-query';

type OrdersResponse = NonNullable<ReturnType<typeof useOrdersList>['data']>;
type Order = OrdersResponse['data'][number];
type OrdersFilterState = OrderFilterValues & { page: number };

function exportOrders(orders: Order[], type: 'excel' | 'pdf') {
  const data = orders.map((order) => ({
    ...order,
    status_label: ORDER_STATUS_LABELS[order.status] || order.status,
    total_formatted: (order.total || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }),
    created_at_formatted: format(new Date(order.created_at), 'dd/MM/yyyy'),
  }));
  if (type === 'excel') exportToExcel(data, 'pedidos');
  else exportToPDF(data, 'pedidos');
}

function OrdersHeader() {
  return (
    <div className="space-y-1">
      <PersistentBreadcrumbs />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1
            data-testid="page-title-pedidos"
            className="flex items-center gap-2 font-display text-2xl font-bold text-foreground"
          >
            Meus Pedidos
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie e acompanhe o status das suas solicitações
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ScopeBadge />
        </div>
      </div>
    </div>
  );
}

function OrdersToolbar({
  orders,
  filters,
  onFiltersChange,
}: {
  orders: Order[];
  filters: OrdersFilterState;
  onFiltersChange: (filters: OrderFilterValues) => void;
}) {
  return (
    <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <OrderFilters values={filters} onFiltersChange={onFiltersChange} />
      <div className="flex items-center justify-between gap-2 border-t pt-4">
        <p className="text-sm text-muted-foreground">
          Mostrando <span className="font-medium text-foreground">{orders.length}</span> pedidos
        </p>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" /> Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportOrders(orders, 'excel')}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportOrders(orders, 'pdf')}>
                <FileText className="mr-2 h-4 w-4" /> PDF (.pdf)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <BatchExportDialog entityType="orders" filters={filters} />
        </div>
      </div>
    </div>
  );
}

function OrdersContent({
  orders,
  isLoading,
  search,
}: {
  orders: Order[];
  isLoading: boolean;
  search: string;
}) {
  const navigate = useNavigate();
  if (isLoading)
    return (
      <div className="grid gap-3">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-20" />
        ))}
      </div>
    );
  if (!orders.length) return <OrdersEmptyState search={search} />;
  return (
    <div className="grid gap-3">
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} onClick={() => navigate(`/pedidos/${order.id}`)} />
      ))}
    </div>
  );
}

function OrdersPagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-8 flex items-center justify-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
      >
        Anterior
      </Button>
      <span className="mx-2 text-sm text-muted-foreground">
        Página {page} de {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
      >
        Próxima
      </Button>
    </div>
  );
}

function useOrdersPageState() {
  const { user } = useAuth();
  const scope = useSalesScope();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  useRealtimeSync('orders', {
    onDataChange: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
  const filters = useMemo<OrdersFilterState>(() => parseOrderQuery(searchParams), [searchParams]);
  const apiDateRange = toApiDateRange(filters.dateRange);
  const updateFilters = useCallback((updates: Partial<OrdersFilterState>, replace = true) => {
    setSearchParams((current) => writeOrderQuery(current, { ...parseOrderQuery(current), ...updates }), {
      replace, state: location.state,
    });
  }, [location.state, setSearchParams]);
  useEffect(() => {
    const canonical = writeOrderQuery(searchParams, filters);
    if (canonical.toString() !== searchParams.toString()) {
      setSearchParams(canonical, { replace: true, state: location.state });
    }
  }, [filters, location.state, searchParams, setSearchParams]);
  const { data: response, isLoading } = useOrdersList(user?.id, scope, {
    search: filters.search.trim(),
    status: filters.status,
    clientCompany: filters.clientCompany.trim(),
    startDate: apiDateRange.startDate,
    endDateExclusive: apiDateRange.endDateExclusive,
    page: filters.page,
    pageSize: 15,
  });
  const orders = response?.data || [];
  const totalPages = Math.ceil((response?.count || 0) / 15);
  const applyFilters = (values: OrderFilterValues) => updateFilters({ ...values, page: 1 });
  const setPage = useCallback((page: number) => updateFilters({ page }, false), [updateFilters]);
  useEffect(() => {
    if (!isLoading && filters.page > Math.max(1, totalPages)) updateFilters({ page: Math.max(1, totalPages) });
  }, [filters.page, isLoading, totalPages, updateFilters]);
  return { filters, orders, totalPages, isLoading, applyFilters, setPage };
}

export function OrdersPage() {
  const state = useOrdersPageState();

  return (
    <>
      <PageSEO
        title="Meus Pedidos"
        description="Acompanhe e gerencie todos os seus pedidos em um só lugar."
        path="/pedidos"
      />

      <div className="mx-auto w-full max-w-[1920px] animate-fade-in space-y-6 px-3 py-3 pb-24 sm:px-4 sm:py-4 md:pb-6 lg:px-6 xl:px-8">
        <OrdersHeader />
        <OrderStatsBar />
        <OrdersToolbar
          orders={state.orders}
          filters={state.filters}
          onFiltersChange={state.applyFilters}
        />
        <OrdersContent
          orders={state.orders}
          isLoading={state.isLoading}
          search={state.filters.search}
        />
        <OrdersPagination
          page={state.filters.page}
          totalPages={state.totalPages}
          onPageChange={state.setPage}
        />
      </div>
    </>
  );
}

function OrdersEmptyState({ search }: { search?: string }) {
  const navigate = useNavigate();

  return (
    <Card className="border-2 border-dashed bg-muted/30">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/5">
          <Package className="h-10 w-10 text-primary/40" />
        </div>
        <h3 className="mb-2 font-display text-xl font-semibold text-foreground">
          {search ? 'Nenhum pedido encontrado' : 'Você ainda não tem pedidos'}
        </h3>
        <p className="mb-8 max-w-xs text-sm text-muted-foreground">
          {search
            ? 'Tente ajustar seus filtros para encontrar o que procura.'
            : 'Inicie suas compras explorando nosso catálogo completo de produtos.'}
        </p>
        {!search && (
          <Button onClick={() => navigate('/filtros')} className="gap-2">
            <ShoppingBag className="h-4 w-4" />
            Explorar Catálogo
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
