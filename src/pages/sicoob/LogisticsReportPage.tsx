import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Truck, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  BarChart3
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function LogisticsReportPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["logistics-report"],
    queryFn: async () => {
      // Fetch data for aggregation
      const { data: orders, error } = await supabase
        .from("orders")
        .select(`
          id, 
          fulfillment_status,
          total_amount,
          order_logistics (carrier, estimated_delivery, status)
        `);
      
      if (error) throw error;

      // Aggregations
      const total = orders.length;
      const statuses = orders.reduce((acc: any, curr) => {
        const status = curr.fulfillment_status || 'pending';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      const delayed = orders.filter(o => {
        const est = o.order_logistics?.[0]?.estimated_delivery;
        return est && new Date(est) < new Date() && o.fulfillment_status !== 'delivered';
      }).length;

      return { total, statuses, delayed, orders };
    }
  });

  if (isLoading) return <MainLayout><div className="p-8 text-center">Gerando relatório logístico...</div></MainLayout>;

  return (
    <MainLayout>
      <PageSEO title="Relatório Logístico - Sicoob" description="Visão consolidada de logística e tracking." path="/sicoob/logistica" noIndex />
      
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Painel de Logística</h1>
          <p className="text-muted-foreground">Monitoramento de fluxo de produção e entrega da Onda A.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de Pedidos</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Em Trânsito</CardTitle>
              <Truck className="h-4 w-4 text-status-transit" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.statuses?.in_transit || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Atrasos Detectados</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.delayed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Entregues (Mês)</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.statuses?.delivered || 0}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Workflow de Produção
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Em Produção</span>
                  <span className="font-medium">{stats?.statuses?.in_production || 0}</span>
                </div>
                <Progress value={((stats?.statuses?.in_production || 0) / (stats?.total || 1)) * 100} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Em Separação</span>
                  <span className="font-medium">{stats?.statuses?.in_separation || 0}</span>
                </div>
                <Progress value={((stats?.statuses?.in_separation || 0) / (stats?.total || 1)) * 100} className="h-2 bg-secondary" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Finalizados</span>
                  <span className="font-medium">{stats?.statuses?.completed || 0}</span>
                </div>
                <Progress value={((stats?.statuses?.completed || 0) / (stats?.total || 1)) * 100} className="h-2 bg-success/15" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Top Transportadoras
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Simulated carrier performance */}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-muted rounded flex items-center justify-center font-bold text-xs">BP</div>
                    <div>
                      <p className="font-medium text-sm">Braspress</p>
                      <p className="text-xs text-muted-foreground">Eficiência: 98%</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-success border-success/40">Rápido</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-muted rounded flex items-center justify-center font-bold text-xs">CO</div>
                    <div>
                      <p className="font-medium text-sm">Correios</p>
                      <p className="text-xs text-muted-foreground">Eficiência: 85%</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-warning border-warning/40">Médio</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
