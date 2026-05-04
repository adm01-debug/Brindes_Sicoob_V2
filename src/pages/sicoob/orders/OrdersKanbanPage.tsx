import { useState, useMemo, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { ArrowLeft, LayoutGrid, List, Plus, Lock, GripVertical, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useSicoobOrders } from "@/hooks/sicoob/useSicoobOrder"; // Assuming this exists based on common pattern
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
} from "@dnd-kit/core";
import { cn } from "@/lib/utils";

// ---------- Domain types ----------
type SicoobRole = "comprador" | "supervisor" | "gestor" | "logistica";

type StatusId =
  | "draft"
  | "pending"
  | "waiting_approval"
  | "escalated_to_board"
  | "confirmed"
  | "logistic"
  | "completed";

interface ColumnDef {
  id: StatusId;
  title: string;
}

interface OrderCard {
  id: string;
  pa: string;
  status: StatusId;
  total: number;
  items: number;
}

// ---------- Mock data ----------
const COLUMNS: ColumnDef[] = [
  { id: "draft", title: "Rascunho" },
  { id: "sent_to_manager", title: "Enviado ao Gestor" },
  { id: "manager_approved", title: "Aprovado Gestor" },
  { id: "logistic", title: "Logística/Envio" },
  { id: "completed", title: "Finalizado" },
];

const INITIAL_ORDERS: OrderCard[] = [
  { id: "1", pa: "PA Centro", status: "draft", total: 1250.5, items: 4 },
  { id: "2", pa: "PA Sul", status: "sent_to_manager", total: 3400.0, items: 12 },
  { id: "4", pa: "PA Oeste", status: "sent_to_manager", total: 500.0, items: 1 },
];

// ---------- Transition rules ----------
// Permitido por status atual -> destinos válidos
const ALLOWED_TRANSITIONS: Record<StatusId, StatusId[]> = {
  draft: ["sent_to_manager"],
  sent_to_manager: ["manager_approved", "draft"],
  manager_approved: ["logistic"],
  logistic: ["completed"],
  completed: [],
};

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
        "bg-card p-3 rounded-md shadow-sm border border-border transition-colors group",
        canDrag ? "hover:border-primary/50 cursor-grab active:cursor-grabbing" : "cursor-pointer opacity-90",
        isDragging && "opacity-40",
      )}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2 gap-2">
        <span className="text-xs font-mono font-bold">#{order.id}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-primary">
            R$ {order.total.toFixed(2)}
          </span>
          {canDrag ? (
            <button
              type="button"
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
              className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Arrastar pedido"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
          ) : (
            <Lock className="h-3 w-3 text-muted-foreground" aria-label="Sem permissão" />
          )}
        </div>
      </div>
      <p className="text-sm font-medium truncate">{order.pa}</p>
      <p className="text-xs text-muted-foreground">{order.items} itens</p>
    </div>
  );

  if (canDrag || !reasonBlocked) return card;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex w-full">{card}</span>
      </TooltipTrigger>
      <TooltipContent side="right">{reasonBlocked}</TooltipContent>
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
        "min-w-[300px] w-[300px] rounded-lg p-3 flex flex-col gap-3 transition-colors border-2 border-transparent",
        "bg-muted/30",
        isOver && !invalidTarget && "border-primary/60 bg-primary/5",
        isOver && invalidTarget && "border-destructive/60 bg-destructive/5",
      )}
    >
      <div className="flex items-center justify-between px-1">
        <h3 className="font-semibold text-sm">{column.title}</h3>
        <Badge variant="secondary">{count}</Badge>
      </div>
      <div className="flex flex-col gap-2 overflow-y-auto min-h-[40px]">
        {children}
      </div>
    </div>
  );
}

// ---------- Page ----------
export default function OrdersKanbanPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderCard[]>(INITIAL_ORDERS);
  const [role, setRole] = useState<SicoobRole>("gestor");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<StatusId | null>(null);

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
    return (
      !isTransitionAllowed(activeOrder.status, overColumn) ||
      !canRoleMove(role, activeOrder.status, overColumn)
    );
  }, [activeOrder, overColumn, role]);

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const orderId = String(e.active.id);
    const targetCol = e.over ? (String(e.over.id) as StatusId) : null;
    setActiveId(null);
    setOverColumn(null);
    if (!targetCol) return;

    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    if (order.status === targetCol) return;

    if (!isTransitionAllowed(order.status, targetCol)) {
      const fromLabel = COLUMNS.find((c) => c.id === order.status)?.title;
      const toLabel = COLUMNS.find((c) => c.id === targetCol)?.title;
      toast.error("Transição inválida", {
        description: `Não é permitido mover de "${fromLabel}" para "${toLabel}".`,
      });
      return;
    }

    if (!canRoleMove(role, order.status, targetCol)) {
      toast.error("Sem permissão", {
        description: `Seu papel (${ROLE_LABEL[role]}) não pode executar esta transição.`,
      });
      return;
    }

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: targetCol } : o)),
    );
    toast.success("Status atualizado", {
      description: `Pedido #${orderId} movido para "${
        COLUMNS.find((c) => c.id === targetCol)?.title
      }".`,
    });
  };

  return (
    <MainLayout>
      <PageSEO
        title="Kanban de Pedidos Sicoob"
        description="Gestão visual de pedidos Sicoob."
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
                <h1 className="text-2xl font-bold text-sicoob-green-dark">Fluxo de Pedidos</h1>
                <p className="text-sm text-muted-foreground italic">
                  Gestão visual do funil SICOOB. Arraste para avançar no processo.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 mr-2">
                <span className="text-xs text-muted-foreground">Papel:</span>
                <Select value={role} onValueChange={(v) => setRole(v as SicoobRole)}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ROLE_LABEL) as SicoobRole[]).map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate("/sicoob/pedidos")}>
                <List className="h-4 w-4 mr-2" />
                Lista
              </Button>
              <Button variant="secondary" size="sm" disabled>
                <LayoutGrid className="h-4 w-4 mr-2" />
                Kanban
              </Button>
              <Button size="sm">
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
            <div className="flex gap-4 overflow-x-auto pb-4 flex-1 min-h-[600px]">
              {COLUMNS.map((column) => {
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
                      const allowedDestinations =
                        ALLOWED_TRANSITIONS[order.status]?.filter((dest) =>
                          canRoleMove(role, order.status, dest),
                        ) ?? [];
                      const canDrag = allowedDestinations.length > 0;
                      const reason = !canDrag
                        ? `${ROLE_LABEL[role]} não pode mover pedidos em "${column.title}".`
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
                <div className="bg-card p-3 rounded-md shadow-lg border-2 border-primary w-[276px] cursor-grabbing">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-mono font-bold">#{activeOrder.id}</span>
                    <span className="text-xs font-bold text-primary">
                      R$ {activeOrder.total.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-sm font-medium truncate">{activeOrder.pa}</p>
                  <p className="text-xs text-muted-foreground">{activeOrder.items} itens</p>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </TooltipProvider>
    </MainLayout>
  );
}
