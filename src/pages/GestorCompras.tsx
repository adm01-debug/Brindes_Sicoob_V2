import { useState } from 'react';
// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from '@/components/seo/PageSEO';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRight, ClipboardCheck, LayoutGrid, Layers, Bell, Package } from 'lucide-react';
import { ApprovalKanbanBoard } from '@/components/orders/ApprovalKanbanBoard';
import { OrderConsolidationPanel } from '@/components/orders/OrderConsolidationPanel';
import { SmartAlertsPanel } from '@/components/orders/SmartAlertsPanel';
import { OrdersPage } from './OrdersPage';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

function GestorComprasTabs({ cooperativeId }: { cooperativeId: string | null }) {
  const [activeTab, setActiveTab] = useState('alerts');
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-4 rounded-xl bg-muted/50 p-1">
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
      </TabsContent>

      <TabsContent
        value="kanban"
        className="mt-6 rounded-2xl border border-border/50 bg-card/30 p-4"
      >
        <ApprovalKanbanBoard />
      </TabsContent>

      <TabsContent value="orders" className="mt-6">
        <OrdersPage />
      </TabsContent>

      <TabsContent value="consolidation" className="mt-6">
        <OrderConsolidationPanel singularId={cooperativeId} />
      </TabsContent>
    </Tabs>
  );
}

function GestorComprasShortcuts() {
  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-6">
        <h3 className="flex items-center gap-2 font-bold">
          <ClipboardCheck className="h-4 w-4 text-primary" /> Fila de aprovações
        </h3>
        <p className="text-xs text-muted-foreground">
          Revise as solicitações na fila de aprovações da Singular.
        </p>
        <Button asChild className="w-full">
          <Link to="/gestor/aprovacoes">
            Abrir fila de aprovações
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>

      <div className="space-y-4 rounded-2xl border border-border/50 bg-card p-6">
        <h3 className="text-sm font-bold">Indicadores da Singular</h3>
        <p className="text-xs text-muted-foreground">
          Consulte os valores carregados para a cooperativa e competência atual.
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link to="/gestor">
            Abrir painel de indicadores
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default function GestorCompras() {
  const { profile } = useAuth();

  return (
    <>
      <PageSEO
        title="Gestão de Compras - Singular"
        description="Aprovação e gestão de pedidos dos PACs."
        path="/gestor/compras"
      />
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-1">
            <h1
              data-testid="page-title-gestor-compras"
              className="font-display text-3xl font-bold text-foreground"
            >
              Gestão de Compras
            </h1>
            <p className="text-sm text-muted-foreground">
              Aprovação, consolidação e monitoramento de pedidos.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <GestorComprasTabs cooperativeId={profile?.cooperativa_id || null} />
          </div>
          <GestorComprasShortcuts />
        </div>
      </div>
    </>
  );
}
