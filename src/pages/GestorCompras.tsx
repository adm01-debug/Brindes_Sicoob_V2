import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardCheck, LayoutGrid, Layers, Bell, Package } from "lucide-react";
import { ApprovalKanbanBoard } from "@/components/orders/ApprovalKanbanBoard";
import { OrderConsolidationPanel } from "@/components/orders/OrderConsolidationPanel";
import { SmartAlertsPanel } from "@/components/orders/SmartAlertsPanel";
import { OrdersPage } from "./OrdersPage";
import { useAuth } from "@/contexts/AuthContext";

export default function GestorCompras() {
  const [activeTab, setActiveTab] = useState("alerts");
  const { profile } = useAuth();

  return (
    <MainLayout>
      <PageSEO title="Gestão de Compras - Singular" description="Aprovação e gestão de pedidos dos PACs." path="/gestor/compras" />
      
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-display font-bold text-foreground">Gestão de Compras</h1>
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
                     <p className="text-3xl font-bold">12</p>
                     <p className="text-xs text-muted-foreground">Pedidos pendentes hoje</p>
                   </div>
                   <div className="p-6 rounded-2xl bg-card border border-border/50 text-center space-y-2">
                     <p className="text-3xl font-bold text-success">85%</p>
                     <p className="text-xs text-muted-foreground">SLA de aprovação (24h)</p>
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
              <p className="text-xs text-muted-foreground">Aprove todas as solicitações com valor abaixo do threshold de alçada (R$ 5.000,00).</p>
              <button className="w-full py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:opacity-90 transition-opacity">
                Aprovação em Lote (SLA Rápido)
              </button>
            </div>
            
            <div className="p-6 rounded-2xl bg-card border border-border/50 space-y-4">
              <h3 className="font-bold text-sm">Resumo da Cooperativa</h3>
              <div className="space-y-3">
                 <div className="flex justify-between text-xs">
                   <span className="text-muted-foreground">Orçado no mês</span>
                   <span className="font-bold">R$ 450.000,00</span>
                 </div>
                 <div className="flex justify-between text-xs">
                   <span className="text-muted-foreground">Aprovado</span>
                   <span className="font-bold text-success">R$ 380.000,00</span>
                 </div>
                 <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                    <div className="bg-success h-full w-[84%]" />
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
