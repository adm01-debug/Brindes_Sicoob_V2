import React from "react";
// import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  ShoppingBag, 
  Wallet, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  Plus, 
  ArrowRight,
  Package,
  Search
} from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { usePaDashboardStats } from "@/hooks/sicoob/usePaDashboardStats";

export default function PADashboardPage() {
  const { data: stats, isLoading } = usePaDashboardStats();

  const budgetUsed = stats && stats.monthlyLimit > 0 
    ? ((stats.monthlyLimit - stats.availableBudget) / stats.monthlyLimit) * 100 
    : 0;

  return (
    <>
      <div className="container mx-auto p-6 space-y-8 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display tracking-tight text-sicoob-green-dark">Portal do PA</h1>
            <p className="text-muted-foreground italic">Gestão tática de pedidos e abastecimento da agência.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/sicoob/pedidos" className="gap-2">
                <Search className="h-4 w-4" /> Meus Pedidos
              </Link>
            </Button>
            <Button asChild>
              <Link to="/catalogo" className="gap-2">
                <Plus className="h-4 w-4" /> Novo Pedido
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-[1.5px] bg-sicoob-green/5 border-sicoob-green/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-sicoob-green-dark">Saldo Disponível</CardTitle>
              <Wallet className="h-4 w-4 text-sicoob-green" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-sicoob-green-dark">{formatCurrency(stats?.availableBudget || 0)}</div>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground">
                  <span>Uso da Verba</span>
                  <span>{budgetUsed.toFixed(0)}%</span>
                </div>
                <Progress value={budgetUsed} className="h-1.5" indicatorClassName="bg-sicoob-green" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-[1.5px]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pedidos Ativos</CardTitle>
              <Package className="h-4 w-4 text-status-transit" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeOrders}</div>
              <p className="text-xs text-muted-foreground mt-1">Em processamento ou trânsito</p>
            </CardContent>
          </Card>

          <Card className="border-[1.5px]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Aguardando Singular</CardTitle>
              <Clock className="h-4 w-4 text-status-production" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-status-production">{stats?.pendingApproval}</div>
              <p className="text-xs text-muted-foreground mt-1">Pedidos em análise financeira</p>
            </CardContent>
          </Card>

          <Card className="border-[1.5px]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Entregues (Mês)</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats?.deliveredThisMonth}</div>
              <p className="text-xs text-muted-foreground mt-1">Sucesso operacional</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="border-[1.5px] md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Últimas Movimentações</CardTitle>
                <CardDescription>Acompanhe o status recente dos seus pedidos.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/sicoob/pedidos" className="gap-2">
                  Ver Tudo <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                   <div className="flex flex-col gap-4">
                     {[1, 2, 3].map(i => (
                       <div key={i} className="h-20 w-full animate-pulse bg-muted rounded-xl" />
                     ))}
                   </div>
                ) : stats?.recentOrders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum pedido encontrado.
                  </div>
                ) : (
                  stats?.recentOrders.map((order: any) => (
                    <div key={order.id} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center border border-border">
                          <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="font-bold text-sm">Pedido #{order.order_number || order.id.slice(0, 8)}</div>
                          <div className="text-xs text-muted-foreground">{formatCurrency(order.total_amount)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <div className="text-xs font-medium">{new Date(order.created_at).toLocaleDateString('pt-BR')}</div>
                          <OrderStatusBadge status={order.status} className="mt-1" />
                        </div>
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/sicoob/pedidos/${order.id}`}>
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

          <Card className="border-[1.5px] h-full">
            <CardHeader>
              <CardTitle>Suporte & Dúvidas</CardTitle>
              <CardDescription>Precisa de ajuda com seu pedido ou verba?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl bg-sicoob-green/5 border border-sicoob-green/10">
                <h4 className="font-bold text-sm text-sicoob-green-dark mb-1">Dica de Verba</h4>
                <p className="text-xs text-sicoob-green-dark/70 leading-relaxed">
                  Pedidos que excedem o saldo disponível são automaticamente encaminhados para aprovação extra da Singular.
                </p>
              </div>
              <Button variant="outline" className="w-full justify-start gap-3 h-12">
                <div className="w-6 h-6 rounded-full bg-sicoob-green/10 flex items-center justify-center">
                  <TrendingUp className="h-3 w-3 text-sicoob-green" />
                </div>
                <span className="text-sm font-medium">Solicitar Aumento de Limite</span>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 h-12" asChild>
                <Link to="/relatorios/sicoob">
                  <div className="w-6 h-6 rounded-full bg-status-transit/10 flex items-center justify-center">
                    <Search className="h-3 w-3 text-status-transit" />
                  </div>
                  <span className="text-sm font-medium">Extrato Detalhado de Verba</span>
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

