import { useState, useMemo, useEffect, type ReactNode } from 'react';
// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from '@/components/seo/PageSEO';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import useLocalStorageState from 'use-local-storage-state';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ArrowLeft,
  LayoutGrid,
  Plus,
  Lock,
  GripVertical,
  Search,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { sicoobOrderService } from '@/services/sicoob/orderService';
import { sicoobCommonService } from '@/services/sicoob/commonService';
import { useSicoobOrdersOptimistic } from '@/hooks/sicoob/useSicoobOrdersOptimistic';
import {
  type OrderStatus,
  ORDER_STATUS_CONFIG,
  ORDER_STATUS_OPTIONS,
  canSicoobTransitionTo,
} from '@/types/sicoob/orders';
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
} from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';

// ---------- Domain types ----------
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

const COLUMNS: ColumnDef[] = ORDER_STATUS_OPTIONS.map((status) => ({
  id: status,
  title: ORDER_STATUS_CONFIG[status].label,
}));

function getCardInteractionClass(canDrag: boolean) {
  return canDrag
    ? 'hover:border-sicoob-green/50 cursor-grab active:cursor-grabbing hover:shadow-md'
    : 'cursor-pointer opacity-90';
}

function getSlaBadgeClass(status: OrderCard['sla_status']) {
  if (status === 'critical') return 'bg-destructive/10 text-destructive border-destructive/20';
  if (status === 'warning') return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
  return 'bg-success/10 text-success border-success/20';
}

function getSlaBadgeLabel(status: OrderCard['sla_status']) {
  return status === 'critical' ? '!' : 'OK';
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
        'group relative overflow-hidden rounded-md border-[1.5px] bg-card p-3 shadow-sm transition-all',
        getCardInteractionClass(canDrag),
        isDragging && 'opacity-40',
        order.sla_status === 'critical' && 'border-destructive/40',
      )}
      onClick={onClick}
    >
      {order.sla_status === 'critical' && (
        <div className="absolute left-0 top-0 h-1 w-full animate-pulse bg-destructive" />
      )}

      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="font-mono text-[10px] font-bold text-muted-foreground">
          #{order.order_number || order.id.slice(0, 8)}
        </span>
        <div className="flex items-center gap-1.5">
          {canDrag ? (
            <div
              {...attributes}
              {...listeners}
              onPointerDown={handlePointerDown}
              className="cursor-grab text-muted-foreground opacity-0 transition-opacity hover:text-sicoob-green group-hover:opacity-100"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </div>
          ) : (
            <Lock className="h-3 w-3 text-muted-foreground/50" />
          )}
        </div>
      </div>

      <p className="mb-1 truncate text-sm font-bold text-sicoob-green-dark">{order.pa}</p>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs font-bold text-foreground">
          R$ {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
        {order.sla_status && (
          <Badge
            variant="outline"
            className={cn('h-4 px-1 text-[8px] font-bold', getSlaBadgeClass(order.sla_status))}
          >
            {getSlaBadgeLabel(order.sla_status)}
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
      <TooltipContent side="right" className="text-xs">
        {reasonBlocked}
      </TooltipContent>
    </Tooltip>
  );
}

// ---------- Droppable column ----------
export interface DroppableColumnProps {
  column: ColumnDef;
  isOver: boolean;
  invalidTarget: boolean;
  children: ReactNode;
  count: number;
}

export function DroppableColumn({
  column,
  isOver,
  invalidTarget,
  children,
  count,
}: DroppableColumnProps) {
  const { setNodeRef } = useDroppable({ id: column.id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-[280px] min-w-[280px] flex-col gap-3 rounded-xl border-2 border-transparent p-3 transition-all',
        'bg-muted/20 backdrop-blur-sm',
        isOver && !invalidTarget && 'border-sicoob-green/40 bg-sicoob-green/5 shadow-inner',
        isOver && invalidTarget && 'border-destructive/40 bg-destructive/5 shadow-inner',
      )}
    >
      <div className="mb-1 flex items-center justify-between px-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {column.title}
        </h3>
        <Badge variant="secondary" className="h-5 border bg-background text-[10px] font-bold">
          {count}
        </Badge>
      </div>
      <div className="custom-scrollbar flex min-h-[100px] flex-col gap-3 overflow-y-auto pr-1">
        {children}
      </div>
    </div>
  );
}

