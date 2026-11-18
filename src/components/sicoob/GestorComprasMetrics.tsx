/**
 * Indicadores reais dentro da tela de compras.
 *
 * A tela só tinha dois atalhos: para ver qualquer número, o gestor precisava
 * sair para `/gestor`. Antes disso ela mostrava valores fictícios fixos
 * ("85%", "R$ 450.000,00"), removidos por serem falsos — e nada entrou no
 * lugar. Recupera o componente da PR #157, fechada sem merge, com os quatro
 * estados: carregando, erro, sem verba cadastrada e perfil sem cooperativa.
 */
import { AlertCircle, Building2, ClipboardList, Wallet } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useManagerDashboardStats } from '@/hooks/sicoob/useManagerDashboardStats';
import { formatCurrency } from '@/lib/format';

function Indicador({ icon: Icon, rotulo, valor }: {
  icon: typeof Wallet;
  rotulo: string;
  valor: string;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {rotulo}
      </p>
      <p className="mt-1 text-xl font-bold text-foreground">{valor}</p>
    </div>
  );
}

function ConsumoDaVerba({ consumida, total }: { consumida: number; total: number }) {
  const percentual = total > 0 ? Math.min(100, Math.round((consumida / total) * 100)) : 0;
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 sm:col-span-2">
      <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
        Verba da competência
      </p>
      <p className="mt-1 text-xl font-bold text-foreground">
        {formatCurrency(consumida)}{' '}
        <span className="text-sm font-normal text-muted-foreground">
          de {formatCurrency(total)}
        </span>
      </p>
      <div
        role="progressbar"
        aria-valuenow={percentual}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Consumo da verba da competência"
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${percentual}%` }} />
      </div>
    </div>
  );
}

export function GestorComprasMetrics({ cooperativeId }: { cooperativeId: string | null }) {
  const { data: stats, isLoading, isError, refetch } = useManagerDashboardStats(cooperativeId);

  if (!cooperativeId) {
    return (
      <p className="rounded-xl border border-dashed border-border/60 p-4 text-xs text-muted-foreground">
        Cooperativa não vinculada ao perfil.
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-28 rounded-xl sm:col-span-2" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive" role="alert">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Não foi possível carregar os indicadores</AlertTitle>
        <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
          <span>Os valores não foram substituídos por estimativas.</span>
          <Button size="sm" variant="outline" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Indicador
        icon={ClipboardList}
        rotulo="Aguardando decisão"
        valor={String(stats?.pendingApprovals ?? 0)}
      />
      <Indicador icon={Building2} rotulo="PAs vinculados" valor={String(stats?.totalPAs ?? 0)} />
      {stats?.hasConfiguredBudget ? (
        <ConsumoDaVerba consumida={stats.totalSpentMonth} total={stats.monthlyBudget} />
      ) : (
        <p className="rounded-xl border border-dashed border-border/60 p-4 text-xs text-muted-foreground sm:col-span-2">
          Nenhuma verba mensal foi cadastrada para esta cooperativa.
        </p>
      )}
    </div>
  );
}
