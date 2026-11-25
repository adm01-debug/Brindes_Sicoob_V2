import React, { useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, CheckCircle2, Clock, FileText, RefreshCw } from 'lucide-react';
import { useOrdersList } from '@/hooks/orders/useOrders';
import { useAuth } from '@/contexts/AuthContext';
import { useSalesScope } from '@/lib/auth/visibility-scope';

function StatCard(props: {
  label: string;
  value: number;
  icon: typeof Package;
  color: string;
}) {
  const { label, value, color } = props;
  const Icon = props.icon;
  return <Card className="overflow-hidden border-none shadow-sm bg-card/50 backdrop-blur-sm">
    <CardContent className="p-5 flex items-center gap-4">
      <div className={`h-12 w-12 rounded-xl ${color} flex items-center justify-center shrink-0`}><Icon className="h-6 w-6" /></div>
      <div className="space-y-0.5"><p className="text-sm text-muted-foreground font-medium">{label}</p>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
      </div>
    </CardContent>
  </Card>;
}

/** Retentativa em curso: nem alerta repetido, nem contadores zerados. */
function StatsReloading() {
  return <Card className="border-muted bg-muted/30">
    <CardContent className="flex items-center gap-3 p-5" role="status">
      <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">Recarregando estatísticas de pedidos…</p>
    </CardContent>
  </Card>;
}

/** Consulta falhou: nenhum número sai daqui, para não parecer fila vazia. */
function StatsUnavailable({ onRetry }: { onRetry?: () => void }) {
  return <Card className="border-destructive/40 bg-destructive/5">
    <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5" role="alert">
      <div>
        <p className="text-sm font-medium text-destructive">Estatísticas de pedidos indisponíveis</p>
        <p className="text-xs text-muted-foreground">A consulta falhou. Nenhum número foi estimado.</p>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          aria-label="Tentar novamente as estatísticas"
          onClick={onRetry}
        >
          Tentar novamente
        </Button>
      )}
    </CardContent>
  </Card>;
}

export function OrderStatsBar() {
  const { user } = useAuth();
  const scope = useSalesScope();
  // Só a lista se refaz no botão da página; a retentativa aqui evita que as
  // estatísticas continuem em erro depois que a lista já voltou.
  const { data: response, isError, refetch } = useOrdersList(user?.id, scope);
  const orders = response?.data || [];

  // Retentar tira a consulta do estado de erro e `data` continua indefinido:
  // sem esta trava a barra mostraria todos os contadores zerados.
  const falhou = useRef(false);
  if (isError) falhou.current = true;
  else if (response) falhou.current = false;

  if (falhou.current && !isError) return <StatsReloading />;

  if (isError)
    return (
      <StatsUnavailable
        onRetry={() => {
          void refetch();
        }}
      />
    );

  const stats = {
    total: orders.length,
    drafts: orders.filter(o => o.status === 'rascunho').length,
    pending: orders.filter(o => ['enviado_gestor', 'aprovado_gestor'].includes(o.status)).length,
    completed: orders.filter(o => o.status === 'concluido').length,
  };

  const statCards = [
    {
      label: 'Total de Pedidos',
      value: stats.total,
      icon: Package,
      color: 'bg-blue-500/10 text-blue-600',
    },
    {
      label: 'Rascunhos',
      value: stats.drafts,
      icon: FileText,
      color: 'bg-slate-500/10 text-slate-600',
    },
    {
      label: 'Em Andamento',
      value: stats.pending,
      icon: Clock,
      color: 'bg-amber-500/10 text-amber-600',
    },
    {
      label: 'Concluídos',
      value: stats.completed,
      icon: CheckCircle2,
      color: 'bg-emerald-500/10 text-emerald-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat) => <StatCard key={stat.label} {...stat} />)}
    </div>
  );
}
