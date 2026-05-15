import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { useAuth } from "@/contexts/AuthContext";
import { Package, Download, FileSpreadsheet, FileText, ShoppingBag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useOrdersList, ORDER_STATUS_LABELS } from "@/hooks/useOrders";
import { OrderCard } from "@/components/orders/OrderCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useSalesScope } from "@/lib/auth/visibility-scope";
import { ScopeBadge } from "@/components/common/ScopeBadge";
import { Button } from "@/components/ui/button";
import { exportToExcel, exportToPDF, ORDER_EXPORT_COLUMNS } from "@/utils/orderExportUtils";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BatchExportDialog } from "@/components/orders/BatchExportDialog";
import { OrderFilters, OrderFilterValues } from "@/components/orders/OrderFilters";
import { OrderStatsBar } from "@/components/orders/OrderStatsBar";
import { PersistentBreadcrumbs } from "@/components/common/PersistentBreadcrumbs";

export function OrdersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const scope = useSalesScope();
  
  const [filterValues, setFilterValues] = useState<OrderFilterValues & { page: number }>({
    search: "",
    status: "all",
    clientCompany: "",
    page: 1
  });
  
  const { data: response, isLoading } = useOrdersList(user?.id, scope, {
    search: filterValues.search,
    status: filterValues.status,
    clientCompany: filterValues.clientCompany,
    startDate: filterValues.dateRange?.from?.toISOString(),
    endDate: filterValues.dateRange?.to?.toISOString(),
    page: filterValues.page,
    pageSize: 15
  });

  const orders = response?.data || [];
  const totalCount = response?.count || 0;
  const totalPages = Math.ceil(totalCount / 15);

  const handleExport = (type: 'excel' | 'pdf') => {
    const data = orders.map(o => ({
      ...o,
      status_label: ORDER_STATUS_LABELS[o.status] || o.status,
      total_formatted: (o.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      created_at_formatted: format(new Date(o.created_at), 'dd/MM/yyyy')
    }));
    
    if (type === 'excel') {
      exportToExcel({ items: data, filename: 'pedidos', columns: ORDER_EXPORT_COLUMNS });
    } else {
      exportToPDF({ items: data, filename: 'pedidos', columns: ORDER_EXPORT_COLUMNS });
    }
  };

  return (
    <MainLayout>
      <PageSEO title="Meus Pedidos" description="Acompanhe e gerencie todos os seus pedidos em um só lugar." path="/pedidos" />
      
      <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-6 pb-24 md:pb-6 animate-fade-in">
        
        <div className="space-y-1">
          <PersistentBreadcrumbs />
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 data-testid="page-title-pedidos" className="text-2xl font-bold font-display text-foreground flex items-center gap-2">
                Meus Pedidos
              </h1>
              <p className="text-muted-foreground text-sm">Gerencie e acompanhe o status das suas solicitações</p>
            </div>
            <div className="flex items-center gap-2">
              <ScopeBadge />
            </div>
          </div>
        </div>

        <OrderStatsBar />

        <div className="bg-card rounded-xl border p-4 shadow-sm space-y-4">
          <OrderFilters onFiltersChange={(v) => setFilterValues({ ...v, page: 1 })} />
          
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
                  <DropdownMenuItem onClick={() => handleExport('excel')}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel (.xlsx)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('pdf')}>
                    <FileText className="h-4 w-4 mr-2" /> PDF (.pdf)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <BatchExportDialog entityType="orders" filters={filterValues} />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : orders.length === 0 ? (
          <OrdersEmptyState search={filterValues.search} />
        ) : (
          <div className="grid gap-3">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} onClick={() => navigate(`/pedidos/${order.id}`)} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setFilterValues(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={filterValues.page === 1}
            >
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground mx-2">
              Página {filterValues.page} de {totalPages}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setFilterValues(prev => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))}
              disabled={filterValues.page === totalPages}
            >
              Próxima
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

function OrdersEmptyState({ search }: { search?: string }) {
  const navigate = useNavigate();
  
  return (
    <Card className="border-dashed border-2 bg-muted/30">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center mb-6">
          <Package className="h-10 w-10 text-primary/40" />
        </div>
        <h3 className="font-display text-xl font-semibold text-foreground mb-2">
          {search ? "Nenhum pedido encontrado" : "Você ainda não tem pedidos"}
        </h3>
        <p className="text-muted-foreground text-sm max-w-xs mb-8">
          {search 
            ? "Tente ajustar seus filtros para encontrar o que procura." 
            : "Inicie suas compras explorando nosso catálogo completo de produtos."}
        </p>
        {!search && (
          <Button onClick={() => navigate('/catalogo')} className="gap-2">
            <ShoppingBag className="h-4 w-4" />
            Explorar Catálogo
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
