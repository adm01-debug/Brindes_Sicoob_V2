import { useNavigate } from 'react-router-dom';
// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from '@/components/seo/PageSEO';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/StatCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  TrendingUp,
  ArrowLeft,
  Target,
  Hourglass,
  Building2,
  Eye,
  Link2,
  Send,
  Download,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  useQuotesDashboard,
  statusConfig,
  formatCurrency,
  formatResponseTime,
} from './quotes-dashboard/useQuotesDashboard';

type DashboardState = ReturnType<typeof useQuotesDashboard>;

function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-[1920px] animate-fade-in space-y-3 px-3 py-3 pb-24 sm:space-y-4 sm:px-4 sm:py-4 md:pb-6 lg:px-6 xl:px-8">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, index) => (
          <Skeleton key={index} className="h-32" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}

function DashboardHeader({ state, onBack }: { state: DashboardState; onBack: () => void }) {
  const clients = state.clients.length > 0 ? state.clients : state.quotesClients;
  const periodLabels = { month: 'Mês', quarter: 'Trimestre', year: 'Ano' } as const;
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" aria-label="Voltar" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1
            data-testid="page-title-orcamentos-dashboard"
            className="font-display text-2xl font-bold text-foreground"
          >
            Dashboard de Orçamentos
          </h1>
          <p className="text-muted-foreground">Métricas e análises de performance</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={state.selectedClientId} onValueChange={state.setSelectedClientId}>
          <SelectTrigger className="w-[200px]">
            <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Todos os clientes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(['month', 'quarter', 'year'] as const).map((period) => (
          <Button
            key={period}
            variant={state.selectedPeriod === period ? 'default' : 'outline'}
            size="sm"
            onClick={() => state.setSelectedPeriod(period)}
          >
            {periodLabels[period]}
          </Button>
        ))}
        <Button variant="outline" size="sm" onClick={state.exportToPdf} className="gap-1.5">
          <Download className="h-4 w-4" />
          PDF
        </Button>
      </div>
    </div>
  );
}

