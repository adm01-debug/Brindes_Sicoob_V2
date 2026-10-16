import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Package, CheckCircle2, Clock, FileText } from 'lucide-react';
import { useOrdersList } from '@/hooks/orders/useOrders';
import { useAuth } from '@/contexts/AuthContext';
import { useSalesScope } from '@/lib/auth/visibility-scope';
import { ORDER_IN_PROGRESS_STATUSES } from '@/constants/orders';

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

export function OrderStatsBar() {
  const { user } = useAuth();
  const scope = useSalesScope();
  const { data: response } = useOrdersList(user?.id, scope);
  const orders = response?.data || [];

  const stats = {
    total: orders.length,
    drafts: orders.filter(o => o.status === 'rascunho').length,
    pending: orders.filter(o => ORDER_IN_PROGRESS_STATUSES.has(o.status)).length,
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
