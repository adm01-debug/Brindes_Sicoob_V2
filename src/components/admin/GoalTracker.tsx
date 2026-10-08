import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp } from 'lucide-react';

async function fetchGoalStats() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: orders } = await supabase
    // rls-allow: indicador administrativo; RLS aplica papel e organização
    .from('orders')
    .select('total')
    .gte('created_at', startOfMonth.toISOString());
  const { data: setting } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', 'monthly_sales_goal')
    .maybeSingle();
  const currentSales = orders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
  const configuredGoal =
    setting?.value && typeof setting.value === 'object' && !Array.isArray(setting.value)
      ? setting.value.amount
      : undefined;
  const goal =
    typeof configuredGoal === 'number' && Number.isFinite(configuredGoal) && configuredGoal > 0
      ? configuredGoal
      : 100_000;
  return { currentSales, goal };
}

export function GoalTracker() {
  const { data: stats } = useQuery({
    queryKey: ['admin_goal_tracker'],
    queryFn: fetchGoalStats,
  });

  if (!stats) return null;

  const percentage = Math.min(100, (stats.currentSales / stats.goal) * 100);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Target className="h-3 w-3" /> Meta Mensal de Vendas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="mb-1 flex items-end justify-between">
            <span className="font-display text-2xl font-bold">
              R$ {stats.currentSales.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            </span>
            <span className="text-[10px] text-muted-foreground">
              Meta: R$ {stats.goal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            </span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>

        <div className="flex items-center gap-2 text-[10px] font-bold text-sicoob-green">
          <TrendingUp className="h-3 w-3" />
          {percentage.toFixed(1)}% atingido
          <span className="ml-1 font-normal text-muted-foreground">
            Faltam R${' '}
            {(stats.goal - stats.currentSales).toLocaleString('pt-BR', {
              maximumFractionDigits: 0,
            })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
