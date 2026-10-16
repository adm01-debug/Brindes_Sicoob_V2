// import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ShoppingBag,
  TrendingUp,
  Briefcase,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useSellerDashboardStats } from '@/hooks/sicoob/useSellerDashboardStats';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

type SellerStats = NonNullable<ReturnType<typeof useSellerDashboardStats>['data']>;

function SellerHeader() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-sicoob-green-dark">
          Minha Carteira
        </h1>
        <p className="italic text-muted-foreground">
          Gestão comercial e aceleração de vendas SICOOB.
        </p>
      </div>
      <div className="flex gap-2">
        <Button asChild>
          <Link to="/orcamentos/novo" className="gap-2">
            <ShoppingBag className="h-4 w-4" /> Novo Orçamento
          </Link>
        </Button>
      </div>
    </div>
  );
}

function SellerError({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardContent className="flex items-center gap-3 py-4 text-sm text-destructive">
        <AlertCircle className="h-5 w-5" />
        {error instanceof Error ? error.message : 'Indicadores indisponíveis no momento.'}
      </CardContent>
    </Card>
  );
}

function SellerSummary({ stats }: { stats: SellerStats | null | undefined }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
      <Card className="border-[1.5px]">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Clientes na Carteira</CardTitle>
          <Briefcase className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.totalClients}</div>
          <p className="mt-1 text-xs text-muted-foreground">Singulares e PAs ativos</p>
        </CardContent>
      </Card>
      <Card className="border-[1.5px]">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Pedidos em Aberto</CardTitle>
          <ShoppingBag className="h-4 w-4 text-status-transit" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-status-transit">{stats?.activeOrders}</div>
          <p className="mt-1 text-xs font-medium text-muted-foreground text-status-transit/80">
            Em produção ou trânsito
          </p>
        </CardContent>
      </Card>
      <Card className="border-[1.5px] border-primary/20 bg-primary/5 md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-sicoob-green-dark">
            Vendas concluídas no mês
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-2xl font-bold text-sicoob-green-dark">
            {formatCurrency(stats?.monthlySales || 0)}
          </div>
          <p className="text-xs text-muted-foreground">
            Somente pedidos concluídos desta carteira.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function SellerLoading() {
  return (
    <div className="flex justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function TopClients({ stats, isLoading }: { stats: SellerStats | null | undefined; isLoading: boolean }) {
  let content = (
    <div className="py-8 text-center italic text-muted-foreground">
      Nenhum dado de faturamento disponível.
    </div>
  );
  if (isLoading) content = <SellerLoading />;
  else if (stats?.topClients.length) {
    content = (
      <>
        {stats.topClients.map((client, index) => (
          <div key={`${client.name}-${index}`} className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                {index + 1}
              </div>
              <div>
                <div className="font-semibold">{client.name}</div>
                <div className="text-xs text-muted-foreground">
                  Faturamento: {formatCurrency(client.value)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </>
    );
  }
  return (
    <Card className="border-[1.5px] md:col-span-2">
      <CardHeader>
        <CardTitle>Top Clientes (Mês)</CardTitle>
        <CardDescription>Maiores volumes de faturamento por Cooperativa.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">{content}</div>
      </CardContent>
    </Card>
  );
}

function RecentActivity({
  stats,
  isLoading,
}: {
  stats: SellerStats | null | undefined;
  isLoading: boolean;
}) {
  let content = (
    <div className="py-8 text-center italic text-muted-foreground">Nenhuma atividade recente.</div>
  );
  if (isLoading) content = <SellerLoading />;
  else if (stats?.recentActivity.length) {
    content = (
      <>
        {stats.recentActivity.map((item, index) => (
          <div key={`${item.action}-${item.time}-${index}`} className="flex gap-4">
            <div className="relative mt-1">
              <div className="h-2 w-2 rounded-full bg-primary ring-4 ring-primary/20" />
              {index < stats.recentActivity.length - 1 && (
                <div className="absolute left-1/2 top-2 h-10 w-px -translate-x-1/2 bg-border" />
              )}
            </div>
            <div>
              <div className="text-sm font-medium">{item.action}</div>
              <div className="text-xs text-muted-foreground">
                {item.client} • {item.time}
              </div>
            </div>
          </div>
        ))}
      </>
    );
  }
  return (
    <Card className="border-[1.5px]">
      <CardHeader>
        <CardTitle>Atividade Recente</CardTitle>
        <CardDescription>Últimas interações na sua carteira.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">{content}</div>
        <Button variant="outline" className="mt-6 w-full" asChild>
          <Link to="/sicoob/pedidos">Ver Todos os Pedidos</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function SellerDashboardPage() {
  const { data: stats, isLoading, isError, error } = useSellerDashboardStats();

  return (
    <div className="container mx-auto animate-fade-in space-y-8 p-6">
      <SellerHeader />
      <SellerError error={isError ? error : null} />
      <SellerSummary stats={stats} />
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <TopClients stats={stats} isLoading={isLoading} />
        <RecentActivity stats={stats} isLoading={isLoading} />
      </div>
    </div>
  );
}
