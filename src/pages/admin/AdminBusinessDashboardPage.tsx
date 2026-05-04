import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GoalTracker } from "@/components/admin/GoalTracker";
import { OrdersHeatmap } from "@/components/admin/OrdersHeatmap";
import { QuotesFunnelChart } from "@/components/quotes/QuotesFunnelChart";
import { useQuotes } from "@/hooks/useQuotes";
import { useQuoteFunnel } from "@/hooks/useQuoteFunnel";
import { BarChart3, TrendingUp, Users, ShoppingBag } from "lucide-react";

export default function AdminBusinessDashboardPage() {
  const { quotes } = useQuotes();
  // Using empty viewedMap for now as it's a new feature dependency
  const funnelData = useQuoteFunnel(quotes, {});

  return (
    <MainLayout>
      <PageSEO title="Business Intelligence" description="Painel executivo de vendas e metas." path="/admin/business" noIndex />
      
      <div className="max-w-[1920px] mx-auto p-4 lg:p-6 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Dashboard Executivo</h1>
            <p className="text-sm text-muted-foreground">Visão estratégica de vendas, funil e metas.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-sicoob-green bg-sicoob-green/10 px-2 py-1 rounded uppercase tracking-wider">
              Live BI
            </span>
          </div>
        </div>

        {/* KPIs principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Conversão Global</p>
                <p className="text-xl font-bold font-display">
                  {funnelData.stages.find(s => s.id === 'converted')?.rateFromPrev?.toFixed(1) || '0'}%
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Ticket Médio</p>
                <p className="text-xl font-bold font-display">
                  R$ {(quotes.reduce((sum, q) => sum + (q.total || 0), 0) / (quotes.length || 1)).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Clientes Ativos</p>
                <p className="text-xl font-bold font-display">
                  {new Set(quotes.map(q => q.client_id)).size}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Ciclo de Venda</p>
                <p className="text-xl font-bold font-display">
                  {funnelData.avgCycleDays?.toFixed(1) || '—'} dias
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <QuotesFunnelChart data={funnelData} />
            <OrdersHeatmap />
          </div>
          
          <div className="space-y-6">
            <GoalTracker />
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Insights Rápidos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-lg bg-muted/30 border border-border/40 text-[11px] leading-relaxed">
                  💡 <span className="font-bold">Dica de Performance:</span> Sua taxa de conversão de "Aprovado" para "Convertido" está abaixo da média. Considere automatizar o faturamento.
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border/40 text-[11px] leading-relaxed">
                  📈 <span className="font-bold">Tendência:</span> O horário de pico de pedidos é terça-feira às 14h. Reforce o time de suporte neste período.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
