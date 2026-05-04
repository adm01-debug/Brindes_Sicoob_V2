import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useLocalStorageState from "use-local-storage-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  ArrowLeft, 
  LayoutGrid, 
  List, 
  Plus, 
  Lock, 
  GripVertical, 
  AlertTriangle, 
  Search, 
  Filter,
  RefreshCw,
  Zap
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { sicoobOrderService } from "@/services/sicoob/orderService";
import { OrderStatus, ORDER_STATUS_CONFIG, ORDER_STATUS_OPTIONS, canSicoobTransitionTo } from "@/types/sicoob/orders";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  defaultDropAnimationSideEffects,
  type DropAnimation,
} from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

// ---------- Domain types ----------
type SicoobRole = "comprador" | "supervisor" | "gestor" | "logistica";

type StatusId = OrderStatus;

interface ColumnDef {
  id: StatusId;
  title: string;
}

interface OrderCard {
  id: string;
  order_number: string;
  pa: string;
  status: StatusId;
  total: number;
  sla_status?: 'normal' | 'warning' | 'critical';
}

const COLUMNS: ColumnDef[] = ORDER_STATUS_OPTIONS.map(status => ({
  id: status,
  title: ORDER_STATUS_CONFIG[status].label
}));

// Real orders will be fetched via hook
const INITIAL_ORDERS: OrderCard[] = [];

// Permissão por role para executar a transição (from -> to)
const ROLE_PERMISSIONS: Record<
  SicoobRole,
  Array<{ from: StatusId; to: StatusId }>
> = {
  comprador: [{ from: "draft", to: "sent_to_manager" }],
  supervisor: [
    { from: "draft", to: "sent_to_manager" },
    { from: "sent_to_manager", to: "draft" },
  ],
  gestor: [
    { from: "sent_to_manager", to: "manager_approved" },
    { from: "sent_to_manager", to: "draft" },
    { from: "manager_approved", to: "logistic" },
  ],
  logistica: [
    { from: "manager_approved", to: "logistic" },
    { from: "logistic", to: "completed" },
  ],
};

const ROLE_LABEL: Record<SicoobRole, string> = {
  comprador: "Comprador",
  supervisor: "Supervisor",
  gestor: "Gestor",
  logistica: "Logística",
};

function isTransitionAllowed(from: StatusId, to: StatusId): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

function canRoleMove(role: SicoobRole, from: StatusId, to: StatusId): boolean {
  return ROLE_PERMISSIONS[role].some((p) => p.from === from && p.to === to);
}

// ---------- Draggable card ----------
export interface DraggableCardProps {
  order: OrderCard;
  onClick: () => void;
  canDrag: boolean;
  reasonBlocked?: string;
}

export function DraggableCard({ order, onClick, canDrag, reasonBlocked }: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: order.id,
    disabled: !canDrag,
  });

  const card = (
    <div
      ref={setNodeRef}
      className={cn(
        "bg-card p-3 rounded-md shadow-sm border-[1.5px] transition-all group relative overflow-hidden",
        canDrag ? "hover:border-sicoob-green/50 cursor-grab active:cursor-grabbing hover:shadow-md" : "cursor-pointer opacity-90",
        isDragging && "opacity-40",
        order.sla_status === 'critical' && "border-destructive/40"
      )}
      onClick={onClick}
    >
      {order.sla_status === 'critical' && (
        <div className="absolute top-0 left-0 w-full h-1 bg-destructive animate-pulse" />
      )}
      
      <div className="flex justify-between items-start mb-2 gap-2">
        <span className="text-[10px] font-mono font-bold text-muted-foreground">
          #{order.order_number || order.id.slice(0, 8)}
        </span>
        <div className="flex items-center gap-1.5">
          {canDrag ? (
            <div
              {...attributes}
              {...listeners}
              className="text-muted-foreground hover:text-sicoob-green opacity-0 group-hover:opacity-100 transition-opacity cursor-grab"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </div>
          ) : (
            <Lock className="h-3 w-3 text-muted-foreground/50" />
          )}
        </div>
      </div>
      
      <p className="text-sm font-bold text-sicoob-green-dark truncate mb-1">{order.pa}</p>
      
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs font-bold text-foreground">
          R$ {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
        {order.sla_status && (
          <Badge 
            variant="outline" 
            className={cn(
              "h-4 text-[8px] font-bold px-1",
              order.sla_status === 'critical' ? "bg-destructive/10 text-destructive border-destructive/20" :
              order.sla_status === 'warning' ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
              "bg-success/10 text-success border-success/20"
            )}
          >
            {order.sla_status === 'critical' ? '!' : 'OK'}
          </Badge>
        )}
      </div>
    </div>
  );

  if (canDrag || !reasonBlocked) return card;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="w-full">{card}</div>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs">{reasonBlocked}</TooltipContent>
    </Tooltip>
  );
}