function ApprovalLinks({ state }: { state: DashboardState }) {
  if (state.tokenStats.total === 0) return null;
  const links = [
    {
      icon: <Send className="h-4 w-4 text-info" />,
      value: state.tokenStats.total,
      label: 'Enviados',
      pct: null,
    },
    {
      icon: <Eye className="h-4 w-4 text-warning" />,
      value: state.tokenStats.viewed,
      label: 'Visualizados',
      pct: ((state.tokenStats.viewed / state.tokenStats.total) * 100).toFixed(0),
    },
    {
      icon: <CheckCircle className="h-4 w-4 text-success" />,
      value: state.tokenStats.responded,
      label: 'Respondidos',
      pct:
        state.tokenStats.viewed > 0
          ? ((state.tokenStats.responded / state.tokenStats.viewed) * 100).toFixed(0)
          : '0',
    },
  ];
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Link2 className="h-5 w-5 text-primary" />
          Links de Aprovação
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {links.map((link) => (
            <div key={link.label} className="rounded-lg bg-muted/30 p-3 text-center">
              <div className="mb-1 flex items-center justify-center gap-1.5">{link.icon}</div>
              <p className="text-2xl font-bold text-foreground">{link.value}</p>
              <p className="text-xs text-muted-foreground">{link.label}</p>
              {link.pct !== null && (
                <p className="text-xs text-muted-foreground/70">({link.pct}%)</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardCharts({ state }: { state: DashboardState }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">Distribuição por Status</CardTitle>
        </CardHeader>
        <CardContent>
          {state.metrics.statusDistribution.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={state.metrics.statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {state.metrics.statusDistribution.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              Nenhum dado disponível
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">Funil de Conversão</CardTitle>
        </CardHeader>
        <CardContent>
          {state.metrics.conversionFunnel.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={state.metrics.conversionFunnel}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <XAxis type="number" />
                  <YAxis dataKey="stage" type="category" width={100} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {state.metrics.conversionFunnel.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              Nenhum dado disponível
            </div>
          )}
        </CardContent>
      </Card>
      {state.metrics.monthlyData.length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Evolução Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={state.metrics.monthlyData}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="total"
                    name="Total"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="approved"
                    name="Aprovados"
                    fill="hsl(var(--success))"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="profit"
                    name="Lucro Bruto"
                    fill="hsl(var(--info))"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="rejected"
                    name="Rejeitados"
                    fill="hsl(var(--destructive))"
                    radius={[4, 4, 0, 0]}
                  />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RecentResponses({
  state,
  openQuote,
}: {
  state: DashboardState;
  openQuote: (id: string) => void;
}) {
  const quotes = state.quotes
    .filter((quote) => quote.client_response_at)
    .sort(
      (first, second) =>
        new Date(second.client_response_at ?? 0).getTime() -
        new Date(first.client_response_at ?? 0).getTime(),
    )
    .slice(0, 5);
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg">Últimas Respostas de Clientes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mx-auto w-full max-w-[1920px] animate-fade-in space-y-3 px-3 py-3 pb-24 sm:space-y-4 sm:px-4 sm:py-4 md:pb-6 lg:px-6 xl:px-8">
          {quotes.map((quote) => (
            <div
              key={quote.id}
              className="flex cursor-pointer items-center justify-between rounded-lg bg-muted/30 p-3 transition-colors hover:bg-muted/50"
              role="button"
              tabIndex={0}
              onClick={() => {
                if (quote.id) openQuote(quote.id);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  if (quote.id) openQuote(quote.id);
                }
              }}
              aria-label={`Ver orçamento ${quote.quote_number}`}
            >
              <div className="flex items-center gap-3">
                {quote.status === 'approved' ? (
                  <CheckCircle className="h-5 w-5 text-success" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                <div>
                  <p className="font-medium text-foreground">{quote.quote_number}</p>
                  <p className="text-sm text-muted-foreground">
                    {quote.client_response_at &&
                      format(new Date(quote.client_response_at), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge variant={quote.status === 'approved' ? 'default' : 'destructive'}>
                  {statusConfig[quote.status]?.label || quote.status}
                </Badge>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatCurrency(quote.total || 0)}
                </p>
              </div>
            </div>
          ))}
          {quotes.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              Nenhuma resposta de cliente registrada ainda
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function QuotesDashboardPage() {
  const navigate = useNavigate();
  const s = useQuotesDashboard();

  if (s.isLoading) {
    return <DashboardLoading />;
  }

  return (
    <>
      <PageSEO
        title="Dashboard de Orçamentos"
        description="Acompanhe métricas e indicadores dos seus orçamentos."
        path="/orcamentos/dashboard"
        noIndex
      />
      <div className="space-y-6">
        <DashboardHeader state={s} onBack={() => navigate('/orcamentos')} />

        {s.selectedClientName && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-2 px-3 py-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Filtrando por: {s.selectedClientName}
              <button
                onClick={() => s.setSelectedClientId('all')}
                className="ml-1 hover:text-destructive"
              >
                ×
              </button>
            </Badge>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total de Orçamentos"
            value={s.metrics.totalQuotes.toString()}
            icon={FileText}
            variant="info"
            subtitle={`${s.metrics.pendingQuotes} pendentes`}
          />
          <StatCard
            title="Taxa de Aprovação"
            value={`${s.metrics.approvalRate.toFixed(1)}%`}
            icon={Target}
            variant="success"
            trend={s.metrics.approvalRate >= 50 ? { value: s.metrics.approvalRate } : undefined}
          />
          <StatCard
            title="Tempo Médio de Resposta"
            value={formatResponseTime(s.metrics.averageResponseTime)}
            icon={Hourglass}
            variant="warning"
            subtitle="para aprovação/rejeição"
          />
          <StatCard
            title="Valor Total Aprovado"
            value={formatCurrency(s.metrics.approvedValue)}
            icon={DollarSign}
            variant="success"
            subtitle={`de ${formatCurrency(s.metrics.totalValue)} orçados`}
          />
          <StatCard
            title="Rentabilidade Total"
            value={formatCurrency(s.metrics.totalProfit)}
            icon={TrendingUp}
            variant="info"
            subtitle={`Margem média: ${s.metrics.averageMargin.toFixed(1)}%`}
          />
        </div>

        {/* Secondary metrics */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ticket Médio</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(s.metrics.averageValue)}
                  </p>
                </div>
                <div className="rounded-full bg-primary/10 p-3">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Taxa de Rejeição</p>
                  <p className="text-2xl font-bold text-destructive">
                    {s.metrics.rejectionRate.toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-full bg-destructive/10 p-3">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Aguardando Resposta</p>
                  <p className="text-2xl font-bold text-warning">{s.metrics.pendingQuotes}</p>
                </div>
                <div className="rounded-full bg-warning/10 p-3">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <ApprovalLinks state={s} />

        <DashboardCharts state={s} />

        <RecentResponses state={s} openQuote={(id) => navigate(`/orcamentos/${id}`)} />
      </div>
    </>
  );
}

export default QuotesDashboardPage;
