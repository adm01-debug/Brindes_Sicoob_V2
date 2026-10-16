import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Bell, ClipboardCheck, LayoutGrid, Layers, Package, RefreshCw } from "lucide-react";
import { OrderConsolidationPanel } from "@/components/orders/OrderConsolidationPanel";
import { SmartAlertsPanel } from "@/components/orders/SmartAlertsPanel";
import SicoobOrdersKanbanPage from "./sicoob/orders/OrdersKanbanPage";
import SicoobOrdersPage from "./sicoob/orders/OrdersPage";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatCurrency } from "@/utils/quote-calculations";
import { mapLatestManagerSubmissionTimes } from "@/lib/orders/purchasing-sla";
import type { OrderStatus } from "@/types/sicoob/orders";

const APPROVED_STATUSES = new Set<OrderStatus>([
  "confirmed",
  "logistic",
  "in_production",
  "in_separation",
  "in_transit",
  "delivered",
  "completed",
]);

interface PurchasingOrder {
  id: string;
  status: OrderStatus;
  total_amount: number | null;
  created_at: string;
}

type OrderListResult = { data: PurchasingOrder[]; count: number | null } | undefined;

export interface PurchasingMetrics {
  pendingCount: number | null;
  slaPercent: number | null;
  monthlyTotal: number | null;
  approvedTotal: number | null;
}

function resultCount(result: OrderListResult): number | null {
  if (!result) return null;
  return result.count;
}

function hasCompleteResult(result: OrderListResult, count: number | null): result is NonNullable<OrderListResult> {
  return Boolean(result && count !== null && count === result.data.length);
}

function calculatePendingSla(
  result: OrderListResult,
  count: number | null,
  sentAtByOrderId: ReadonlyMap<string, string> | undefined,
  now: Date,
): number | null {
  if (!hasCompleteResult(result, count) || result.data.length === 0) return null;
  if (!sentAtByOrderId) return null;
  const yesterday = now.getTime() - 24 * 60 * 60 * 1000;
  const sentAtTimestamps = result.data.map((order) => sentAtByOrderId.get(order.id));
  if (sentAtTimestamps.some((timestamp) => !timestamp || !Number.isFinite(Date.parse(timestamp)))) return null;
  const withinSla = sentAtTimestamps
    .filter((timestamp): timestamp is string => Boolean(timestamp))
    .filter((timestamp) => Date.parse(timestamp) >= yesterday).length;
  return (withinSla / result.data.length) * 100;
}

function sumCompleteOrders(
  result: OrderListResult,
  count: number | null,
  predicate: (order: PurchasingOrder) => boolean,
): number | null {
  if (!hasCompleteResult(result, count)) return null;
  return result.data
    .filter(predicate)
    .reduce((total, order) => total + (Number(order.total_amount) || 0), 0);
}

export function calculatePurchasingMetrics(
  pendingResult: OrderListResult,
  monthlyResult: OrderListResult,
  now = new Date(),
  sentAtByOrderId?: ReadonlyMap<string, string>,
): PurchasingMetrics {
  const pendingCount = resultCount(pendingResult);
  const monthlyCount = resultCount(monthlyResult);

  return {
    pendingCount,
    slaPercent: calculatePendingSla(pendingResult, pendingCount, sentAtByOrderId, now),
    monthlyTotal: sumCompleteOrders(monthlyResult, monthlyCount, (order) => order.status !== "cancelled"),
    approvedTotal: sumCompleteOrders(monthlyResult, monthlyCount, (order) => APPROVED_STATUSES.has(order.status)),
  };
}

function metricLabel(value: number | null, formatter: (value: number) => string): string {
  return value === null ? "—" : formatter(value);
}

async function loadSicoobOrders(query: "pending" | "monthly", monthStart: string): Promise<OrderListResult> {
  let request = supabase
    .from("sicoob_orders")
    .select("id, status, total_amount, created_at", { count: "exact" });
  request = query === "pending"
    ? request.eq("status", "waiting_approval")
    : request.gte("created_at", monthStart);
  const { data, error, count } = await request
    .order("created_at", { ascending: false })
    .range(0, 999);
  if (error) throw error;
  return { data: (data ?? []) as PurchasingOrder[], count };
}

