import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { useOrganization } from "@/contexts/OrganizationContext";
import { useSalesScope } from "@/lib/auth/visibility-scope";
import { useQuotes } from "@/hooks/quotes/useQuotes";
import { QuoteService } from "@/services/QuoteService";

/**
 * GestorOrcamentos — Painel central do Gestor de Compras (Singular).
 * Consolida lista de solicitações, dashboard de métricas e Kanban de aprovação.
 */
export default function GestorOrcamentos() {
  const [activeTab, setActiveTab] = useState("requests");
  const [selectedQuoteIds, setSelectedQuoteIds] = useState<string[]>([]);
  const { profile, user } = useAuth();
  const { currentOrg } = useOrganization();
  const scope = useSalesScope();
  const { quotes } = useQuotes();
  const consolidationQuery = useQuery({
    queryKey: ["quote-consolidation-items", user?.id, currentOrg?.id ?? null, scope],
    queryFn: () => {
      if (!user) throw new Error("Sessão ausente ao carregar a consolidação.");
      return QuoteService.listForConsolidation({ userId: user.id, scope, orgId: currentOrg?.id ?? null });
    },
    enabled: activeTab === "consolidation" && Boolean(user),
    staleTime: 30_000,
  });

  // Orçamentos aguardando aprovação ou já aprovados que podem ser consolidados
  const pendingQuotes = (consolidationQuery.data ?? []).filter(q =>
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
             <QuoteKanbanBoard
               quotes={quotes}
               selectedIds={selectedQuoteIds}
               onToggleSelection={(id) => {
                 setSelectedQuoteIds((current) =>
                   current.includes(id)
                     ? current.filter((selectedId) => selectedId !== id)
                     : [...current, id],
                 );
               }}
             />
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
                   loading={consolidationQuery.isFetching}
                   error={consolidationQuery.isError}
                   onRetry={() => { void consolidationQuery.refetch(); }}
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
