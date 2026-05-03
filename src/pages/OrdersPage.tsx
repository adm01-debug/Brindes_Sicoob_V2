import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { useAuth } from "@/contexts/AuthContext";
import { Package, Search, Download, FileSpreadsheet, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useOrdersList, ORDER_STATUS_LABELS } from "@/hooks";
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

export function OrdersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filterValues, setFilterValues] = useState<OrderFilterValues>({
    search: "",
    status: "all",
    clientCompany: ""
  });
  
  const scope = useSalesScope();
  
  const { data: orders = [], isLoading } = useOrdersList(user?.id, scope, {
    search: filterValues.search,
    status: filterValues.status,
    clientCompany: filterValues.clientCompany,
    startDate: filterValues.dateRange?.from?.toISOString(),
    endDate: filterValues.dateRange?.to?.toISOString()
  });

  const filtered = orders; // Já filtrado pelo backend via hook useOrdersList

  return (
    <MainLayout>
      <PageSEO title="Gestão de Pedidos" description="Acompanhe e gerencie todos os seus pedidos em um só lugar." path="/pedidos" />
      <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-4 pb-24 md:pb-6 animate-fade-in">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 data-testid="page-title-pedidos" className="text-2xl font-bold font-display text-foreground flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" /> Gestão de Pedidos
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Acompanhe e gerencie seus pedidos</p>
          </div>
          <ScopeBadge />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, cliente ou nota..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" /> Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  const data = filtered.map(o => ({
                    ...o,
                    status_label: ORDER_STATUS_LABELS[o.status] || o.status,
                    total_formatted: (o.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                    created_at_formatted: format(new Date(o.created_at), 'dd/MM/yyyy')
                  }));
                  exportToExcel({ items: data, filename: 'pedidos', columns: ORDER_EXPORT_COLUMNS });
                }}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  const data = filtered.map(o => ({
                    ...o,
                    status_label: ORDER_STATUS_LABELS[o.status] || o.status,
                    total_formatted: (o.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                    created_at_formatted: format(new Date(o.created_at), 'dd/MM/yyyy')
                  }));
                  exportToPDF({ items: data, filename: 'pedidos', columns: ORDER_EXPORT_COLUMNS });
                }}>
                  <FileText className="h-4 w-4 mr-2" /> PDF (.pdf)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <BatchExportDialog entityType="orders" filters={{ search: searchQuery }} />
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-display text-lg font-medium text-foreground mb-1">
                {searchQuery ? "Nenhum pedido encontrado" : "Nenhum pedido ainda"}
              </h3>
              <p className="text-muted-foreground text-sm">
                {searchQuery ? "Tente buscar com outros termos" : "Seus pedidos aparecerão aqui quando criados"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map((order) => (
              <OrderCard key={order.id} order={order} onClick={() => navigate(`/pedidos/${order.id}`)} />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