async function loadManagerApprovalHistory(orderIds: string[]) {
  const { data, error, count } = await supabase
    .from("sicoob_order_history")
    .select("order_id, new_status, created_at", { count: "exact" })
    .in("order_id", orderIds)
    .eq("new_status", "waiting_approval")
    .order("created_at", { ascending: false })
    .limit(10_000);

  if (error) throw error;
  if (count === null || count !== (data ?? []).length) return null;
  return mapLatestManagerSubmissionTimes(data ?? []);
}

function usePurchasingDashboardMetrics(userId?: string) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthStartIso = monthStart.toISOString();
  const pendingQuery = useQuery({
    queryKey: ["gestor-compras", "pedidos-pendentes", userId],
    enabled: Boolean(userId),
    queryFn: () => loadSicoobOrders("pending", monthStartIso),
  });
  const monthlyQuery = useQuery({
    queryKey: ["gestor-compras", "pedidos-mes", userId, monthStartIso.slice(0, 10)],
    enabled: Boolean(userId),
    queryFn: () => loadSicoobOrders("monthly", monthStartIso),
  });
  const pendingResult = pendingQuery.data;
  const pendingOrderIds = pendingResult?.data.map((order) => order.id) ?? [];
  const pendingSlaEventsQuery = useQuery({
    queryKey: ["purchasing-manager-sla-events", pendingOrderIds],
    enabled: pendingOrderIds.length > 0 && hasCompleteResult(pendingResult, pendingResult?.count ?? null),
    queryFn: () => loadManagerApprovalHistory(pendingOrderIds),
  });
  const metrics = calculatePurchasingMetrics(
    pendingResult,
    monthlyQuery.data,
    new Date(),
    pendingSlaEventsQuery.data ?? undefined,
  );

  return { metrics, pendingQuery, monthlyQuery, slaEventsQuery: pendingSlaEventsQuery };
}

type MetricsQueryState = {
  isError: boolean;
  error: unknown;
  isFetching: boolean;
  refetch: () => Promise<unknown>;
};

