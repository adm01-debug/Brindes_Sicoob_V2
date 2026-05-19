import { useState } from "react";
// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuotesListPage } from "./QuotesListPage";
import { QuotesDashboardPage } from "./QuotesDashboardPage";
import { ClipboardCheck, LayoutGrid, BarChart3, Layers } from "lucide-react";
import { QuoteKanbanBoard } from "@/components/quotes/QuoteKanbanBoard";
import { OrderConsolidationPanel } from "@/components/orders/OrderConsolidationPanel";
import { QuoteConsolidationPanel } from "@/components/quotes/QuoteConsolidationPanel";
import { useAuth } from "@/contexts/AuthContext";
import { useQuotes } from "@/hooks/quotes/useQuotes";

/**
 * GestorOrcamentos — Painel central do Gestor de Compras (Singular).
 * Consolida lista de solicitações, dashboard de métricas e Kanban de aprovação.
 */
export default function GestorOrcamentos() {
  const [activeTab, setActiveTab] = useState("requests");
  const { profile } = useAuth();
  const { quotes } = useQuotes();

  // Orçamentos aguardando aprovação ou já aprovados que podem ser consolidados
  const pendingQuotes = quotes.filter(q => 
    ["pending_singular_approval", "approved_singular"].includes(q.status)
  );

  return (
    <>
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

          <TabsContent value="consolidation" className="mt-6 space-y-8">
             <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
               <div className="space-y-4">
                 <h3 className="text-lg font-semibold flex items-center gap-2">
                   <Layers className="h-5 w-5 text-primary" />
                   Consolidação de Orçamentos (Singular)
                 </h3>
                 <QuoteConsolidationPanel 
                   quotes={pendingQuotes} 
                   title="Visão de Compra Centralizada"
                   description="Mapeamento de demanda de todos os PACs para negociação em volume."
                 />
               </div>
               
               <div className="space-y-4">
                 <h3 className="text-lg font-semibold flex items-center gap-2">
                   <ClipboardCheck className="h-5 w-5 text-primary" />
                   Consolidação de Pedidos (Execução)
                 </h3>
                 <OrderConsolidationPanel singularId={profile?.cooperativa_id || null} />
               </div>
             </div>
          </TabsContent>

          <TabsContent value="metrics" className="mt-6">
            <QuotesDashboardPage />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
