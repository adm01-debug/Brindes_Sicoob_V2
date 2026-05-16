import { useState, useEffect, useCallback } from 'react';
import { DndContext, type DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, LayoutDashboard, TrendingUp, Users, ShoppingCart, Package, FileText, Target, Eye, EyeOff, RotateCcw, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageSEO } from "@/components/seo/PageSEO";
import { UpcomingDatesWidget } from '@/components/dashboard/UpcomingDatesWidget';
import { QuickActionsPanel } from '@/components/dashboard/QuickActionsPanel';
import { RecentKitsWidget } from '@/components/dashboard/RecentKitsWidget';
import { MyRecentQuotesWidget } from '@/components/dashboard/MyRecentQuotesWidget';
import { MyPendingOrdersWidget } from '@/components/dashboard/MyPendingOrdersWidget';
import { MyDiscountRequestsWidget } from '@/components/dashboard/MyDiscountRequestsWidget';
import { MyClientsWidget } from '@/components/dashboard/MyClientsWidget';
import { ScopeBadge } from '@/components/common/ScopeBadge';
import { ScheduledReportsManager } from '@/components/reports/ScheduledReportsManager';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentOrgId } from '@/hooks/useCurrentOrgId';
import { useSalesScope } from '@/lib/auth/visibility-scope';
import { toast } from 'sonner';

interface WidgetConfig {
  id: string;
  title: string;
  visible: boolean;
  order: number;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'quick-actions', title: 'Ações Rápidas', visible: true, order: 0 },
  { id: 'upcoming-dates', title: 'Datas Comemorativas', visible: true, order: 1 },
  { id: 'recent-kits', title: 'Kits Recentes', visible: true, order: 2 },
  { id: 'my-quotes', title: 'Minhas Propostas Recentes', visible: true, order: 3 },
  { id: 'my-orders', title: 'Meus Pedidos em Andamento', visible: true, order: 4 },
  { id: 'my-discounts', title: 'Minhas Solicitações de Desconto', visible: true, order: 5 },
  { id: 'my-clients', title: 'Meus Clientes', visible: true, order: 6 },
  { id: 'vendas', title: 'Total de Orçamentos', visible: true, order: 6 },
  { id: 'orcamentos', title: 'Rascunhos', visible: true, order: 7 },
  { id: 'pedidos', title: 'Pedidos Pendentes', visible: true, order: 8 },
  { id: 'scheduled-reports', title: 'Relatórios Agendados', visible: true, order: 9 },
];

const LAYOUT_KEY = 'dashboard_layout';

function SortableWidget({ id, children, title }: { id: string; children: React.ReactNode; title: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={`relative group ${isDragging ? 'ring-2 ring-primary shadow-lg' : ''}`}>
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <Button variant="ghost" size="icon" className="h-6 w-6 cursor-grab active:cursor-grabbing" {...attributes} {...listeners} aria-label="Mover"><GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
        {children}
      </Card>
    </div>
  );
}

function MetricCard({ title, icon, value, subtitle }: { title: string; icon: React.ReactNode; value: string; subtitle?: string }) {
  return (
    <>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </>
  );
}

