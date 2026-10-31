import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertCircle,
  FileText,
  Clock,
  Building,
  ArrowRight,
  Wallet,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { SicoobStatusBadge } from '@/components/sicoob/SicoobStatusBadge';
import { HierarchyPath } from '@/components/sicoob/HierarchyPath';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface GestorOrderSummary {
  id: string;
  pa: string;
  val: number;
  status: string;
}

interface GestorStats {
  totalPAs: number;
  pendingApprovals: number;
  totalSpentMonth: number;
  monthlyBudget: number;
  hasConfiguredBudget: boolean;
  recentOrders: GestorOrderSummary[];
}

async function loadBudgetTotals(paIds: string[]) {
  if (paIds.length === 0) {
    return {
      totalSpentMonth: 0,
      monthlyBudget: 0,
      hasConfiguredBudget: false,
    };
  }
  const now = new Date();
  const { data, error } = await supabase
    .from('pa_budgets')
    .select('verba_total, verba_consumida')
    .in('pa_id', paIds)
    .eq('ano', now.getFullYear())
    .eq('mes', now.getMonth() + 1);
  if (error) throw error;
  const budgets = data ?? [];
  return {
    monthlyBudget: budgets.reduce((total, budget) => total + Number(budget.verba_total || 0), 0),
    totalSpentMonth: budgets.reduce(
      (total, budget) => total + Number(budget.verba_consumida || 0),
      0,
    ),
    hasConfiguredBudget: budgets.length > 0,
  };
}

async function loadRecentOrders(cooperativeId: string) {
  const { data, error } = await supabase
    .from('sicoob_orders')
    .select('id, total_amount, status, postos_atendimento(nome)')
    .eq('cooperative_id', cooperativeId)
    .order('created_at', { ascending: false })
    .limit(5);
  if (error) throw error;
  return (data ?? []).map((order) => ({
    id: order.id,
    pa: order.postos_atendimento?.nome || 'Desconhecido',
    val: Number(order.total_amount),
    status: order.status,
  }));
}

async function loadGestorStats(cooperativeId?: string | null): Promise<GestorStats | null> {
  if (!cooperativeId) return null;
  const [pasResult, approvalsResult] = await Promise.all([
    supabase
      .from('postos_atendimento')
      .select('id', { count: 'exact' })
      .eq('cooperativa_id', cooperativeId),
    supabase
      .from('sicoob_approval_requests')
      .select('id, sicoob_orders!inner(cooperative_id)', {
        count: 'exact',
        head: true,
      })
      .eq('status', 'pending')
      .eq('sicoob_orders.cooperative_id', cooperativeId),
  ]);
  if (pasResult.error) throw pasResult.error;
  if (approvalsResult.error) throw approvalsResult.error;

  const paIds = (pasResult.data ?? []).map((pa) => pa.id);
  const [budget, recentOrders] = await Promise.all([
    loadBudgetTotals(paIds),
    loadRecentOrders(cooperativeId),
  ]);
  return {
    totalPAs: pasResult.count ?? 0,
    pendingApprovals: approvalsResult.count ?? 0,
    ...budget,
    recentOrders,
  };
}

function GestorLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <Alert variant="destructive" role="alert">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Não foi possível carregar os indicadores</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        Os números da Singular não foram substituídos por estimativas. Tente consultar novamente.
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Tentar novamente
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function GestorMetrics({
  stats,
  isLoading,
  budgetProgress,
}: {
  stats: GestorStats | null | undefined;
  isLoading: boolean;
  budgetProgress: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
      <Card className="border-[1.5px]">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Cooperativas (PAs)</CardTitle>
          <Building className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div className="text-2xl font-bold">{stats?.totalPAs ?? '—'}</div>
          )}
          <p className="mt-1 text-xs text-muted-foreground">Pontos de atendimento ativos</p>
        </CardContent>
      </Card>
      <Card className="border-[1.5px]">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Aprovações Pendentes</CardTitle>
          <Clock className="h-4 w-4 text-status-production" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div className="text-2xl font-bold text-status-production">
              {stats?.pendingApprovals ?? '—'}
            </div>
          )}
          <p className="mt-1 text-xs font-medium text-muted-foreground text-status-production/80">
            Requerem sua atenção
          </p>
        </CardContent>
      </Card>
      <Card className="border-[1.5px] md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Consumo Global da Singular</CardTitle>
          <div className="text-sm font-bold text-sicoob-green-dark">
            {budgetProgress.toFixed(1)}%
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <Skeleton className="h-8 w-60" />
          ) : (
            <div className="text-2xl font-bold text-sicoob-green-dark">
              {stats?.hasConfiguredBudget ? (
                <>
                  {formatCurrency(stats.totalSpentMonth)}
                  <span className="text-sm font-normal text-muted-foreground">
                    {' '}
                    / {formatCurrency(stats.monthlyBudget)}
                  </span>
                </>
              ) : (
                <span className="text-base font-semibold text-muted-foreground">
                  Verba não configurada para este mês
                </span>
              )}
            </div>
          )}
          <div className="h-2 w-full rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-sicoob-green transition-all duration-500"
              style={{
                width: `${Math.max(0, Math.min(100, budgetProgress))}%`,
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RecentGestorOrders({
  orders,
  isLoading,
}: {
  orders?: GestorOrderSummary[];
  isLoading: boolean;
}) {
  let content: React.ReactNode;
  if (isLoading) {
    content = (
      <>
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </>
    );
  } else if (!orders?.length) {
    content = <div className="py-6 text-center text-muted-foreground">Nenhum pedido recente.</div>;
  } else {
    content = orders.map((order) => (
      <div
        key={order.id}
        className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/30 p-3 transition-colors hover:bg-muted/50"
      >
        <div className="flex items-center gap-3">
          <SicoobStatusBadge status={order.status} showLabel={false} />
          <div>
            <div className="text-sm font-medium">{order.pa}</div>
            <div className="text-xs text-muted-foreground">Valor: {formatCurrency(order.val)}</div>
          </div>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/sicoob/pedidos/${order.id}`}>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    ));
  }
  return (
    <Card className="border-[1.5px]">
      <CardHeader>
        <CardTitle>Aprovações Recentes</CardTitle>
        <CardDescription>Pedidos aguardando validação financeira da Singular.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">{content}</div>
      </CardContent>
    </Card>
  );
}

export default function GestorDashboardPage() {
  const { user } = useAuth();
  const userId = user?.id;

  const { data: profile } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, avatar_url, role, cooperativa_id, pa_id')
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(userId),
  });

  const cooperativeId = profile?.cooperativa_id;
  const {
    data: stats,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['sicoob-gestor-stats', cooperativeId],
    queryFn: () => loadGestorStats(cooperativeId),
    enabled: Boolean(cooperativeId),
  });

  const budgetProgress = stats?.monthlyBudget
    ? (stats.totalSpentMonth / stats.monthlyBudget) * 100
    : 0;

  return (
    <>
      <div className="container mx-auto animate-fade-in space-y-8 p-6">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="space-y-2">
            <HierarchyPath paId={profile?.pa_id ?? undefined} />
            <h1 data-testid="page-title-gestor" className="flex items-center gap-2 font-display text-3xl font-bold tracking-tight text-sicoob-green-dark">
              <ShieldCheck className="h-7 w-7 text-sicoob-green" />
              Gestão de Governança Singular
            </h1>
            <p className="text-sm text-muted-foreground">
              Monitoramento consolidado, curadoria regional e fluxo de aprovações financeiras.
            </p>
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

        {isError && <GestorLoadError onRetry={() => refetch()} />}

        <GestorMetrics stats={stats} isLoading={isLoading} budgetProgress={budgetProgress} />

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <RecentGestorOrders orders={stats?.recentOrders} isLoading={isLoading} />

          <Card className="border-[1.5px] border-sicoob-green/20 bg-sicoob-green/5">
            <CardHeader>
              <CardTitle className="text-sicoob-green-dark">Ações Rápidas</CardTitle>
              <CardDescription>Ferramentas de gestão da Singular.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-auto flex-col gap-2 py-4 hover:border-sicoob-green/30 hover:bg-sicoob-green/10"
                asChild
              >
                <Link to="/gestor/aprovacoes">
                  <Clock className="h-5 w-5 text-sicoob-green" />
                  Fila de Aprovação
                </Link>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col gap-2 py-4 hover:border-sicoob-green/30 hover:bg-sicoob-green/10"
                asChild
              >
                <Link to="/gestor/agregados">
                  <FileText className="h-5 w-5 text-sicoob-green" />
                  Pedidos Agregados
                </Link>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col gap-2 py-4 hover:border-sicoob-green/30 hover:bg-sicoob-green/10"
                asChild
              >
                <Link to="/admin/verbas">
                  <Wallet className="h-5 w-5 text-sicoob-green" />
                  Gestão de Verbas
                </Link>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col gap-2 py-4 hover:border-sicoob-green/30 hover:bg-sicoob-green/10"
                asChild
              >
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
