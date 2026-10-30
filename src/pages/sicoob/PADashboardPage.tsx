import type { ElementType } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  Wallet,
  Clock,
  CheckCircle2,
  TrendingUp,
  Plus,
  ArrowRight,
  Package,
  Search,
  LayoutDashboard,
  AlertCircle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { Progress } from '@/components/ui/progress';
import { SicoobStatusBadge } from '@/components/sicoob/SicoobStatusBadge';
import { OrderBudgetIntelligence } from '@/components/sicoob/orders/OrderBudgetIntelligence';
import { usePaDashboardStats } from '@/hooks/sicoob/usePaDashboardStats';
import { useAuth } from '@/contexts/AuthContext';
import { HierarchyPath } from '@/components/sicoob/HierarchyPath';

type DashboardStats = NonNullable<ReturnType<typeof usePaDashboardStats>['data']>;

function DashboardHeader({ paId }: { paId?: string }) {
  return (
    <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
      <div className="space-y-2">
        <HierarchyPath paId={paId} />
        <h1 className="flex items-center gap-2 font-display text-3xl font-bold tracking-tight text-sicoob-green-dark">
          <LayoutDashboard className="h-7 w-7 text-sicoob-green" />
          Portal de Abastecimento PA
        </h1>
        <p className="text-sm italic text-muted-foreground">
          Gestão tática de brindes e materiais institucionais para sua unidade.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" asChild>
          <Link to="/sicoob/pedidos" className="gap-2">
            <Search className="h-4 w-4" /> Meus Pedidos
          </Link>
        </Button>
        <Button asChild>
          <Link to="/filtros" className="gap-2">
            <Plus className="h-4 w-4" /> Novo Pedido
          </Link>
        </Button>
      </div>
    </div>
  );
}

function DashboardError({ error }: { error: unknown }) {
  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardContent className="flex items-center gap-3 py-4 text-sm text-destructive">
        <AlertCircle className="h-5 w-5" />
        {error instanceof Error ? error.message : 'Indicadores indisponíveis no momento.'}
      </CardContent>
    </Card>
  );
}

