import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MainLayout } from "@/components/layout/MainLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, FileText, CheckCircle2, Clock, Building, ArrowRight, Wallet, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function GestorDashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ["sicoob-gestor-stats"],
    queryFn: async () => {
      return {
        totalPAs: 12,
        pendingApprovals: 5,
        totalSpentMonth: 125430.20,
        monthlyBudget: 500000.00,
        recentOrders: [
          { id: "1", pa: "PA 01 - Centro", val: 12500, status: "pending" },
          { id: "2", pa: "PA 04 - Industrial", val: 8900, status: "approved" },
          { id: "3", pa: "PA 02 - Norte", val: 4500, status: "pending" },
        ]
      };
    }
  });

  const budgetProgress = stats ? (stats.totalSpentMonth / stats.monthlyBudget) * 100 : 0;

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-8 animate-fade-in">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-display tracking-tight text-sicoob-green-dark">Gestão da Singular</h1>
            <p className="text-muted-foreground">Visão consolidada da Singular e fluxo de aprovações.</p>
          </div>
          <Button asChild>
            <Link to="/sicoob/pedidos" className="gap-2">
              <FileText className="h-4 w-4" /> Ver Todos os Pedidos
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-[1.5px]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Cooperativas (PAs)</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalPAs}</div>
              <p className="text-xs text-muted-foreground mt-1">Pontos de atendimento ativos</p>
            </CardContent>
          </Card>

          <Card className="border-[1.5px]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Aprovações Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats?.pendingApprovals}</div>
              <p className="text-xs text-muted-foreground mt-1 text-amber-600/80 font-medium">Requerem sua atenção</p>
            </CardContent>
          </Card>

          <Card className="border-[1.5px] md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Consumo Global da Singular</CardTitle>
              <div className="text-sm font-bold text-primary">{budgetProgress.toFixed(1)}%</div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-2xl font-bold">{formatCurrency(stats?.totalSpentMonth || 0)} <span className="text-sm font-normal text-muted-foreground">/ {formatCurrency(stats?.monthlyBudget || 0)}</span></div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: `${budgetProgress}%` }} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="border-[1.5px]">
            <CardHeader>
              <CardTitle>Aprovações Recentes</CardTitle>
              <CardDescription>Pedidos aguardando validação financeira da Singular.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${order.status === 'pending' ? 'bg-amber-100' : 'bg-green-100'}`}>
                        {order.status === 'pending' ? <Clock className="h-4 w-4 text-amber-600" /> : <CheckCircle2 className="h-4 w-4 text-green-600" />}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{order.pa}</div>
                        <div className="text-xs text-muted-foreground">Valor: {formatCurrency(order.val)}</div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/sicoob/pedidos/${order.id}`}>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-[1.5px] bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">Ações Rápidas</CardTitle>
              <CardDescription>Ferramentas de gestão da Singular.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                <Link to="/admin/verbas">
                  <Wallet className="h-5 w-5" />
                  Gerir Verbas
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                <Link to="/gestor/agregados">
                  <FileText className="h-5 w-5" />
                  Agregados
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
