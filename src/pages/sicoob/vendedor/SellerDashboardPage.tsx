import React from "react";
// import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, ShoppingBag, Target, TrendingUp, Calendar, ArrowRight, UserPlus, Briefcase, Loader2 } from "lucide-react";
import { useSellerDashboardStats } from "@/hooks/sicoob/useSellerDashboardStats";
import { formatCurrency } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

export default function SellerDashboardPage() {
  const { data: stats, isLoading } = useSellerDashboardStats();

  const goalProgress = stats ? (stats.monthlySales / stats.salesGoal) * 100 : 0;

  return (
    <>
      <div className="container mx-auto p-6 space-y-8 animate-fade-in">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-display tracking-tight text-sicoob-green-dark">Minha Carteira</h1>
            <p className="text-muted-foreground italic">Gestão comercial e aceleração de vendas SICOOB.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/clientes" className="gap-2">
                <Users className="h-4 w-4" /> Ver Clientes
              </Link>
            </Button>
            <Button asChild>
              <Link to="/orcamentos/novo" className="gap-2">
                <ShoppingBag className="h-4 w-4" /> Novo Orçamento
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-[1.5px]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Clientes na Carteira</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalClients}</div>
              <p className="text-xs text-muted-foreground mt-1">Singulares e PAs ativos</p>
            </CardContent>
          </Card>

          <Card className="border-[1.5px]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pedidos em Aberto</CardTitle>
              <ShoppingBag className="h-4 w-4 text-status-transit" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-status-transit">{stats?.activeOrders}</div>
              <p className="text-xs text-muted-foreground mt-1 text-status-transit/80 font-medium">Em produção ou trânsito</p>
            </CardContent>
          </Card>

          <Card className="border-[1.5px] md:col-span-2 bg-primary/5 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-sicoob-green-dark">Meta Mensal de Vendas</CardTitle>
              <Target className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-end">
                <div className="text-2xl font-bold text-sicoob-green-dark">
                  {formatCurrency(stats?.monthlySales || 0)} 
                </div>
                <div className="text-sm font-bold text-sicoob-green-dark">{goalProgress.toFixed(0)}%</div>
              </div>
              <Progress value={goalProgress} className="h-2" indicatorClassName="bg-sicoob-green" />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="border-[1.5px] md:col-span-2">
            <CardHeader>
              <CardTitle>Top Clientes (Mês)</CardTitle>
              <CardDescription>Maiores volumes de faturamento por Cooperativa.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {isLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                ) : stats?.topClients.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground italic">Nenhum dado de faturamento disponível.</div>
                ) : (
                  stats?.topClients.map((client, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-sm text-muted-foreground">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-semibold">{client.name}</div>
                          <div className="text-xs text-muted-foreground">Faturamento: {formatCurrency(client.value)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className={`text-sm font-medium ${client.grow.startsWith('+') ? 'text-status-delivered' : 'text-destructive'}`}>
                          {client.grow}
                        </div>
                        <Button variant="ghost" size="icon" asChild>
                          <Link to="/clientes">
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-[1.5px]">
            <CardHeader>
              <CardTitle>Atividade Recente</CardTitle>
              <CardDescription>Últimas interações na sua carteira.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {isLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                ) : stats?.recentActivity.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground italic">Nenhuma atividade recente.</div>
                ) : (
                  stats?.recentActivity.map((item, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className="relative mt-1">
                        <div className="w-2 h-2 rounded-full bg-primary ring-4 ring-primary/20" />
                        {idx < stats.recentActivity.length - 1 && (
                          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[1px] h-10 bg-border" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{item.action}</div>
                        <div className="text-xs text-muted-foreground">{item.client} • {item.time}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <Button variant="outline" className="w-full mt-6" asChild>
                <Link to="/sicoob/pedidos">Ver Todos os Pedidos</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