function MetricsQueryError({
  pendingQuery,
  monthlyQuery,
  historyQuery,
}: {
  pendingQuery: MetricsQueryState;
  monthlyQuery: MetricsQueryState;
  historyQuery: MetricsQueryState;
}) {
  const failedQueries = [
    { label: "fila de pendências", query: pendingQuery },
    { label: "resumo mensal", query: monthlyQuery },
    { label: "histórico de aprovação", query: historyQuery },
  ].filter(({ query }) => query.isError || Boolean(query.error));

  if (failedQueries.length === 0) return null;

  const isRetrying = failedQueries.some(({ query }) => query.isFetching);
  const failedLabels = failedQueries.map(({ label }) => label).join(", ");

  return (
    <Alert variant="destructive" role="alert" data-testid="purchasing-metrics-error">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Não foi possível atualizar os indicadores de compras</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span>Consultas indisponíveis: {failedLabels}. Os valores afetados permanecem como indisponíveis.</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isRetrying}
          onClick={() => void Promise.all(failedQueries.map(({ query }) => query.refetch()))}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRetrying ? "animate-spin" : ""}`} />
          {isRetrying ? "Tentando novamente…" : "Tentar novamente"}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function ApprovalSlaCard({ metrics, isLoading, hasError }: {
  metrics: PurchasingMetrics;
  isLoading: boolean;
  hasError: boolean;
}) {
  const unavailableMessage = isLoading
    ? "Consultando horário de entrada na fila de aprovação…"
    : hasError
      ? "SLA indisponível: não foi possível consultar o histórico de aprovação."
      : "SLA indisponível: sem histórico canônico completo da fila de aprovação.";

  return (
    <div className="p-6 rounded-2xl bg-card border border-border/50 text-center space-y-2">
      <p className="text-3xl font-bold text-success">{metricLabel(metrics.slaPercent, value => `${Math.round(value)}%`)}</p>
      <p className="text-xs text-muted-foreground">Dentro de 24h desde o envio ao gestor</p>
      {metrics.slaPercent === null && (metrics.pendingCount ?? 0) > 0 && (
        <p className="text-xs text-muted-foreground">{unavailableMessage}</p>
      )}
    </div>
  );
}

function CooperativeSummary({ metrics }: { metrics: PurchasingMetrics }) {
  const progressWidth = metrics.monthlyTotal && metrics.approvedTotal !== null
    ? `${Math.min((metrics.approvedTotal / metrics.monthlyTotal) * 100, 100)}%`
    : "0%";

  return (
    <div className="p-6 rounded-2xl bg-card border border-border/50 space-y-4">
      <h3 className="font-bold text-sm">Resumo da Cooperativa</h3>
      <div className="space-y-3">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Pedidos no mês</span>
          <span className="font-bold">{metricLabel(metrics.monthlyTotal, formatCurrency)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Aprovado</span>
          <span className="font-bold text-success">{metricLabel(metrics.approvedTotal, formatCurrency)}</span>
        </div>
        <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
          <div className="bg-success h-full" style={{ width: progressWidth }} />
        </div>
      </div>
    </div>
  );
}

export default function GestorCompras() {
  const [activeTab, setActiveTab] = useState("alerts");
  const { profile, user } = useAuth();
  // A página de compras usa o domínio canônico. As políticas RLS de
  // sicoob_orders e sicoob_order_history limitam as linhas ao escopo do ator.
  const { metrics, pendingQuery, monthlyQuery, slaEventsQuery } = usePurchasingDashboardMetrics(user?.id);

  return (
    <>
      <PageSEO title="Gestão de Compras - Singular" description="Aprovação e gestão de pedidos dos PACs." path="/gestor/compras" />
      
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 data-testid="page-title-gestor-compras" className="text-3xl font-display font-bold text-foreground">Gestão de Compras</h1>
            <p className="text-muted-foreground text-sm">Aprovação, consolidação e monitoramento de pedidos.</p>
          </div>
        </div>

        <MetricsQueryError
          pendingQuery={pendingQuery}
          monthlyQuery={monthlyQuery}
          historyQuery={slaEventsQuery}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-muted/50 p-1 rounded-xl">
                <TabsTrigger value="alerts" className="gap-2 rounded-lg">
                  <Bell className="h-4 w-4" />
                  Alertas
                </TabsTrigger>
                <TabsTrigger value="kanban" className="gap-2 rounded-lg">
                  <LayoutGrid className="h-4 w-4" />
                  Kanban
                </TabsTrigger>
                <TabsTrigger value="orders" className="gap-2 rounded-lg">
                  <Package className="h-4 w-4" />
                  Pedidos
                </TabsTrigger>
                <TabsTrigger value="consolidation" className="gap-2 rounded-lg">
                  <Layers className="h-4 w-4" />
                  Consolidação
                </TabsTrigger>
              </TabsList>

              <TabsContent value="alerts" className="mt-6 space-y-6">
                <SmartAlertsPanel />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="p-6 rounded-2xl bg-card border border-border/50 text-center space-y-2">
                     <p className="text-3xl font-bold">{metricLabel(metrics.pendingCount, String)}</p>
                     <p className="text-xs text-muted-foreground">Pedidos pendentes</p>
                   </div>
                   <ApprovalSlaCard metrics={metrics} isLoading={slaEventsQuery.isLoading} hasError={Boolean(slaEventsQuery.error)} />
                </div>
              </TabsContent>

              <TabsContent value="kanban" className="mt-6 border border-border/50 rounded-2xl bg-card/30 p-4">
                 <SicoobOrdersKanbanPage />
              </TabsContent>

              <TabsContent value="orders" className="mt-6">
                 <SicoobOrdersPage />
              </TabsContent>

              <TabsContent value="consolidation" className="mt-6">
                 <OrderConsolidationPanel singularId={profile?.cooperativa_id || null} />
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20 space-y-4">
              <h3 className="font-bold flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-primary" /> Atalho Rápido
              </h3>
              <p className="text-xs text-muted-foreground">Revise cada solicitação com sua alçada, verba e histórico antes de decidir.</p>
              <Button className="w-full" onClick={() => setActiveTab("kanban")}>
                {metrics.pendingCount === null ? "Analisar pendências" : `Analisar ${metrics.pendingCount} pendência${metrics.pendingCount === 1 ? "" : "s"}`}
              </Button>
            </div>
            
            <CooperativeSummary metrics={metrics} />
          </div>
        </div>
      </div>
    </>
  );
}
