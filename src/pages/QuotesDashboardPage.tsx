import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import {
  FileText, CheckCircle, XCircle, Clock, DollarSign, TrendingUp, ArrowLeft,
  Target, Hourglass, Building2, Eye, Link2, Send, Download,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuotesDashboard, statusConfig, formatCurrency, formatResponseTime } from "./quotes-dashboard/useQuotesDashboard";

export function QuotesDashboardPage() {
  const navigate = useNavigate();
  const s = useQuotesDashboard();

  if (s.isLoading) {
    return (
      <MainLayout>
        <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-24 md:pb-6 animate-fade-in">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-80" /><Skeleton className="h-80" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageSEO title="Dashboard de Orçamentos" description="Acompanhe métricas e indicadores dos seus orçamentos." path="/orcamentos/dashboard" noIndex />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" aria-label="Voltar" onClick={() => navigate("/orcamentos")}><ArrowLeft className="h-5 w-5" /></Button>
            <div>
              <h1 data-testid="page-title-orcamentos-dashboard" className="font-display text-2xl font-bold text-foreground">Dashboard de Orçamentos</h1>
              <p className="text-muted-foreground">Métricas e análises de performance</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={s.selectedClientId} onValueChange={s.setSelectedClientId}>
              <SelectTrigger className="w-[200px]"><Building2 className="h-4 w-4 mr-2 text-muted-foreground" /><SelectValue placeholder="Todos os clientes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {(s.clients.length > 0 ? s.clients : s.quotesClients).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {(["month", "quarter", "year"] as const).map(p => (
              <Button key={p} variant={s.selectedPeriod === p ? "default" : "outline"} size="sm" onClick={() => s.setSelectedPeriod(p)}>
                {p === "month" ? "Mês" : p === "quarter" ? "Trimestre" : "Ano"}
              </Button>
            ))}
            <Button variant="outline" size="sm" onClick={s.exportToPdf} className="gap-1.5"><Download className="h-4 w-4" />PDF</Button>
          </div>
        </div>

        {s.selectedClientName && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-2 py-1.5 px-3">
              <Building2 className="h-3.5 w-3.5" />Filtrando por: {s.selectedClientName}
              <button onClick={() => s.setSelectedClientId("all")} className="ml-1 hover:text-destructive">×</button>
            </Badge>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total de Orçamentos" value={s.metrics.totalQuotes.toString()} icon={FileText} variant="info" subtitle={`${s.metrics.pendingQuotes} pendentes`} />
          <StatCard title="Taxa de Aprovação" value={`${s.metrics.approvalRate.toFixed(1)}%`} icon={Target} variant="success" trend={s.metrics.approvalRate >= 50 ? { value: s.metrics.approvalRate } : undefined} />
          <StatCard title="Tempo Médio de Resposta" value={formatResponseTime(s.metrics.averageResponseTime)} icon={Hourglass} variant="warning" subtitle="para aprovação/rejeição" />
          <StatCard title="Valor Total Aprovado" value={formatCurrency(s.metrics.approvedValue)} icon={DollarSign} variant="success" subtitle={`de ${formatCurrency(s.metrics.totalValue)} orçados`} />
          <StatCard title="Rentabilidade Total" value={formatCurrency(s.metrics.totalProfit)} icon={TrendingUp} variant="info" subtitle={`Margem média: ${s.metrics.averageMargin.toFixed(1)}%`} />
        </div>

        {/* Secondary metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50"><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Ticket Médio</p><p className="text-2xl font-bold text-foreground">{formatCurrency(s.metrics.averageValue)}</p></div><div className="p-3 rounded-full bg-primary/10"><TrendingUp className="h-5 w-5 text-primary" /></div></div></CardContent></Card>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50"><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Taxa de Rejeição</p><p className="text-2xl font-bold text-destructive">{s.metrics.rejectionRate.toFixed(1)}%</p></div><div className="p-3 rounded-full bg-destructive/10"><XCircle className="h-5 w-5 text-destructive" /></div></div></CardContent></Card>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50"><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Aguardando Resposta</p><p className="text-2xl font-bold text-warning">{s.metrics.pendingQuotes}</p></div><div className="p-3 rounded-full bg-warning/10"><Clock className="h-5 w-5 text-warning" /></div></div></CardContent></Card>
        </div>

        {/* Approval Links */}
        {s.tokenStats.total > 0 && (
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><Link2 className="h-5 w-5 text-primary" />Links de Aprovação</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { icon: <Send className="h-4 w-4 text-info" />, value: s.tokenStats.total, label: "Enviados", pct: null },
                  { icon: <Eye className="h-4 w-4 text-warning" />, value: s.tokenStats.viewed, label: "Visualizados", pct: s.tokenStats.total > 0 ? ((s.tokenStats.viewed / s.tokenStats.total) * 100).toFixed(0) : "0" },
                  { icon: <CheckCircle className="h-4 w-4 text-success" />, value: s.tokenStats.responded, label: "Respondidos", pct: s.tokenStats.viewed > 0 ? ((s.tokenStats.responded / s.tokenStats.viewed) * 100).toFixed(0) : "0" },
                ].map(t => (
                  <div key={t.label} className="text-center p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center justify-center gap-1.5 mb-1">{t.icon}</div>
                    <p className="text-2xl font-bold text-foreground">{t.value}</p>
                    <p className="text-xs text-muted-foreground">{t.label}</p>
                    {t.pct !== null && <p className="text-xs text-muted-foreground/70">({t.pct}%)</p>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader><CardTitle className="text-lg">Distribuição por Status</CardTitle></CardHeader>
            <CardContent>
              {s.metrics.statusDistribution.length > 0 ? (
                <div className="h-64"><ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={s.metrics.statusDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {s.metrics.statusDistribution.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie><Legend /></PieChart>
                </ResponsiveContainer></div>
              ) : <div className="h-64 flex items-center justify-center text-muted-foreground">Nenhum dado disponível</div>}
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader><CardTitle className="text-lg">Funil de Conversão</CardTitle></CardHeader>
            <CardContent>
              {s.metrics.conversionFunnel.length > 0 ? (
                <div className="h-64"><ResponsiveContainer width="100%" height="100%">
                  <BarChart data={s.metrics.conversionFunnel} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <XAxis type="number" /><YAxis dataKey="stage" type="category" width={100} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>{s.metrics.conversionFunnel.map((e, i) => <Cell key={i} fill={e.fill} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer></div>
              ) : <div className="h-64 flex items-center justify-center text-muted-foreground">Nenhum dado disponível</div>}
            </CardContent>
          </Card>

          {s.metrics.monthlyData.length > 0 && (
            <Card className="bg-card/50 backdrop-blur-sm border-border/50 lg:col-span-2">
              <CardHeader><CardTitle className="text-lg">Evolução Mensal</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64"><ResponsiveContainer width="100%" height="100%">
                  <BarChart data={s.metrics.monthlyData}><XAxis dataKey="month" /><YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="total" name="Total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="approved" name="Aprovados" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="rejected" name="Rejeitados" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                    <Legend />
                  </BarChart>
                </ResponsiveContainer></div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Activity */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader><CardTitle className="text-lg">Últimas Respostas de Clientes</CardTitle></CardHeader>
          <CardContent>
            <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-24 md:pb-6 animate-fade-in">
              {s.quotes
                .filter(q => q.client_response_at)
                .sort((a, b) => new Date(b.client_response_at!).getTime() - new Date(a.client_response_at!).getTime())
                .slice(0, 5)
                .map(quote => (
                  <div key={quote.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors" role="button" tabIndex={0} onClick={() => navigate(`/orcamentos/${quote.id}`)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/orcamentos/${quote.id}`); } }} aria-label={`Ver orçamento ${quote.quote_number}`}>
                    <div className="flex items-center gap-3">
                      {quote.status === "approved" ? <CheckCircle className="h-5 w-5 text-success" /> : <XCircle className="h-5 w-5 text-destructive" />}
                      <div>
                        <p className="font-medium text-foreground">{quote.quote_number}</p>
                        <p className="text-sm text-muted-foreground">{quote.client_response_at && format(new Date(quote.client_response_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={quote.status === "approved" ? "default" : "destructive"}>{statusConfig[quote.status]?.label || quote.status}</Badge>
                      <p className="text-sm text-muted-foreground mt-1">{formatCurrency(quote.total || 0)}</p>
                    </div>
                  </div>
                ))}
              {s.quotes.filter(q => q.client_response_at).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">Nenhuma resposta de cliente registrada ainda</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

export default QuotesDashboardPage;
