import { useState, useMemo } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { useOrdersList, useUpdateOrder, ORDER_STATUS_LABELS, canTransitionTo, type OrderRow } from "@/hooks/useOrders";
import { DroppableColumn } from "@/pages/sicoob/orders/OrdersKanbanPage"; // Reusing UI components
import { DraggableCard } from "@/pages/sicoob/orders/OrdersKanbanPage";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const COLUMNS = [
  { id: "rascunho", title: "Rascunho" },
  { id: "enviado_gestor", title: "Pendente Aprovação" },
  { id: "aprovado_gestor", title: "Aprovado Singular" },
  { id: "enviado_vendedor", title: "Com Vendedor" },
  { id: "em_producao", title: "Produção" },
];

export function ApprovalKanbanBoard() {
  const { user } = useAuth();
  const { data: orders, isLoading } = useOrdersList(user?.id, "all");
  const updateOrder = useUpdateOrder();
  
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const activeOrder = useMemo(
    () => orders?.find((o) => o.id === activeId) ?? null,
    [orders, activeId],
  );

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const orderId = String(e.active.id);
    const targetStatus = e.over ? String(e.over.id) : null;
    setActiveId(null);
    
    if (!targetStatus || !orders) return;

    const order = orders.find((o) => o.id === orderId);
    if (!order || order.status === targetStatus) return;

    if (!canTransitionTo(order.status, targetStatus)) {
      toast.error(`Transição inválida de ${ORDER_STATUS_LABELS[order.status]} para ${ORDER_STATUS_LABELS[targetStatus]}`);
      return;
    }

    updateOrder.mutate({ id: orderId, status: targetStatus } as any);
  };

  if (isLoading) return <div className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]">
        {COLUMNS.map((column) => {
          const columnOrders = orders?.filter((o) => o.status === column.id) || [];
          return (
            <DroppableColumn
              key={column.id}
              column={{ id: column.id as any, title: column.title }}
              isOver={false} // Will be handled by the component internally if possible or simplified
              invalidTarget={false}
              count={columnOrders.length}
            >
              {columnOrders.map((order) => (
                <DraggableCard
                  key={order.id}
                  order={{
                    id: order.id,
                    pa: order.client_company || "Sem Empresa",
                    status: order.status as any,
                    total: order.total || 0,
                    items: 0, // Should fetch items count if needed
                  }}
                  onClick={() => {}} // Navigate to detail
                  canDrag={true}
                />
              ))}
            </DroppableColumn>
          );
        })}
      </div>

      <DragOverlay>
        {activeOrder ? (
          <div className="bg-card p-3 rounded-md shadow-lg border-2 border-primary w-[276px] opacity-90 cursor-grabbing">
            <p className="text-xs font-mono font-bold">#{activeOrder.id.slice(0, 8)}</p>
            <p className="text-sm font-medium truncate">{activeOrder.client_company}</p>
            <p className="text-xs font-bold text-primary">R$ {activeOrder.total?.toFixed(2)}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