function MetricCard({
  title,
  value,
  description,
  icon,
  valueClassName,
}: {
  title: string;
  value: string | number | undefined;
  description: string;
  icon: ElementType;
  valueClassName?: string;
}) {
  const Icon = icon;
  return (
    <Card className="border-[1.5px]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-status-transit" />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueClassName ?? ''}`}>{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function BudgetMetric({ stats, budgetUsed }: { stats?: DashboardStats; budgetUsed: number }) {
  return (
    <Card className="border-[1.5px] border-sicoob-green/20 bg-sicoob-green/5">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-sicoob-green-dark">
          Saldo Disponível
        </CardTitle>
        <Wallet className="h-4 w-4 text-sicoob-green" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-sicoob-green-dark">
          {formatCurrency(stats?.availableBudget || 0)}
        </div>
        {stats && !stats.hasConfiguredBudget && (
          <p className="mt-1 text-xs text-amber-700">Verba ainda não configurada para este PA.</p>
        )}
        <div className="mt-2 space-y-1">
          <div className="flex justify-between text-[10px] font-bold uppercase text-muted-foreground">
            <span>Uso da Verba</span>
            <span>{budgetUsed.toFixed(0)}%</span>
          </div>
          <Progress value={budgetUsed} className="h-1.5" indicatorClassName="bg-sicoob-green" />
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardMetrics({ stats, budgetUsed }: { stats?: DashboardStats; budgetUsed: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
      <BudgetMetric stats={stats} budgetUsed={budgetUsed} />
      <MetricCard
        title="Pedidos Ativos"
        value={stats?.activeOrders}
        description="Em processamento ou trânsito"
        icon={Package}
      />
      <MetricCard
        title="Aguardando Singular"
        value={stats?.pendingApproval}
        description="Pedidos em análise financeira"
        icon={Clock}
        valueClassName="text-status-production"
      />
      <MetricCard
        title="Entregues (Mês)"
        value={stats?.deliveredThisMonth}
        description="Sucesso operacional"
        icon={CheckCircle2}
        valueClassName="text-green-600"
      />
    </div>
  );
}

function RecentOrderRow({ order }: { order: DashboardStats['recentOrders'][number] }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 p-4 transition-colors hover:bg-muted/30">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background">
          <ShoppingBag className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <div className="text-sm font-bold">
            Pedido #{order.order_number || order.id.slice(0, 8)}
          </div>
          <div className="text-xs text-muted-foreground">{formatCurrency(order.total_amount)}</div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden text-right sm:block">
          <div className="text-xs font-medium">
            {new Date(order.created_at).toLocaleDateString('pt-BR')}
          </div>
          <SicoobStatusBadge status={order.status} className="mt-1" />
        </div>
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/sicoob/pedidos/${order.id}`}>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function RecentOrdersContent({ stats, isLoading }: { stats?: DashboardStats; isLoading: boolean }) {
  if (isLoading)
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((index) => (
          <div key={index} className="h-20 w-full animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  if (!stats?.recentOrders.length)
    return <div className="py-8 text-center text-muted-foreground">Nenhum pedido encontrado.</div>;
  return (
    <>
      {stats.recentOrders.map((order) => (
        <RecentOrderRow key={order.id} order={order} />
      ))}
    </>
  );
}

function RecentOrders({ stats, isLoading }: { stats?: DashboardStats; isLoading: boolean }) {
  return (
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
          <RecentOrdersContent stats={stats} isLoading={isLoading} />
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardSidebar({ stats, paName }: { stats?: DashboardStats; paName: string }) {
  return (
    <div className="space-y-6">
      <OrderBudgetIntelligence
        orderTotal={0}
        remainingBudget={stats?.availableBudget || 0}
        allocatedBudget={stats?.monthlyLimit || 0}
        paName={paName}
      />
      <Card className="h-full border-[1.5px]">
        <CardHeader>
          <CardTitle>Suporte & Dúvidas</CardTitle>
          <CardDescription>Precisa de ajuda com seu pedido ou verba?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" className="h-12 w-full justify-start gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sicoob-green/10">
              <TrendingUp className="h-3 w-3 text-sicoob-green" />
            </div>
            <span className="text-sm font-medium">Solicitar Aumento de Limite</span>
          </Button>
          <Button variant="outline" className="h-12 w-full justify-start gap-3" asChild>
            <Link to="/relatorios/sicoob">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-status-transit/10">
                <Search className="h-3 w-3 text-status-transit" />
              </div>
              <span className="text-sm font-medium">Extrato Detalhado de Verba</span>
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function calculateBudgetUsed(stats: DashboardStats | null | undefined): number {
  if (!stats || stats.monthlyLimit <= 0) return 0;
  return ((stats.monthlyLimit - stats.availableBudget) / stats.monthlyLimit) * 100;
}

function getPaDisplayName(fullName: string | null | undefined): string {
  return fullName?.split(' - ')[1] || 'Minha Agência';
}

export default function PADashboardPage() {
  const { profile } = useAuth();
  const { data: stats, isLoading, isError, error } = usePaDashboardStats();
  const dashboardStats = stats ?? undefined;
  const budgetUsed = calculateBudgetUsed(stats);
  const paName = getPaDisplayName(profile?.full_name);

  return (
    <>
      <div className="container mx-auto animate-fade-in space-y-8 p-6">
        <DashboardHeader paId={profile?.pa_id ?? undefined} />
        {isError && <DashboardError error={error} />}
        <DashboardMetrics stats={dashboardStats} budgetUsed={budgetUsed} />
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <RecentOrders stats={dashboardStats} isLoading={isLoading} />
          <DashboardSidebar stats={dashboardStats} paName={paName} />
        </div>
      </div>
    </>
  );
}
