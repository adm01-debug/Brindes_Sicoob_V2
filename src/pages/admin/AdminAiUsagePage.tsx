/**
 * Admin AI Usage Dashboard — Refactored orchestrator
 * Sub-components extracted to ./ai-usage/
 */
import { useState } from 'react';
// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from '@/components/seo/PageSEO';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Zap, Activity, DollarSign, Users } from 'lucide-react';
import { useAiUsageStats, useAiUsageLogs } from '@/hooks/useAiUsage';
import { AiSummaryCard } from './ai-usage/AiSummaryCard';
import { AiCharts } from './ai-usage/AiCharts';
import { AiTables } from './ai-usage/AiTables';
import { AiQuotaManager } from './ai-usage/AiQuotaManager';
import { MarketIntelInsightsUsagePanel } from './ai-usage/MarketIntelInsightsUsagePanel';

const formatCurrency = (val: number) => `$${val.toFixed(4)}`;
const formatNumber = (val: number) => val.toLocaleString('pt-BR');

type AiUsageStats = NonNullable<ReturnType<typeof useAiUsageStats>['data']>;
type UsagePeriod = 'day' | 'week' | 'month';

function summaryValues(stats: AiUsageStats | undefined) {
  if (!stats) {
    return { requests: '--', requestSummary: '', tokens: '--', cost: '--', users: '--' };
  }
  return {
    requests: formatNumber(stats.totalRequests),
    requestSummary: `${stats.successCount} ok / ${stats.errorCount} erros`,
    tokens: formatNumber(stats.totalTokens),
    cost: formatCurrency(stats.totalCost),
    users: formatNumber(stats.byUser.length),
  };
}

function AiSummaryGrid({ stats, loading }: { stats: AiUsageStats | undefined; loading: boolean }) {
  const values = summaryValues(stats);
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <AiSummaryCard
        icon={<Zap className="h-4 w-4" />}
        label="Requisições"
        value={values.requests}
        sub={values.requestSummary}
        loading={loading}
        color="text-primary"
      />
      <AiSummaryCard
        icon={<Activity className="h-4 w-4" />}
        label="Tokens Totais"
        value={values.tokens}
        sub="input + output"
        loading={loading}
        color="text-primary"
      />
      <AiSummaryCard
        icon={<DollarSign className="h-4 w-4" />}
        label="Custo Estimado"
        value={values.cost}
        sub="USD no período"
        loading={loading}
        color="text-primary"
      />
      <AiSummaryCard
        icon={<Users className="h-4 w-4" />}
        label="Usuários Ativos"
        value={values.users}
        sub="com chamadas de IA"
        loading={loading}
        color="text-primary"
      />
    </div>
  );
}

function AiUsageHeader({
  period,
  onPeriodChange,
}: {
  period: UsagePeriod;
  onPeriodChange: (period: UsagePeriod) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <Brain className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Consumo de IA</h1>
          <p className="text-sm text-muted-foreground">Monitoramento de uso e quotas por usuário</p>
        </div>
      </div>
      <Tabs value={period} onValueChange={(value) => onPeriodChange(value as UsagePeriod)}>
        <TabsList>
          <TabsTrigger value="day">Hoje</TabsTrigger>
          <TabsTrigger value="week">7 dias</TabsTrigger>
          <TabsTrigger value="month">Mês</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}

export default function AdminAiUsagePage() {
  const [period, setPeriod] = useState<UsagePeriod>('month');
  const { data: stats, isLoading: statsLoading } = useAiUsageStats(period);
  const { data: logs, isLoading: logsLoading } = useAiUsageLogs({ period, limit: 200 });

  return (
    <>
      <PageSEO
        title="Consumo de IA"
        description="Dashboard de consumo de IA por usuário"
        path="/admin/consumo-ia"
      />
      <div className="mx-auto w-full max-w-[1920px] animate-fade-in space-y-3 px-3 py-3 pb-24 sm:space-y-4 sm:px-4 sm:py-4 md:pb-6 lg:px-6 xl:px-8">
        <AiUsageHeader period={period} onPeriodChange={setPeriod} />

        <AiSummaryGrid stats={stats} loading={statsLoading} />

        <AiCharts
          byDay={stats?.byDay || []}
          byFunction={stats?.byFunction || []}
          isLoading={statsLoading}
        />
        <AiTables
          byUser={stats?.byUser || []}
          byModel={stats?.byModel || []}
          logs={logs || []}
          statsLoading={statsLoading}
          logsLoading={logsLoading}
        />
        <MarketIntelInsightsUsagePanel />
        <AiQuotaManager />
      </div>
    </>
  );
}
