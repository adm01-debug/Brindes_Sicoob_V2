import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { PageSEO } from "@/components/seo/PageSEO";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { 
  Package, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { deriveSellerOrderMetrics } from "@/lib/sicoob/operationalMetrics";
import { formatCurrency } from "@/lib/format";
import { OrderStatusBadge } from "@/components/sicoob/orders/OrderStatusBadge";
import type { OrderStatus } from "@/types/sicoob/orders";

export default function SellerPanelPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const ordersQuery = useQuery({
    queryKey: ["seller-panel-orders", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("sicoob_orders")
        .select("id,order_number,status,total_amount,created_at")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(user?.id),
  });

  const orders = ordersQuery.data ?? [];
  const metrics = deriveSellerOrderMetrics(orders);
  const STATS = [
    { title: "Meus Pedidos", value: metrics.total, icon: Package, color: "text-info" },
    { title: "Aguardando", value: metrics.waiting, icon: Clock, color: "text-warning" },
    { title: "Aprovados", value: metrics.approved, icon: CheckCircle2, color: "text-success" },
    { title: "Rejeitados", value: metrics.rejected, icon: AlertCircle, color: "text-destructive" },
  ];

  return (
    <>
      <PageSEO title="Painel do Vendedor Sicoob" description="Gestão de vendas e pedidos para vendedores Sicoob." path="/sicoob/vendas" noIndex />
      
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Olá, Vendedor</h1>
            <p className="text-muted-foreground">
              Gerencie seus pedidos e acompanhe o volume confirmado.
            </p>
          </div>
          <Button size="lg" className="gap-2" onClick={() => navigate("/filtros")}>
            <Plus className="h-5 w-5" />
            Novo Pedido
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((stat, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ordersQuery.isLoading ? "—" : stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Pedidos Recentes</CardTitle>
              <CardDescription>Seus últimos 5 pedidos realizados.</CardDescription>
            </CardHeader>
            <CardContent>
              {ordersQuery.isLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando pedidos</div>
              ) : ordersQuery.error ? (
                <p role="alert" className="py-8 text-center text-sm text-destructive">Não foi possível carregar os pedidos.</p>
              ) : orders.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Nenhum pedido registrado para este vendedor.</p>
              ) : (
                <div className="space-y-4">
                {orders.slice(0, 5).map((order) => (
                  <button key={order.id} type="button" onClick={() => navigate(`/sicoob/pedidos/${order.id}`)} className="flex w-full items-center justify-between rounded-lg border bg-muted/30 p-3 text-left hover:border-sicoob-green/40">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">Pedido #{order.order_number || order.id.slice(0, 8)}</span>
                      <span className="text-xs text-muted-foreground">{formatCurrency(Number(order.total_amount || 0))} · {new Date(order.created_at).toLocaleDateString("pt-BR")}</span>
                    </div>
                    <OrderStatusBadge status={order.status as OrderStatus} />
                  </button>
                ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Volume observado</CardTitle>
                <CardDescription>Soma dos pedidos aprovados ou concluídos visíveis para este vendedor.</CardDescription>
              </div>
              <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="text-2xl font-bold">{metrics.approved ? formatCurrency(metrics.measuredAmount) : "Sem dados"}</div>
                <p className="text-xs text-muted-foreground">Amostra: {metrics.approved} pedido(s) confirmado(s). Nenhuma meta comercial foi configurada para comparação.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
