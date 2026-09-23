import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, FileText, Clock, Building, ArrowRight, Wallet, TrendingUp, ShieldCheck } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { SicoobStatusBadge } from "@/components/sicoob/SicoobStatusBadge";
import { HierarchyPath } from "@/components/sicoob/HierarchyPath";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function GestorDashboardPage() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, avatar_url, role, cooperativa_id, pa_id')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const { data: stats, isLoading, isError, refetch } = useQuery({
    queryKey: ["sicoob-gestor-stats", profile?.cooperativa_id],
    queryFn: async () => {
      if (!profile?.cooperativa_id) return null;

      const now = new Date();
      const { data: pasData, count: totalPAs, error: pasError } = await supabase
        .from('postos_atendimento')
        .select('id', { count: 'exact' })
        .eq('cooperativa_id', profile.cooperativa_id);
      if (pasError) throw pasError;

      const { count: pendingApprovals, error: approvalsError } = await supabase
        .from('sicoob_approval_requests')
        .select('id, sicoob_orders!inner(cooperative_id)', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('sicoob_orders.cooperative_id', profile.cooperativa_id);
      if (approvalsError) throw approvalsError;

      const paIds = (pasData ?? []).map(pa => pa.id);
      let budgetsData: Array<{ verba_total: number; verba_consumida: number }> = [];
      if (paIds.length > 0) {
        const { data, error } = await supabase
          .from('pa_budgets')
          .select('verba_total, verba_consumida')
          .in('pa_id', paIds)
          .eq('ano', now.getFullYear())
          .eq('mes', now.getMonth() + 1);
        if (error) throw error;
        budgetsData = data ?? [];
      }

      const monthlyBudget = budgetsData.reduce((acc, budget) => acc + Number(budget.verba_total || 0), 0);
      const totalSpentMonth = budgetsData.reduce((acc, budget) => acc + Number(budget.verba_consumida || 0), 0);

      // Recent orders needing approval or just recent
      const { data: recentOrders, error: recentOrdersError } = await supabase
        .from('sicoob_orders')
        .select('id, total_amount, status, postos_atendimento(nome)')
        .eq('cooperative_id', profile.cooperativa_id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (recentOrdersError) throw recentOrdersError;

      return {
        totalPAs: totalPAs || 0,
        pendingApprovals: pendingApprovals || 0,
        totalSpentMonth,
        monthlyBudget,
        hasConfiguredBudget: budgetsData.length > 0,
        recentOrders: recentOrders?.map(o => ({
          id: o.id,
          pa: o.postos_atendimento?.nome || "Desconhecido",
          val: Number(o.total_amount),
          status: o.status
        })) || []
      };
    },
    enabled: !!profile?.cooperativa_id
  });

  const budgetProgress = stats?.monthlyBudget
    ? (stats.totalSpentMonth / stats.monthlyBudget) * 100
    : 0;

  return (
    <>
      <div className="container mx-auto p-6 space-y-8 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <HierarchyPath paId={profile?.pa_id ?? undefined} />
            <h1 className="text-3xl font-bold font-display tracking-tight text-sicoob-green-dark flex items-center gap-2">
              <ShieldCheck className="h-7 w-7 text-sicoob-green" />
              Gestão de Governança Singular
            </h1>
            <p className="text-sm text-muted-foreground">Monitoramento consolidado, curadoria regional e fluxo de aprovações financeiras.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/gestor/aprovacoes" className="gap-2">
                <Clock className="h-4 w-4" /> Ver Fila de Aprovações
              </Link>
            </Button>
            <Button asChild>
              <Link to="/sicoob/pedidos" className="gap-2">
                <FileText className="h-4 w-4" /> Ver Todos os Pedidos
              </Link>
            </Button>
          </div>
        </div>

        {isError && (
          <Alert variant="destructive" role="alert">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Não foi possível carregar os indicadores</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
              Os números da Singular não foram substituídos por estimativas. Tente consultar novamente.
              <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
                Tentar novamente
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-[1.5px]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Cooperativas (PAs)</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">{stats?.totalPAs ?? "—"}</div>}
              <p className="text-xs text-muted-foreground mt-1">Pontos de atendimento ativos</p>
            </CardContent>
          </Card>

          <Card className="border-[1.5px]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Aprovações Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-status-production" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold text-status-production">{stats?.pendingApprovals ?? "—"}</div>}
              <p className="text-xs text-muted-foreground mt-1 text-status-production/80 font-medium">Requerem sua atenção</p>
            </CardContent>
          </Card>

          <Card className="border-[1.5px] md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Consumo Global da Singular</CardTitle>
              <div className="text-sm font-bold text-sicoob-green-dark">{budgetProgress.toFixed(1)}%</div>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <Skeleton className="h-8 w-60" />
              ) : (
                <div className="text-2xl font-bold text-sicoob-green-dark">
                  {stats?.hasConfiguredBudget ? (
                    <>{formatCurrency(stats.totalSpentMonth)} <span className="text-sm font-normal text-muted-foreground"> / {formatCurrency(stats.monthlyBudget)}</span></>
                  ) : (
                    <span className="text-base font-semibold text-muted-foreground">Verba não configurada para este mês</span>
                  )}
                </div>
              )}
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-sicoob-green h-2 rounded-full transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, budgetProgress))}%` }} />
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
                {isLoading ? (
                  <>
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </>
                ) : stats?.recentOrders.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">Nenhum pedido recente.</div>
                ) : (
                  stats?.recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <SicoobStatusBadge status={order.status} showLabel={false} />
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
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-[1.5px] bg-sicoob-green/5 border-sicoob-green/20">
            <CardHeader>
              <CardTitle className="text-sicoob-green-dark">Ações Rápidas</CardTitle>
              <CardDescription>Ferramentas de gestão da Singular.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="h-auto py-4 flex-col gap-2 hover:bg-sicoob-green/10 hover:border-sicoob-green/30" asChild>
                <Link to="/gestor/aprovacoes">
                  <Clock className="h-5 w-5 text-sicoob-green" />
                  Fila de Aprovação
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2 hover:bg-sicoob-green/10 hover:border-sicoob-green/30" asChild>
                <Link to="/gestor/agregados">
                  <FileText className="h-5 w-5 text-sicoob-green" />
                  Pedidos Agregados
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2 hover:bg-sicoob-green/10 hover:border-sicoob-green/30" asChild>
                <Link to="/admin/verbas">
                  <Wallet className="h-5 w-5 text-sicoob-green" />
                  Gestão de Verbas
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2 hover:bg-sicoob-green/10 hover:border-sicoob-green/30" asChild>
                <Link to="/relatorios/sicoob">
                  <TrendingUp className="h-5 w-5 text-sicoob-green" />
                  Relatórios
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