// ---------- Page ----------
export default function OrdersKanbanPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isSupervisorOrAbove, isGerentePa } = useAuth();
  const { updateStatus } = useSicoobOrdersOptimistic();

  // States
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<StatusId | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Performance-focused state: Persist column visibility or filters
  const [columnVisibility] = useLocalStorageState<Record<StatusId, boolean>>('sicoob-kanban-cols', {
    defaultValue: ORDER_STATUS_OPTIONS.reduce<Record<StatusId, boolean>>(
      (acc, status) => ({ ...acc, [status]: true }),
      {} as Record<StatusId, boolean>,
    ),
  });

  // Fetch with React Query for smart caching
  const {
    data: realOrders,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['sicoob_orders_list_kanban'],
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
      setOrders(
        realOrders.map((o) => ({
          id: o.id,
          order_number: o.order_number,
          pa: o.pa?.nome || 'PA Não Identificado',
          status: o.status,
          total: o.total_amount,
          sla_status: o.sla_status,
        })),
      );
    }
  }, [realOrders]);

  // Real-time synchronization
  useEffect(() => {
    return sicoobCommonService.subscribeToOrders(() => {
      queryClient.invalidateQueries({ queryKey: ['sicoob_orders_list_kanban'] });
    });
  }, [queryClient]);

  // Filtering logic - memoized for performance
  const filteredOrders = useMemo(() => {
    if (!searchQuery) return orders;
    const lowerQuery = searchQuery.toLowerCase();
    return orders.filter(
      (o) =>
        o.order_number.toLowerCase().includes(lowerQuery) ||
        o.pa.toLowerCase().includes(lowerQuery),
    );
  }, [orders, searchQuery]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

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
      toast.error('Transição Bloqueada', {
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
        observations: 'Movido via Kanban Excellence',
      });
    } catch {
      // O hook já trata o rollback
      return;
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
        <div className="mx-auto flex h-full w-full max-w-[1920px] flex-col space-y-6">
          {/* Header Section */}
          <div className="sticky top-0 z-10 flex flex-col justify-between gap-4 rounded-2xl border border-border/40 bg-background/50 p-4 shadow-sm backdrop-blur-md lg:flex-row lg:items-center">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-sicoob-green/10"
                onClick={() => navigate('/sicoob/pedidos')}
              >
                <ArrowLeft className="h-5 w-5 text-sicoob-green" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 data-testid="page-title-sicoob-pedidos-kanban" className="font-display text-xl font-bold text-sicoob-green-dark">
                    Gestão Visual Sicoob
                  </h1>
                  <Badge className="border-sicoob-green/20 bg-sicoob-green/10 text-[10px] uppercase tracking-tighter text-sicoob-green">
                    BPMN Compliance
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Monitoramento de SLAs e gargalos em tempo real.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="group relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-sicoob-green" />
                <Input
                  placeholder="Buscar PA ou Pedido..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 rounded-xl border-border/40 pl-9 text-sm focus-visible:ring-sicoob-green/30"
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
                  <RefreshCw className={cn('mr-2 h-4 w-4', isRefetching && 'animate-spin')} />
                  {isRefetching ? 'Atualizando...' : 'Atualizar'}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-xl border-border/40 bg-sicoob-green text-white hover:bg-sicoob-green-dark"
                  onClick={() => navigate('/catalogo')}
                >
                  <Plus className="mr-2 h-4 w-4" />
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
            <div className="custom-scrollbar flex min-h-[calc(100vh-280px)] flex-1 snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-6 lg:snap-none">
              <AnimatePresence mode="popLayout">
                {isLoading ? (
                  <div className="flex w-full gap-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="h-full w-[300px] min-w-[300px] animate-pulse rounded-2xl border border-border/20 bg-muted/5"
                      />
                    ))}
                  </div>
                ) : (
                  COLUMNS.map((column) => {
                    if (!columnVisibility?.[column.id]) return null;

                    const columnOrders = filteredOrders.filter((o) => o.status === column.id);
                    const isOver = overColumn === column.id;
                    const isInvalid =
                      isOver &&
                      activeOrder !== null &&
                      activeOrder.status !== column.id &&
                      invalidOver;

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
                            <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-border/40 opacity-40">
                              <LayoutGrid className="mb-2 h-6 w-6" />
                              <span className="text-[10px] font-bold uppercase tracking-widest">
                                Sem Pedidos
                              </span>
                            </div>
                          ) : (
                            columnOrders.map((order) => {
                              const canDrag =
                                isSupervisorOrAbove ||
                                (isGerentePa && ['draft', 'pending'].includes(order.status));
                              const reason = !canDrag
                                ? 'Perfil sem alçada para este status.'
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
                            })
                          )}
                        </DroppableColumn>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>

            <DragOverlay dropAnimation={dropAnimation}>
              {activeOrder ? (
                <div className="w-[290px] rotate-2 scale-105 cursor-grabbing rounded-xl border-2 border-sicoob-green bg-card p-4 shadow-2xl ring-4 ring-sicoob-green/10 transition-transform">
                  <div className="mb-2 flex items-start justify-between">
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-bold text-muted-foreground">
                      #{activeOrder.order_number}
                    </span>
                    <Badge className="bg-sicoob-green text-[10px] text-white">
                      R$ {activeOrder.total.toLocaleString('pt-BR')}
                    </Badge>
                  </div>
                  <p className="truncate text-sm font-bold text-sicoob-green-dark">
                    {activeOrder.pa}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-[10px] italic text-muted-foreground">
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