// ---------- Droppable column ----------
export interface DroppableColumnProps {
  column: ColumnDef;
  isOver: boolean;
  invalidTarget: boolean;
  children: React.ReactNode;
  count: number;
}

export function DroppableColumn({ column, isOver, invalidTarget, children, count }: DroppableColumnProps) {
  const { setNodeRef } = useDroppable({ id: column.id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-w-[280px] w-[280px] rounded-xl p-3 flex flex-col gap-3 transition-all border-2 border-transparent",
        "bg-muted/20 backdrop-blur-sm",
        isOver && !invalidTarget && "border-sicoob-green/40 bg-sicoob-green/5 shadow-inner",
        isOver && invalidTarget && "border-destructive/40 bg-destructive/5 shadow-inner",
      )}
    >
      <div className="flex items-center justify-between px-1 mb-1">
        <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">{column.title}</h3>
        <Badge variant="secondary" className="h-5 text-[10px] font-bold bg-background border">{count}</Badge>
      </div>
      <div className="flex flex-col gap-3 overflow-y-auto min-h-[100px] pr-1 custom-scrollbar">
        {children}
      </div>
    </div>
  );
}

// ---------- Page ----------
export default function OrdersKanbanPage() {
  const navigate = useNavigate();
  const { profile, isSupervisorOrAbove, isGerentePa } = useAuth();
  const [orders, setOrders] = useState<OrderCard[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<StatusId | null>(null);

  // Fetch real orders
  const { data: realOrders, isLoading } = useQuery({
    queryKey: ["sicoob_orders_list_kanban"],
    queryFn: () => sicoobOrderService.listOrders()
  });

  useEffect(() => {
    if (realOrders) {
      setOrders(realOrders.map(o => ({
        id: o.id,
        order_number: o.order_number,
        pa: o.pa?.nome || "PA Não Identificado",
        status: o.status,
        total: o.total_amount,
        sla_status: o.sla_status
      })));
    }
  }, [realOrders]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const activeOrder = useMemo(
    () => orders.find((o) => o.id === activeId) ?? null,
    [orders, activeId],
  );

  const invalidOver = useMemo(() => {
    if (!activeOrder || !overColumn) return false;
    if (activeOrder.status === overColumn) return false;
    
    // Check BPMN transition rules from common service
    return !canSicoobTransitionTo(activeOrder.status, overColumn);
  }, [activeOrder, overColumn]);

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    const orderId = String(e.active.id);
    const targetCol = e.over ? (String(e.over.id) as StatusId) : null;
    setActiveId(null);
    setOverColumn(null);
    if (!targetCol) return;

    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    if (order.status === targetCol) return;

    if (!canSicoobTransitionTo(order.status, targetCol)) {
      toast.error("Transição BPMN Inválida", {
        description: `O status "${ORDER_STATUS_CONFIG[order.status].label}" não pode avançar diretamente para "${ORDER_STATUS_CONFIG[targetCol].label}".`,
      });
      return;
    }

    try {
      // Optimistic update
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: targetCol } : o)),
      );

      await sicoobOrderService.updateOrderStatus(orderId, targetCol, order.status, "Movido via Kanban");
      
      toast.success("Status Atualizado", {
        description: `Pedido #${order.order_number || orderId.slice(0, 8)} movido para "${ORDER_STATUS_CONFIG[targetCol].label}".`,
      });
    } catch (err: any) {
      // Rollback on error
      if (realOrders) {
         setOrders(realOrders.map(o => ({
          id: o.id,
          order_number: o.order_number,
          pa: o.pa?.nome || "PA Não Identificado",
          status: o.status,
          total: o.total_amount,
          sla_status: o.sla_status
        })));
      }
      toast.error("Falha na transição", { description: err.message });
    }
  };

  return (
    <MainLayout>
      <PageSEO
        title="Fluxo Kanban Sicoob"
        description="Gestão visual do funil de pedidos Sicoob."
        path="/sicoob/pedidos/kanban"
        noIndex
      />

      <TooltipProvider delayDuration={200}>
        <div className="space-y-6 h-full flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/sicoob/pedidos")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-sicoob-green-dark">Painel de Fluxo (Kanban)</h1>
                <p className="text-sm text-muted-foreground italic">
                  Acompanhamento visual do status de produção e logística.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/sicoob/pedidos")}>
                <List className="h-4 w-4 mr-2" />
                Lista
              </Button>
              <Button size="sm" onClick={() => navigate("/sicoob/pedidos/novo")}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Pedido
              </Button>
            </div>
          </div>

          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => setOverColumn(e.over ? (String(e.over.id) as StatusId) : null)}
            onDragCancel={() => {
              setActiveId(null);
              setOverColumn(null);
            }}
          >
            <div className="flex gap-4 overflow-x-auto pb-4 flex-1 min-h-[600px] custom-scrollbar">
              {isLoading ? (
                <div className="flex gap-4 w-full">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="min-w-[280px] w-[280px] bg-muted/10 rounded-xl h-[600px] animate-pulse" />
                  ))}
                </div>
              ) : COLUMNS.map((column) => {
                const columnOrders = orders.filter((o) => o.status === column.id);
                const isOver = overColumn === column.id;
                const isInvalid =
                  isOver &&
                  activeOrder !== null &&
                  activeOrder.status !== column.id &&
                  invalidOver;
                return (
                  <DroppableColumn
                    key={column.id}
                    column={column}
                    isOver={isOver && activeOrder?.status !== column.id}
                    invalidTarget={isInvalid}
                    count={columnOrders.length}
                  >
                    {columnOrders.map((order) => {
                      // Check permissions per status
                      const canDrag = isSupervisorOrAbove || 
                        (isGerentePa && ['draft', 'pending'].includes(order.status));
                      
                      const reason = !canDrag
                        ? "Você não tem permissão para mover pedidos neste status."
                        : undefined;

                      return (
                        <DraggableCard
                          key={order.id}
                          order={order}
                          onClick={() => navigate(`/sicoob/pedidos/${order.id}`)}
                          canDrag={canDrag}
                          reasonBlocked={reason}
                        />
                      );
                    })}
                  </DroppableColumn>
                );
              })}
            </div>

            <DragOverlay>
              {activeOrder ? (
                <div className="bg-card p-3 rounded-md shadow-lg border-2 border-sicoob-green w-[276px] cursor-grabbing rotate-3">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-mono font-bold text-muted-foreground">#{activeOrder.order_number || activeOrder.id.slice(0, 8)}</span>
                    <span className="text-xs font-bold text-sicoob-green-dark">
                      R$ {activeOrder.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-sicoob-green-dark truncate">{activeOrder.pa}</p>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </TooltipProvider>
    </MainLayout>
  );
}
