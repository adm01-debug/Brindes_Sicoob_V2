import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Button } from "@/components/ui/badge"; // Correction: Button is needed, not Badge as Button
import { Button as UIButton } from "@/components/ui/button";
import { 
  ArrowLeft,
  LayoutGrid,
  List,
  Plus
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const COLUMNS = [
  { id: 'draft', title: 'Rascunho' },
  { id: 'sent_to_manager', title: 'Enviado ao Gestor' },
  { id: 'manager_approved', title: 'Aprovado Gestor' },
  { id: 'logistic', title: 'Logística/Envio' },
  { id: 'completed', title: 'Finalizado' },
];

const MOCK_ORDERS = [
  { id: '1', pa: 'PA Centro', status: 'draft', total: 1250.50, items: 4 },
  { id: '2', pa: 'PA Sul', status: 'sent_to_manager', total: 3400.00, items: 12 },
  { id: '4', pa: 'PA Oeste', status: 'sent_to_manager', total: 500.00, items: 1 },
];

export default function OrdersKanbanPage() {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <PageSEO title="Kanban de Pedidos Sicoob" description="Gestão visual de pedidos Sicoob." path="/sicoob/pedidos/kanban" noIndex />
      
      <div className="space-y-6 h-full flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <UIButton variant="ghost" size="icon" onClick={() => navigate("/sicoob/pedidos")}>
              <ArrowLeft className="h-5 w-5" />
            </UIButton>
            <div>
              <h1 className="text-2xl font-bold">Funil de Pedidos</h1>
              <p className="text-sm text-muted-foreground">Arraste os pedidos para mudar o status</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <UIButton variant="outline" size="sm" onClick={() => navigate("/sicoob/pedidos")}>
              <List className="h-4 w-4 mr-2" />
              Lista
            </UIButton>
            <UIButton variant="secondary" size="sm" disabled>
              <LayoutGrid className="h-4 w-4 mr-2" />
              Kanban
            </UIButton>
            <UIButton size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo Pedido
            </UIButton>
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 flex-1 min-h-[600px]">
          {COLUMNS.map((column) => (
            <div key={column.id} className="min-w-[300px] w-[300px] bg-muted/30 rounded-lg p-3 flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-semibold text-sm">{column.title}</h3>
                <Badge variant="secondary">{MOCK_ORDERS.filter(o => o.status === column.id).length}</Badge>
              </div>
              
              <div className="flex flex-col gap-2 overflow-y-auto">
                {MOCK_ORDERS.filter(o => o.status === column.id).map((order) => (
                  <div 
                    key={order.id} 
                    className="bg-card p-3 rounded-md shadow-sm border border-border hover:border-primary/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/sicoob/pedidos/${order.id}`)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-mono font-bold">#{order.id}</span>
                      <span className="text-xs font-bold text-primary">R$ {order.total.toFixed(2)}</span>
                    </div>
                    <p className="text-sm font-medium truncate">{order.pa}</p>
                    <p className="text-xs text-muted-foreground">{order.items} itens</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
