/**
 * TrendsCharts — Chart and list sections extracted from TrendsPage
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Eye, Search, Package, BarChart3, FileText, ExternalLink, TrendingUp, Sparkles } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Area, AreaChart,
} from "recharts";
import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
};

interface DailyTrend {
  dateLabel: string;
  views: number;
  searches: number;
}

interface TrendProduct {
  id: string;
  name: string;
  sku?: string;
  views: number;
  compares: number;
  trendingScore?: number;
  classification?: "rising" | "stable" | "falling" | "new";
}

interface TrendSearch {
  term: string;
  count: number;
  avgResults: number;
}

interface ActivityChartProps {
  dailyTrends: DailyTrend[] | undefined;
  isLoading: boolean;
}

export function ActivityChart({ dailyTrends, isLoading }: ActivityChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />Atividade ao Longo do Tempo
        </CardTitle>
        <CardDescription>Visualizações e buscas por dia</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : dailyTrends && dailyTrends.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailyTrends}>
              <defs>
                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorSearches" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="dateLabel" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="views" name="Visualizações" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorViews)" />
              <Area type="monotone" dataKey="searches" name="Buscas" stroke="hsl(var(--chart-2))" fillOpacity={1} fill="url(#colorSearches)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum dado disponível</p>
              <p className="text-sm">As tendências aparecerão conforme você navegar pelo catálogo</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ProductsTabProps {
  topProducts: TrendProduct[] | undefined;
  isLoading: boolean;
  isError?: boolean;
  isFetching?: boolean;
  onRetry?: () => void;
}

function TrendsDataError({ message, hasData, isFetching, onRetry }: { message: string; hasData: boolean; isFetching: boolean; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
        <p>{hasData ? `${message} Os dados anteriores continuam exibidos.` : message}</p>
      </div>
      {onRetry ? <Button variant="outline" size="sm" onClick={onRetry} disabled={isFetching}>{isFetching ? "Tentando…" : "Tentar novamente"}</Button> : null}
    </div>
  );
}

function TrendsDataState({ isError, hasData, message, isFetching, onRetry, children }: { isError: boolean; hasData: boolean; message: string; isFetching: boolean; onRetry?: () => void; children: ReactNode }) {
  if (isError && !hasData) {
    return <TrendsDataError message={message} hasData={false} isFetching={isFetching} onRetry={onRetry} />;
  }
  return (
    <div className="space-y-4">
      {isError ? <TrendsDataError message={`Não foi possível atualizar ${message.toLowerCase().replace('não foi possível carregar ', '')}`} hasData isFetching={isFetching} onRetry={onRetry} /> : null}
      {children}
    </div>
  );
}

export function ProductsTabContent({ topProducts, isLoading, isError = false, isFetching = false, onRetry }: ProductsTabProps) {
  const navigate = useNavigate();
  return (
    <TrendsDataState isError={isError} hasData={topProducts !== undefined} message="Não foi possível carregar o ranking de produtos." isFetching={isFetching} onRetry={onRetry}>
      <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Produtos</CardTitle>
          <CardDescription>Produtos com mais visualizações</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : topProducts && topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts.slice(0, 5)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" className="text-xs" />
                <YAxis type="category" dataKey="name" className="text-xs" width={120} tickFormatter={(v) => v.length > 15 ? `${v.substring(0, 15)}...` : v} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="views" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum produto visualizado ainda</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalhamento</CardTitle>
          <CardDescription>Breakdown por tipo de interação</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : topProducts && topProducts.length > 0 ? (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {topProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
                    {index < 3 ? ['🥇','🥈','🥉'][index] : index + 1}
                  </div>
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onClick={() => product.id && navigate(`/produto/${product.id}`)}
                    onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && product.id) { e.preventDefault(); navigate(`/produto/${product.id}`); } }}
                    aria-label={`Ver produto ${product.name}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-foreground truncate">{product.name}</p>
                      {product.trendingScore !== undefined && product.trendingScore > 1.3 && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1 bg-success/10 text-success border-success/30 shrink-0">
                          <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                          {Math.round((product.trendingScore - 1) * 100)}%
                        </Badge>
                      )}
                      {product.classification === 'new' && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1 bg-primary/10 text-primary border-primary/30 shrink-0">
                          <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                          NOVO
                        </Badge>
                      )}
                    </div>
                    {product.sku && <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>}
                  </div>
                  <div className="flex gap-1.5 flex-wrap justify-end shrink-0">
                    <Badge variant="secondary" className="text-xs"><Eye className="h-3 w-3 mr-1" />{product.views}</Badge>
                    {product.compares > 0 && <Badge variant="outline" className="text-xs">Comp: {product.compares}</Badge>}
                  </div>
                  <div className="flex gap-1 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); if (product.id) navigate(`/orcamentos/novo?produto=${product.id}`); }}
                      title="Criar orçamento"
                      aria-label="Criar orçamento com este produto"
                    >
                      <FileText className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); if (product.id) navigate(`/produto/${product.id}`); }}
                      title="Ver detalhes"
                      aria-label="Ver detalhes do produto"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground"><p>Nenhum dado disponível</p></div>
          )}
        </CardContent>
      </Card>
      </div>
    </TrendsDataState>
  );
}

interface SearchesTabProps {
  topSearches: TrendSearch[] | undefined;
  isLoading: boolean;
  isError?: boolean;
  isFetching?: boolean;
  onRetry?: () => void;
}

export function SearchesTabContent({ topSearches, isLoading, isError = false, isFetching = false, onRetry }: SearchesTabProps) {
  return (
    <TrendsDataState isError={isError} hasData={topSearches !== undefined} message="Não foi possível carregar o ranking de buscas." isFetching={isFetching} onRetry={onRetry}>
      <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Buscas</CardTitle>
          <CardDescription>Termos mais pesquisados</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : topSearches && topSearches.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topSearches.slice(0, 5)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" className="text-xs" />
                <YAxis type="category" dataKey="term" className="text-xs" width={100} tickFormatter={(v) => v.length > 12 ? `${v.substring(0, 12)}...` : v} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" name="Buscas" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma busca registrada ainda</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalhamento de Buscas</CardTitle>
          <CardDescription>Quantidade de buscas e resultados médios</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : topSearches && topSearches.length > 0 ? (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {topSearches.map((search, index) => (
                <div key={search.term} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-chart-2/10 text-chart-2 font-bold text-sm">{index + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">"{search.term}"</p>
                    <p className="text-xs text-muted-foreground">Média de {search.avgResults} resultados</p>
                  </div>
                  <Badge variant="secondary">{search.count}x</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground"><p>Nenhum dado disponível</p></div>
          )}
        </CardContent>
      </Card>
      </div>
    </TrendsDataState>
  );
}
