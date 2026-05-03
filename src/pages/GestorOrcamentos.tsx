import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuotesListPage } from "./QuotesListPage";
import { QuotesDashboardPage } from "./QuotesDashboardPage";
import { ClipboardCheck, LayoutGrid, BarChart3, Layers } from "lucide-react";
import { QuoteKanbanBoard } from "@/components/quotes/QuoteKanbanBoard";
import { OrderConsolidationPanel } from "@/components/orders/OrderConsolidationPanel";
import { useAuth } from "@/contexts/AuthContext";

/**
 * GestorOrcamentos — Painel central do Gestor de Compras (Singular).
 * Consolida lista de solicitações, dashboard de métricas e Kanban de aprovação.
 */
export default function GestorOrcamentos() {
  const [activeTab, setActiveTab] = useState("requests");
  const { profile } = useAuth();

  return (
    <MainLayout>
      <PageSEO title="Gestão de Orçamentos - Singular" description="Aprovação e consolidação de solicitações dos PACs." path="/gestor/orcamentos" />
      
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-display font-bold text-foreground">Gestão de Compras</h1>
          <p className="text-muted-foreground text-sm">Acompanhe e aprove solicitações dos Postos de Atendimento (PAC).</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px] bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="requests" className="gap-2 rounded-lg">
              <ClipboardCheck className="h-4 w-4" />
              Solicitações
            </TabsTrigger>
            <TabsTrigger value="kanban" className="gap-2 rounded-lg">
              <LayoutGrid className="h-4 w-4" />
              Workflow
            </TabsTrigger>
            <TabsTrigger value="consolidation" className="gap-2 rounded-lg">
              <Layers className="h-4 w-4" />
              Consolidação
            </TabsTrigger>
            <TabsTrigger value="metrics" className="gap-2 rounded-lg">
              <BarChart3 className="h-4 w-4" />
              Métricas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="mt-6">
            <QuotesListPage />
          </TabsContent>

          <TabsContent value="kanban" className="mt-6 border border-border/50 rounded-2xl bg-card/30 p-4">
             <QuoteKanbanBoard />
          </TabsContent>

          <TabsContent value="consolidation" className="mt-6">
            <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border/50 rounded-2xl bg-muted/5">
              <Layers className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold">Consolidação de Pedidos</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-2">
                Agrupe solicitações de diferentes PACs para negociar melhores preços e fretes.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="metrics" className="mt-6">
            <QuotesDashboardPage />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