export function CustomizableDashboard() {
  const { user } = useAuth();
  const [widgetOrder, setWidgetOrder] = useState<WidgetConfig[]>(DEFAULT_WIDGETS);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [metrics, setMetrics] = useState({ quotes: 0, orders: 0, quotesDraft: 0 });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Load saved layout
  useEffect(() => {
    const saved = localStorage.getItem(LAYOUT_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as WidgetConfig[];
        // Merge with defaults (in case new widgets were added)
        const merged = DEFAULT_WIDGETS.map(dw => {
          const savedWidget = parsed.find(p => p.id === dw.id);
          return savedWidget ? { ...dw, visible: savedWidget.visible, order: savedWidget.order } : dw;
        }).sort((a, b) => a.order - b.order);
        setWidgetOrder(merged);
      } catch { /* ignore */ }
    }
  }, []);

  const orgId = useCurrentOrgId();
  
  const salesScope = useSalesScope();

  // Fetch real metrics — RLS faz o isolamento; só filtramos manualmente quando o escopo é "self".
  useEffect(() => {
    if (!user) return;
    const fetchMetrics = async () => {
      // rls-allow: respeita can_view_all_sales; RLS filtra por seller
      let quotesQ = supabase.from('quotes').select('id', { count: 'exact', head: true });
      // rls-allow: respeita can_view_all_sales; RLS filtra por seller
      let ordersQ = supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending');
      // rls-allow: respeita can_view_all_sales; RLS filtra por seller
      let draftQ = supabase.from('quotes').select('id', { count: 'exact', head: true }).eq('status', 'draft');
      if (salesScope === 'self') {
        quotesQ = quotesQ.eq('seller_id', user.id);
        ordersQ = ordersQ.eq('seller_id', user.id);
        draftQ = draftQ.eq('seller_id', user.id);
      }
      if (orgId) {
        quotesQ = quotesQ.eq('organization_id', orgId);
        ordersQ = ordersQ.eq('organization_id', orgId);
        draftQ = draftQ.eq('organization_id', orgId);
      }
      const [quotesRes, ordersRes, draftRes] = await Promise.all([quotesQ, ordersQ, draftQ]);
      setMetrics({
        quotes: quotesRes.count || 0,
        orders: ordersRes.count || 0,
        quotesDraft: draftRes.count || 0,
      });
    };
    fetchMetrics();
  }, [user, orgId]);

  const saveLayout = useCallback((configs: WidgetConfig[]) => {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(configs));
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setWidgetOrder((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex).map((item, idx) => ({ ...item, order: idx }));
        saveLayout(newItems);
        return newItems;
      });
    }
  };

  const toggleWidget = (widgetId: string) => {
    setWidgetOrder(prev => {
      const updated = prev.map(w => w.id === widgetId ? { ...w, visible: !w.visible } : w);
      saveLayout(updated);
      return updated;
    });
  };

  const resetLayout = () => {
    setWidgetOrder(DEFAULT_WIDGETS);
    localStorage.removeItem(LAYOUT_KEY);
    toast.success('Layout restaurado para o padrão');
  };

  const visibleWidgets = widgetOrder.filter(w => w.visible);

  const renderWidgetContent = (widgetId: string) => {
    switch (widgetId) {
      case 'quick-actions':
        return <QuickActionsPanel />;
      case 'upcoming-dates':
        return <UpcomingDatesWidget variant="compact" daysAhead={60} maxItems={6} />;
      case 'recent-kits':
        return <RecentKitsWidget />;
      case 'my-quotes':
        return <MyRecentQuotesWidget />;
      case 'my-orders':
        return <MyPendingOrdersWidget />;
      case 'my-discounts':
        return <MyDiscountRequestsWidget />;
      case 'my-clients':
        return <MyClientsWidget />;
      case 'scheduled-reports':
        return <ScheduledReportsManager />;
      case 'vendas':
        return (
          <MetricCard
            title="Total de Orçamentos"
            icon={<FileText className="h-4 w-4 text-primary" />}
            value={metrics.quotes.toLocaleString('pt-BR')}
            subtitle={`${metrics.quotesDraft} rascunhos`}
          />
        );
      case 'orcamentos':
        return (
          <MetricCard
            title="Rascunhos"
            icon={<Target className="h-4 w-4 text-warning" />}
            value={metrics.quotesDraft.toLocaleString('pt-BR')}
            subtitle="aguardando envio"
          />
        );
      case 'pedidos':
        return (
          <MetricCard
            title="Pedidos Pendentes"
            icon={<ShoppingCart className="h-4 w-4 text-orange" />}
            value={metrics.orders.toLocaleString('pt-BR')}
            subtitle="aguardando processamento"
          />
        );
      default:
        return null;
    }
  };

  // Widgets that render as full-width vs metric cards
  const fullWidthIds = new Set(['quick-actions', 'upcoming-dates', 'recent-kits', 'my-quotes', 'my-orders', 'my-discounts']);

  return (
    <>
      <PageSEO title="Dashboard" description="Painel personalizado com métricas, ações rápidas e widgets." path="/dashboard" />
      <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-24 md:pb-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 data-testid="page-title-dashboard" className="font-display text-2xl font-bold flex items-center gap-2">
              <LayoutDashboard className="h-6 w-6" />
              Dashboard
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <p className="text-muted-foreground text-sm">
                {isCustomizing ? 'Personalize seu dashboard' : 'Arraste widgets para reorganizar'}
              </p>
              <ScopeBadge />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isCustomizing && (
              <Button variant="ghost" size="sm" onClick={resetLayout} className="gap-1 text-xs">
                <RotateCcw className="h-3.5 w-3.5" />
                Restaurar Padrão
              </Button>
            )}
            <Button
              variant={isCustomizing ? "default" : "outline"}
              size="sm"
              onClick={() => setIsCustomizing(!isCustomizing)}
              className="gap-1"
            >
              {isCustomizing ? <Save className="h-3.5 w-3.5" /> : <LayoutDashboard className="h-3.5 w-3.5" />}
              {isCustomizing ? 'Concluir' : 'Personalizar'}
            </Button>
          </div>
        </div>

        {/* Widget visibility toggles */}
        {isCustomizing && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-display text-sm font-medium mb-3">Widgets Visíveis</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {widgetOrder.map(w => (
                  <label key={w.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Switch checked={w.visible} onCheckedChange={() => toggleWidget(w.id)} />
                    <span className={w.visible ? '' : 'text-muted-foreground line-through'}>
                      {w.title}
                    </span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={visibleWidgets.map(w => w.id)} strategy={rectSortingStrategy}>
            <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-24 md:pb-6 animate-fade-in">
              {visibleWidgets.map((widget) => {
                const isFullWidth = fullWidthIds.has(widget.id);
                
                if (isFullWidth) {
                  return (
                    <SortableWidget key={widget.id} id={widget.id} title={widget.title}>
                      <CardContent className="p-0">
                        {renderWidgetContent(widget.id)}
                      </CardContent>
                    </SortableWidget>
                  );
                }

                return null; // metric cards rendered below in grid
              })}

              {/* Metric cards in grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {visibleWidgets.filter(w => !fullWidthIds.has(w.id)).map(widget => (
                  <SortableWidget key={widget.id} id={widget.id} title={widget.title}>
                    {renderWidgetContent(widget.id)}
                  </SortableWidget>
                ))}
              </div>
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </>
  );
}

export default CustomizableDashboard;
