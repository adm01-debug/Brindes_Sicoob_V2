import { useState } from "react";
// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardCheck, LayoutGrid, Layers, Bell, Package } from "lucide-react";
import { ApprovalKanbanBoard } from "@/components/orders/ApprovalKanbanBoard";
import { OrderConsolidationPanel } from "@/components/orders/OrderConsolidationPanel";
import { SmartAlertsPanel } from "@/components/orders/SmartAlertsPanel";
import { OrdersPage } from "./OrdersPage";
import { useAuth } from "@/contexts/AuthContext";
import { useOrdersList } from "@/hooks/orders/useOrders";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/quote-calculations";
import type { OrderRow } from "@/types/orders";

const APPROVED_STATUSES = new Set<OrderRow["status"]>([
  "aprovado_gestor",
  "enviado_vendedor",
  "em_producao",
  "em_separacao",
  "em_transporte",
  "entregue",
  "concluido",
]);

type OrderListResult = { data: OrderRow[]; count: number | null } | undefined;

export interface PurchasingMetrics {
  pendingCount: number | null;
  slaPercent: number | null;
  monthlyTotal: number | null;
  approvedTotal: number | null;
}

function resultCount(result: OrderListResult): number | null {
  if (!result) return null;
  return result.count ?? result.data.length;
}

function hasCompleteResult(result: OrderListResult, count: number | null): result is NonNullable<OrderListResult> {
  return Boolean(result && count !== null && count === result.data.length);
}

function calculatePendingSla(result: OrderListResult, count: number | null, now: Date): number | null {
  if (!hasCompleteResult(result, count) || result.data.length === 0) return null;
  const yesterday = now.getTime() - 24 * 60 * 60 * 1000;
  const withinSla = result.data.filter((order) => new Date(order.created_at).getTime() >= yesterday).length;
  return (withinSla / result.data.length) * 100;
}

function sumCompleteOrders(
  result: OrderListResult,
  count: number | null,
  predicate: (order: OrderRow) => boolean,
): number | null {
  if (!hasCompleteResult(result, count)) return null;
  return result.data
    .filter(predicate)
    .reduce((total, order) => total + (order.total ?? 0), 0);
}

export function calculatePurchasingMetrics(
  pendingResult: OrderListResult,
  monthlyResult: OrderListResult,
  now = new Date(),
): PurchasingMetrics {
  const pendingCount = resultCount(pendingResult);
  const monthlyCount = resultCount(monthlyResult);

  return {
    pendingCount,
    slaPercent: calculatePendingSla(pendingResult, pendingCount, now),
    monthlyTotal: sumCompleteOrders(monthlyResult, monthlyCount, (order) => order.status !== "cancelado"),
    approvedTotal: sumCompleteOrders(monthlyResult, monthlyCount, (order) => APPROVED_STATUSES.has(order.status)),
  };
}

function metricLabel(value: number | null, formatter: (value: number) => string): string {
  return value === null ? "—" : formatter(value);
}

export default function GestorCompras() {
  const [activeTab, setActiveTab] = useState("alerts");
  const { profile, user } = useAuth();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const pendingQuery = useOrdersList(user?.id, "all", { status: "enviado_gestor", pageSize: 1_000 });
  const monthlyQuery = useOrdersList(user?.id, "all", { startDate: monthStart.toISOString(), pageSize: 1_000 });
  const metrics = calculatePurchasingMetrics(pendingQuery.data, monthlyQuery.data);

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
                   <div className="p-6 rounded-2xl bg-card border border-border/50 text-center space-y-2">
                     <p className="text-3xl font-bold text-success">{metricLabel(metrics.slaPercent, value => `${Math.round(value)}%`)}</p>
                     <p className="text-xs text-muted-foreground">Pendências atuais com menos de 24h</p>
                   </div>
                </div>
              </TabsContent>

              <TabsContent value="kanban" className="mt-6 border border-border/50 rounded-2xl bg-card/30 p-4">
                 <ApprovalKanbanBoard />
              </TabsContent>

              <TabsContent value="orders" className="mt-6">
                 <OrdersPage />
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
                    <div
                      className="bg-success h-full"
                      style={{
                        width: metrics.monthlyTotal && metrics.approvedTotal !== null
                          ? `${Math.min((metrics.approvedTotal / metrics.monthlyTotal) * 100, 100)}%`
                          : "0%",
                      }}
                    />
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
