import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';
import { useManagerDashboardStats } from '@/hooks/sicoob/useManagerDashboardStats';

export function ManagerApprovalStats({ cooperativeId }: { cooperativeId?: string | null }) {
  const query = useManagerDashboardStats(cooperativeId);

  if (query.isError) {
    return (
      <Alert variant="destructive" role="alert">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Não foi possível carregar os indicadores</AlertTitle>
        <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
          Os dados da cooperativa não foram substituídos por estimativas.
          <Button type="button" size="sm" variant="outline" onClick={() => void query.refetch()}>
            Tentar novamente
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card>
        <CardContent className="space-y-2 p-6 text-center">
          {query.isLoading ? (
            <Skeleton className="mx-auto h-9 w-16" />
          ) : (
            <p className="text-3xl font-bold" data-testid="pending-approvals-count">
              {cooperativeId ? (query.data?.pendingApprovals ?? 0) : '—'}
            </p>
          )}
          <p className="text-xs text-muted-foreground">Aprovações aguardando decisão</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-2 p-6 text-center">
          {query.isLoading ? (
            <Skeleton className="mx-auto h-9 w-16" />
          ) : (
            <p className="text-3xl font-bold" data-testid="cooperative-pa-count">
              {cooperativeId ? (query.data?.totalPAs ?? 0) : '—'}
            </p>
          )}
          <p className="text-xs text-muted-foreground">Pontos de atendimento vinculados</p>
        </CardContent>
      </Card>
    </div>
  );
}

function BudgetProgress({
  stats,
}: {
  stats: NonNullable<ReturnType<typeof useManagerDashboardStats>['data']>;
}) {
  const progress = stats.monthlyBudget
    ? Math.min((stats.totalSpentMonth / stats.monthlyBudget) * 100, 100)
    : 0;

  return (
    <>
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">Verba mensal cadastrada</span>
        <span className="font-bold">{formatCurrency(stats.monthlyBudget)}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">Verba consumida</span>
        <span className="font-bold text-success">{formatCurrency(stats.totalSpentMonth)}</span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label="Consumo da verba mensal"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full bg-success" style={{ width: `${progress}%` }} />
      </div>
    </>
  );
}

function CooperativeBudgetContent({ cooperativeId }: { cooperativeId?: string | null }) {
  const query = useManagerDashboardStats(cooperativeId);
  const stats = query.data;

  if (query.isError)
    return (
      <p className="text-xs text-muted-foreground">Indicadores indisponíveis; tente novamente.</p>
    );
  if (!cooperativeId)
    return <p className="text-xs text-muted-foreground">Cooperativa não vinculada ao perfil.</p>;
  if (query.isLoading) {
    return (
      <div className="space-y-3" aria-label="Carregando verba da cooperativa">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    );
  }
  if (!stats?.hasConfiguredBudget) {
    return (
      <p className="text-xs text-muted-foreground">
        Nenhuma verba mensal foi cadastrada para esta cooperativa.
      </p>
    );
  }

  return <BudgetProgress stats={stats} />;
}

export function CooperativeBudgetSummary({ cooperativeId }: { cooperativeId?: string | null }) {
  const content: ReactNode = <CooperativeBudgetContent cooperativeId={cooperativeId} />;

  return (
    <div className="space-y-4 rounded-2xl border border-border/50 bg-card p-6">
      <h3 className="text-sm font-bold">Resumo da Cooperativa</h3>
      <div className="space-y-3">{content}</div>
    </div>
  );
}
