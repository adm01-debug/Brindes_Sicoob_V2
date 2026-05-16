import { useState, useMemo, useEffect, useCallback, useRef } from "react";
// import { MainLayout } from "@/components/layout/MainLayout";
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
import { useSicoobOrdersOptimistic } from "@/hooks/sicoob/useSicoobOrdersOptimistic";
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
  return canSicoobTransitionTo(from, to);
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

  const handlePointerDown = () => {
    if (canDrag && 'vibrate' in navigator) navigator.vibrate(5);
  };

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
              onPointerDown={handlePointerDown}
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
  const queryClient = useQueryClient();
  const { profile, isSupervisorOrAbove, isGerentePa } = useAuth();
  const { updateStatus } = useSicoobOrdersOptimistic();
  
  // States
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<StatusId | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Performance-focused state: Persist column visibility or filters
  const [columnVisibility, setColumnVisibility] = useLocalStorageState<Record<StatusId, boolean>>('sicoob-kanban-cols', {
    defaultValue: ORDER_STATUS_OPTIONS.reduce((acc, status) => ({ ...acc, [status]: true }), {} as any)
  });

  // Fetch with React Query for smart caching
  const { data: realOrders, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["sicoob_orders_list_kanban"],
    queryFn: async () => {
      const { orders } = await sicoobOrderService.listOrders();
      return orders;
    },
    staleTime: 30000, // 30 seconds freshness
    gcTime: 1000 * 60 * 5, // 5 minutes cache
  });

  // Local state for optimistic updates and filtering
  const [orders, setOrders] = useState<OrderCard[]>([]);

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

  // Real-time synchronization
  useEffect(() => {
    const channel = supabase
      .channel('kanban-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sicoob_orders' },
        () => {
          queryClient.invalidateQueries({ queryKey: ["sicoob_orders_list_kanban"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Filtering logic - memoized for performance
  const filteredOrders = useMemo(() => {
    if (!searchQuery) return orders;
    const lowerQuery = searchQuery.toLowerCase();
    return orders.filter(o => 
      o.order_number.toLowerCase().includes(lowerQuery) || 
      o.pa.toLowerCase().includes(lowerQuery)
    );
  }, [orders, searchQuery]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const activeOrder = useMemo(
    () => orders.find((o) => o.id === activeId) ?? null,
    [orders, activeId],
  );

  const invalidOver = useMemo(() => {
    if (!activeOrder || !overColumn) return false;
    if (activeOrder.status === overColumn) return false;
    return !canSicoobTransitionTo(activeOrder.status, overColumn);
  }, [activeOrder, overColumn]);

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
    // Haptic feedback if supported
    if ('vibrate' in navigator) navigator.vibrate(10);
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    const orderId = String(e.active.id);
    const targetCol = e.over ? (String(e.over.id) as StatusId) : null;
    setActiveId(null);
    setOverColumn(null);
    
    if (!targetCol || !activeOrder) return;
    if (activeOrder.status === targetCol) return;

    if (!canSicoobTransitionTo(activeOrder.status, targetCol)) {
      toast.error("Transição Bloqueada", {
        description: `O fluxo BPMN não permite mover de "${ORDER_STATUS_CONFIG[activeOrder.status].label}" para "${ORDER_STATUS_CONFIG[targetCol].label}".`,
      });
      return;
    }

    // A lógica de otimismo agora é centralizada no hook
    try {
      await updateStatus({
        orderId,
        newStatus: targetCol,
        oldStatus: activeOrder.status,
        observations: "Movido via Kanban Excellence"
      });
    } catch (err: any) {
      // O hook já trata o rollback
    }
  };

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
  };

  return (
    <>
      <PageSEO
        title="Kanban de Pedidos | Sicoob"
        description="Gestão de alto desempenho para o fluxo de pedidos Sicoob."
        path="/sicoob/pedidos/kanban"
        noIndex
      />

      <TooltipProvider delayDuration={200}>
        <div className="space-y-6 h-full flex flex-col max-w-[1920px] mx-auto w-full">
          {/* Header Section */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-background/50 backdrop-blur-md p-4 rounded-2xl border border-border/40 shadow-sm sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full hover:bg-sicoob-green/10"
                onClick={() => navigate("/sicoob/pedidos")}
              >
                <ArrowLeft className="h-5 w-5 text-sicoob-green" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-display font-bold text-sicoob-green-dark">Gestão Visual Sicoob</h1>
                  <Badge className="bg-sicoob-green/10 text-sicoob-green border-sicoob-green/20 text-[10px] uppercase tracking-tighter">BPMN Compliance</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Monitoramento de SLAs e gargalos em tempo real.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-64 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-sicoob-green transition-colors" />
                <Input 
                  placeholder="Buscar PA ou Pedido..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 border-border/40 focus-visible:ring-sicoob-green/30 rounded-xl text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-9 rounded-xl border-border/40"
                  onClick={() => refetch()}
                  disabled={isRefetching}
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", isRefetching && "animate-spin")} />
                  {isRefetching ? 'Atualizando...' : 'Atualizar'}
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-9 rounded-xl border-border/40 bg-sicoob-green text-white hover:bg-sicoob-green-dark"
                  onClick={() => navigate("/sicoob/pedidos/novo")}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Pedido
                </Button>
              </div>
            </div>
          </div>

          {/* Kanban Board */}
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
            <div className="flex gap-4 overflow-x-auto pb-6 flex-1 min-h-[calc(100vh-280px)] custom-scrollbar px-1 snap-x snap-mandatory lg:snap-none">
              <AnimatePresence mode="popLayout">
                {isLoading ? (
                  <div className="flex gap-4 w-full">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="min-w-[300px] w-[300px] bg-muted/5 border border-border/20 rounded-2xl h-full animate-pulse" />
                    ))}
                  </div>
                ) : COLUMNS.map((column) => {
                  if (!columnVisibility?.[column.id]) return null;
                  
                  const columnOrders = filteredOrders.filter((o) => o.status === column.id);
                  const isOver = overColumn === column.id;
                  const isInvalid = isOver && activeOrder !== null && activeOrder.status !== column.id && invalidOver;
                  
                  return (
                    <motion.div
                      layout
                      key={column.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="snap-center"
                    >
                      <DroppableColumn
                        column={column}
                        isOver={isOver && activeOrder?.status !== column.id}
                        invalidTarget={isInvalid}
                        count={columnOrders.length}
                      >
                        {columnOrders.length === 0 ? (
                          <div className="h-32 flex flex-col items-center justify-center border border-dashed border-border/40 rounded-xl opacity-40">
                            <LayoutGrid className="h-6 w-6 mb-2" />
                            <span className="text-[10px] uppercase font-bold tracking-widest">Sem Pedidos</span>
                          </div>
                        ) : columnOrders.map((order) => {
                          const canDrag = isSupervisorOrAbove || (isGerentePa && ['draft', 'pending'].includes(order.status));
                          const reason = !canDrag ? "Perfil sem alçada para este status." : undefined;

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
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            <DragOverlay dropAnimation={dropAnimation}>
              {activeOrder ? (
                <div className="bg-card p-4 rounded-xl shadow-2xl border-2 border-sicoob-green w-[290px] cursor-grabbing rotate-2 scale-105 transition-transform ring-4 ring-sicoob-green/10">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">#{activeOrder.order_number}</span>
                    <Badge className="bg-sicoob-green text-white text-[10px]">R$ {activeOrder.total.toLocaleString('pt-BR')}</Badge>
                  </div>
                  <p className="text-sm font-bold text-sicoob-green-dark truncate">{activeOrder.pa}</p>
                  <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground italic">
                    <Zap className="h-3 w-3 text-amber-500" />
                    Movendo para novo status...
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </TooltipProvider>
    </>
  );
}
