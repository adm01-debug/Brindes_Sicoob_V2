import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { useQuotes } from '@/hooks/quotes/useQuotes';

function MetricCard({ title, value, icon }: { title: string; value: ReactNode; icon: ReactNode }) {
  return <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium">{title}</CardTitle>{icon}
  </CardHeader><CardContent><div className="text-2xl font-bold">{value}</div></CardContent></Card>;
}

export function QuoteMetricsDashboard() {
  const { quotes } = useQuotes();
  
  const stats = {
    total: quotes?.length || 0,
    approved: quotes?.filter(q => q.status === 'approved').length || 0,
    pending: quotes?.filter(q => q.status === 'pending').length || 0,
    totalAmount: quotes?.reduce((acc, q) => acc + (Number(q.total) || 0), 0) || 0
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <MetricCard title="Total de Orçamentos" value={stats.total} icon={<FileText className="h-4 w-4 text-muted-foreground" />} />
      <MetricCard title="Aprovados" value={stats.approved} icon={<CheckCircle className="h-4 w-4 text-success" />} />
      <MetricCard title="Pendentes" value={stats.pending} icon={<Clock className="h-4 w-4 text-warning" />} />
      <MetricCard title="Valor Total" value={stats.totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} icon={<TrendingUp className="h-4 w-4 text-primary" />} />
    </div>
  );
}
