import { useState, type ReactNode } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { PageSEO } from "@/components/seo/PageSEO";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, MessageSquare, AlertCircle, CheckCircle, AlertTriangle, Trash2, Truck, FileText, CreditCard, Image as ImageIcon, History, ArrowUpCircle, Stamp, X } from "lucide-react";
import { exportOrderDossier } from "@/utils/sicoob/orderDossierExport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { usePaBudget } from "@/hooks/usePaBudget";
import { useApprovalThreshold } from "@/hooks/admin/useApprovalThreshold";
import { useApprovalRequests } from "@/hooks/useSicoobApprovals";
import { useSicoobOrderItems } from "@/hooks/useSicoobOrderItems";
import { useSicoobOrderHistory } from "@/hooks/useSicoobOrderHistory";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSicoobOrder, useSicoobOrderDetails, useUpdateSicoobOrderStatus } from "@/hooks/sicoob/useSicoobOrder";
import { OrderStatusBadge } from "@/components/sicoob/orders/OrderStatusBadge";
import { OrderActionDialog } from "@/components/sicoob/orders/OrderActionDialog";
import { OrderItemsHistory } from "@/components/sicoob/orders/OrderItemsHistory";
import { SLABadge } from "@/components/sicoob/orders/SLABadge";
import { OrderHistoryTimeline } from "@/components/orders/OrderHistoryTimeline";
import { OrderLogisticsTab } from "@/components/sicoob/orders/OrderLogisticsTab";
import { OrderInvoicesTab } from "@/components/sicoob/orders/OrderInvoicesTab";
import { OrderPaymentsTab } from "@/components/sicoob/orders/OrderPaymentsTab";
import { OrderPilotApprovalsTab } from "@/components/sicoob/orders/OrderPilotApprovalsTab";
import { OrderCommentsTab } from "@/components/sicoob/orders/OrderCommentsTab";
import { OrderBudgetIntelligence } from "@/components/sicoob/orders/OrderBudgetIntelligence";
import { LogisticsCommandCenter } from "@/components/sicoob/orders/LogisticsCommandCenter";
import { OrderProductionReadiness } from "@/components/sicoob/orders/OrderProductionReadiness";
import { OneClickReorder } from "@/components/orders/OneClickReorder";
import { OrderAddItemDialog } from "@/components/sicoob/orders/OrderAddItemDialog";
import { cn } from "@/lib/utils";
import { sicoobApprovalService } from "@/services/sicoob/approvalService";
import { canManageSicoobOrderFulfillment } from "@/lib/sicoob/order-permissions";
import { getSlaCycleStartedAt } from "@/lib/sicoob/sla-cycle";
import { hasConfiguredPaBudget, isOrderOverPaBudget, resolvePaBudgetState } from "@/lib/sicoob/paBudgetState";
import { type OrderStatus, type SicoobOrder, type SicoobOrderItem, canEditSicoobOrderItems, canSicoobTransitionTo, ORDER_STATUS_CONFIG } from "@/types/sicoob/orders";

const formatOrderCurrency = (value?: number | null) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const canTransitionTo = (current: OrderStatus, next: OrderStatus) => canSicoobTransitionTo(current, next);
const ACTION_BUTTON_CLASS = "bg-sicoob-green hover:bg-sicoob-green-dark text-white";
const PENDING_OPACITY_CLASS = "opacity-50";

function useDetailDialogs() {
  const [requestReason, setRequestReason] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isEscalateDialogOpen, setIsEscalateDialogOpen] = useState(false);
  return { requestReason, setRequestReason, rejectionReason, setRejectionReason, isRequestDialogOpen, setIsRequestDialogOpen, isRejectDialogOpen, setIsRejectDialogOpen, isEscalateDialogOpen, setIsEscalateDialogOpen };
}

function useDetailResources(orderId: string) {
  const orderQuery = useSicoobOrder(orderId || undefined);
  const details = useSicoobOrderDetails(orderId || undefined);
  const budget = usePaBudget(orderQuery.data?.pa_id, orderQuery.data?.created_at);
  const threshold = useApprovalThreshold();
  const approval = useApprovalRequests(orderId || undefined);
  const history = useSicoobOrderHistory(orderId || undefined);
  const items = useSicoobOrderItems(orderId || undefined);
  const statusMutation = useUpdateSicoobOrderStatus();
  const auth = useAuth();
  const queryClient = useQueryClient();
  return { orderQuery, details, budget, threshold, approval, history, items, statusMutation, auth, queryClient };
}

type DetailDialogs = ReturnType<typeof useDetailDialogs>;
type DetailResources = ReturnType<typeof useDetailResources>;
type ApprovalRequest = NonNullable<DetailResources["approval"]["requests"]>[number];

interface ActionContext {
  orderId: string;
  order: SicoobOrder | undefined;
  dialogs: DetailDialogs;
  resources: DetailResources;
  activeRequest: ApprovalRequest | undefined;
  orderTotal: number;
  isOverBudget: boolean | null;
}

function requestApprovalAction(context: ActionContext) {
  return async () => {
    if (!context.order || !context.orderId) return;
    if (!context.dialogs.requestReason.trim()) { toast.error("Por favor, informe o motivo da solicitação"); return; }
    context.resources.approval.createRequest.mutate({ orderId: context.orderId, reason: context.dialogs.requestReason, threshold: context.resources.threshold.threshold, previousStatus: context.order.status }, { onSuccess: () => { context.dialogs.setIsRequestDialogOpen(false); context.dialogs.setRequestReason(""); } });
  };
}

function approveAction(context: ActionContext) {
  return () => {
    if (!context.order || !context.orderId) return;
    if (context.isOverBudget === null) { toast.error("Não foi possível validar a verba do PA. Consulte o estado da verba antes de aprovar."); return; }
    if (context.isOverBudget) { toast.error("Saldo de verba insuficiente para este pedido"); return; }
    if (context.activeRequest) {
      context.resources.approval.approveRequest.mutate({ requestId: context.activeRequest.id, orderId: context.orderId, previousStatus: context.order.status });
      return;
    }
    context.resources.statusMutation.mutate({ orderId: context.orderId, status: "confirmed", currentStatus: context.order.status });
  };
}

function rejectAction(context: ActionContext) {
  return async () => {
    if (!context.order || !context.orderId) return;
    const reason = context.dialogs.rejectionReason;
    if (reason.trim().length < 10) { toast.error("Por favor, informe um motivo com pelo menos 10 caracteres."); return; }
    if (context.activeRequest) {
      context.resources.approval.rejectRequest.mutate({ requestId: context.activeRequest.id, orderId: context.orderId, reason, previousStatus: context.order.status }, { onSuccess: () => { context.dialogs.setIsRejectDialogOpen(false); context.dialogs.setRejectionReason(""); } });
      return;
    }
    try {
      await sicoobApprovalService.rejectOrderWithoutApproval(context.orderId, context.order.status, reason);
      toast.success("Pedido rejeitado");
      await context.resources.orderQuery.refetch();
      await context.resources.queryClient.invalidateQueries({ queryKey: ["sicoob_order_history", context.orderId] });
      context.dialogs.setIsRejectDialogOpen(false); context.dialogs.setRejectionReason("");
    } catch (error) { toast.error("Erro ao rejeitar pedido", { description: error instanceof Error ? error.message : "Não foi possível registrar a rejeição." }); }
  };
}

function escalateAction(context: ActionContext) {
  return () => {
    if (!context.order || !context.orderId) return;
    if (!context.dialogs.requestReason.trim()) { toast.error("Informe o motivo da escalação."); return; }
    context.resources.approval.createRequest.mutate({ orderId: context.orderId, reason: context.dialogs.requestReason, threshold: context.resources.threshold.threshold, previousStatus: context.order.status, isEscalated: true }, { onSuccess: async () => { await context.resources.orderQuery.refetch(); context.dialogs.setIsEscalateDialogOpen(false); context.dialogs.setRequestReason(""); } });
  };
}

function statusUpdateAction(context: ActionContext) {
  return (status: OrderStatus) => {
    if (!context.order || !context.orderId) return;
    const label = ORDER_STATUS_CONFIG[status].label;
    if (!confirm(`Deseja realmente alterar o status do pedido para "${label}"?`)) return;
    context.resources.statusMutation.mutate({ orderId: context.orderId, status, currentStatus: context.order.status, observations: `Alteração manual de status para ${label}` });
  };
}

function allowedOrderTabs(canManage: boolean, isSupervisor: boolean): string[] {
  const tabs = ["status", "timeline", "comments"];
  if (canManage) tabs.push("logistics", "invoices");
  if (isSupervisor) tabs.push("payments", "approvals");
  return tabs;
}

function canApproveOrder(resources: DetailResources, order: SicoobOrder | undefined): boolean {
  if (resources.auth.isSupervisorOrAbove) return true;
  return Boolean(resources.auth.isGerentePa && order?.pa_id === resources.auth.profile?.pa_id);
}

function useOrderDetailController() {
  const { id } = useParams();
  const orderId = id ?? "";
  const navigate = useNavigate();
  const dialogs = useDetailDialogs();
  const resources = useDetailResources(orderId);
  const order = resources.orderQuery.data ?? undefined;
  const activeRequest = resources.approval.requests?.find(request => request.status === "pending");
  const orderTotal = order?.total_amount ?? 0;
  const isOverThreshold = resources.threshold.needsApproval(orderTotal);
  const budgetState = resolvePaBudgetState({
    isLoading: resources.budget.isLoading,
    hasError: Boolean(resources.budget.error),
    hasPaId: Boolean(resources.budget.targetPaId),
    hasBudget: hasConfiguredPaBudget(resources.budget.budget),
  });
  const isOverBudget = isOrderOverPaBudget(budgetState, orderTotal, resources.budget.remainingBudget);
  const canManageFulfillment = canManageSicoobOrderFulfillment(order, resources.auth.profile, resources.auth.roles);
  const slaCycleStartedAt = getSlaCycleStartedAt(order?.status, resources.history.history);
  const context = { orderId, order, dialogs, resources, activeRequest, orderTotal, isOverBudget };
  const exportDossier = () => { if (!order) return; exportOrderDossier({ orderData: order, orderItems: resources.details.items ?? [], orderHistory: resources.history.history ?? [], orderTotal }); toast.success("Dossiê exportado com sucesso"); };
  return { orderId, navigate, dialogs, resources, order, activeRequest, orderTotal, isOverThreshold, isOverBudget, canManageFulfillment, slaCycleStartedAt, canApprove: canApproveOrder(resources, order), canEditItems: Boolean(order && canManageFulfillment && canEditSicoobOrderItems(order.status)), allowedTabs: allowedOrderTabs(canManageFulfillment, resources.auth.isSupervisorOrAbove), actions: { requestApproval: requestApprovalAction(context), approve: approveAction(context), reject: rejectAction(context), escalate: escalateAction(context), updateStatus: statusUpdateAction(context), exportDossier } };
}

type DetailController = ReturnType<typeof useOrderDetailController>;

function OrderAlerts({ controller }: { controller: DetailController }) {
  const { activeRequest, order } = controller;
  return <div>{activeRequest && <Alert className="bg-warning/10 border-warning/20"><AlertTriangle className="h-5 w-5 text-warning" /><AlertTitle className="text-warning">Solicitação de Aprovação Pendente</AlertTitle><AlertDescription className="text-warning/90">Este pedido excedeu a alçada de <strong>R$ {activeRequest.threshold_at_request.toLocaleString("pt-BR")}</strong> e aguarda aprovação de um gestor.<p className="mt-2"><strong>Motivo:</strong> {activeRequest.request_reason}</p></AlertDescription></Alert>}{order?.status === "rejected" && <Alert variant="destructive"><AlertCircle className="h-5 w-5" /><AlertTitle>Pedido Rejeitado</AlertTitle><AlertDescription>Este pedido foi rejeitado por um gestor. Verifique o histórico para mais detalhes.</AlertDescription></Alert>}</div>;
}

function ManagerApprovalActions({ controller }: { controller: DetailController }) {
  const { dialogs, actions, activeRequest, order } = controller;
  return <><Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => dialogs.setIsRejectDialogOpen(true)}><X className="mr-2 h-4 w-4" />Rejeitar</Button><OrderActionDialog isOpen={dialogs.isRejectDialogOpen} onOpenChange={dialogs.setIsRejectDialogOpen} title="Rejeitar Pedido" description="Informe o motivo detalhado da rejeição para que o PA possa corrigir o pedido." placeholder="Motivo da rejeição (mínimo 10 caracteres)..." confirmLabel="Confirmar Rejeição" confirmVariant="destructive" value={dialogs.rejectionReason} onValueChange={dialogs.setRejectionReason} onConfirm={actions.reject} confirmDisabled={dialogs.rejectionReason.length < 10} />{activeRequest && order?.status !== "escalated_to_board" && <><Button variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-50" onClick={() => dialogs.setIsEscalateDialogOpen(true)}><ArrowUpCircle className="mr-2 h-4 w-4" />Escalar Diretoria</Button><OrderActionDialog isOpen={dialogs.isEscalateDialogOpen} onOpenChange={dialogs.setIsEscalateDialogOpen} title="Escalar para Diretoria" description="Este pedido será enviado para a fila de aprovação da Alçada Superior (Board)." placeholder="Justificativa técnica para escalação..." confirmLabel="Confirmar Escalação" value={dialogs.requestReason} onValueChange={dialogs.setRequestReason} onConfirm={actions.escalate} confirmDisabled={dialogs.requestReason.length < 10} /></>}<Button className={ACTION_BUTTON_CLASS} onClick={actions.approve}><CheckCircle className="mr-2 h-4 w-4" />Aprovar Pedido</Button></>;
}

function RequestApprovalAction({ controller }: { controller: DetailController }) {
  const { dialogs, actions, orderTotal, resources } = controller;
  return <><Button className="bg-amber-500 hover:bg-amber-600 text-white animate-pulse" onClick={() => dialogs.setIsRequestDialogOpen(true)}><AlertTriangle className="mr-2 h-4 w-4" />Solicitar Aprovação</Button><OrderActionDialog isOpen={dialogs.isRequestDialogOpen} onOpenChange={dialogs.setIsRequestDialogOpen} title="Solicitar Aprovação de Alçada" description={`Este pedido de R$ ${orderTotal.toLocaleString("pt-BR")} excede a alçada configurada de R$ ${resources.threshold.threshold.toLocaleString("pt-BR")}.`} placeholder="Justifique a necessidade deste investimento (Ex: Campanha XPTO)..." confirmLabel="Enviar Solicitação" value={dialogs.requestReason} onValueChange={dialogs.setRequestReason} onConfirm={actions.requestApproval} confirmDisabled={dialogs.requestReason.length < 10} /></>;
}

function ApprovalActions({ controller }: { controller: DetailController }) {
  const { order, activeRequest, canApprove, isOverThreshold } = controller;
  if (!order) return null;
  if ((activeRequest || order.status === "waiting_approval") && canApprove) return <ManagerApprovalActions controller={controller} />;
  if (order.status === "pending" && isOverThreshold && !activeRequest) return <RequestApprovalAction controller={controller} />;
  if (order.status === "pending" && !isOverThreshold) return <Button className={ACTION_BUTTON_CLASS} onClick={controller.actions.approve}><CheckCircle className="mr-2 h-4 w-4" />Aprovar (Auto-Alçada)</Button>;
  return null;
}

function DetailHeader({ controller }: { controller: DetailController }) {
  const { order, orderId } = controller;
  if (!order) return null;
  return <div className="flex items-center gap-4"><Button variant="ghost" size="icon" onClick={() => controller.navigate("/sicoob/pedidos")}><ArrowLeft className="h-5 w-5" /></Button><div><div className="flex items-center gap-2"><h1 className="text-2xl font-bold text-sicoob-green-dark">Pedido #{order.order_number}</h1><OrderStatusBadge status={order.status} />{order.sla_status && <SLABadge status={order.sla_status} deadline={order.sla_deadline} startedAt={controller.slaCycleStartedAt} />}</div><p className="text-xs text-muted-foreground mt-1">ID: <span className="font-mono font-bold">#{order.id.slice(0, 8)}</span> • Criado em {new Date(order.created_at).toLocaleString("pt-BR")}</p></div><div className="ml-auto flex gap-2">{order.status === "completed" && <OneClickReorder orderId={orderId} variant="outline" className="h-9 border-sicoob-green/30 text-sicoob-green-dark hover:bg-sicoob-green/5" />}<div className="flex flex-col gap-1"><Button variant="outline" size="sm" className="gap-2 text-xs h-9 border-sicoob-green/30 text-sicoob-green-dark hover:bg-sicoob-green/5" onClick={controller.actions.exportDossier}><FileText className="h-3.5 w-3.5" />Exportar dossiê do pedido</Button><div className="flex items-center justify-center gap-1.5 text-[8px] uppercase tracking-tighter text-muted-foreground font-bold">Relatório operacional</div></div><ApprovalActions controller={controller} /></div></div>;
}

function OrderItemRow({ item, controller }: { item: SicoobOrderItem; controller: DetailController }) {
  const pending = controller.resources.items.removeItem.isPending;
  const remove = () => { if (confirm("Deseja realmente remover este item?")) controller.resources.items.removeItem.mutate(item.id); };
  return <div className="flex items-center justify-between py-3 border-b last:border-0"><div className="flex gap-4"><div className={cn("w-12 h-12 bg-muted rounded flex items-center justify-center transition-opacity", pending && PENDING_OPACITY_CLASS)}><Package className="h-6 w-6 text-muted-foreground" /></div><div className={cn("transition-opacity", pending && PENDING_OPACITY_CLASS)}><p className="font-medium">{item.product_name || "Produto Sicoob"}</p><p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p></div></div><div className="text-right flex items-center gap-4"><div className={cn("transition-opacity", pending && PENDING_OPACITY_CLASS)}><p className="font-bold">{formatOrderCurrency(item.line_total_amount ?? item.unit_price * item.quantity)}</p><p className="text-xs text-muted-foreground">Un: R$ {Number(item.unit_price).toLocaleString("pt-BR")}</p>{Number(item.personalization_amount || 0) > 0 && <p className="text-xs text-muted-foreground">Personalização: {formatOrderCurrency(item.personalization_amount)}</p>}</div>{controller.canEditItems && <Button variant="ghost" size="icon" aria-label="Remover item" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={remove} disabled={pending}><Trash2 className={cn("h-4 w-4", pending && "animate-pulse")} /></Button>}</div></div>;
}

function CommercialBreakdown({ order }: { order: SicoobOrder }) {
  if (order.pricing_formula_version !== "brl-v1") return null;
  return <div className="space-y-1 pt-4 border-t text-sm text-muted-foreground" data-testid="order-commercial-breakdown"><div className="flex justify-between"><span>Produtos</span><span>{formatOrderCurrency(order.merchandise_amount)}</span></div><div className="flex justify-between"><span>Personalizações</span><span>{formatOrderCurrency(order.personalization_amount)}</span></div>{Number(order.negotiation_markup_amount) > 0 && <div className="flex justify-between"><span>Ajuste comercial</span><span>{formatOrderCurrency(order.negotiation_markup_amount)}</span></div>}{Number(order.discount_amount) > 0 && <div className="flex justify-between"><span>Desconto</span><span>- {formatOrderCurrency(order.discount_amount)}</span></div>}{Number(order.shipping_amount) > 0 && <div className="flex justify-between"><span>Frete</span><span>{formatOrderCurrency(order.shipping_amount)}</span></div>}</div>;
}

function OrderItemsCard({ controller }: { controller: DetailController }) {
  const { order } = controller;
  if (!order) return null;
  const items = controller.resources.details.items ?? [];
  return <Card><CardHeader><CardTitle className="text-lg flex items-center justify-between"><div className="flex items-center gap-2"><Package className="h-5 w-5" />Itens do Pedido</div>{controller.canEditItems && <OrderAddItemDialog onAdd={data => controller.resources.items.addItem.mutate(data)} isPending={controller.resources.items.addItem.isPending} />}</CardTitle></CardHeader><CardContent><div className="space-y-4">{items.map(item => <OrderItemRow key={item.id} item={item} controller={controller} />)}<CommercialBreakdown order={order} /><div className="flex justify-between pt-4 border-t-2 border-dashed"><span className="font-bold">Total do Pedido</span><span className="text-xl font-bold text-primary">{formatOrderCurrency(controller.orderTotal)}</span></div></div></CardContent></Card>;
}

function TabButton({ value, icon, children }: { value: string; icon: ReactNode; children: ReactNode }) { return <TabsTrigger value={value} className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 pb-2 h-auto">{icon}{children}</TabsTrigger>; }
function TabsNavigation({ allowed }: { allowed: string[] }) { return <TabsList className="w-full justify-start overflow-x-auto bg-transparent border-b rounded-none h-auto p-0 gap-6"><TabButton value="items" icon={<Package className="h-4 w-4 mr-2" />}>Itens</TabButton>{allowed.includes("comments") && <TabButton value="comments" icon={<MessageSquare className="h-4 w-4 mr-2" />}>Comentários</TabButton>}{allowed.includes("logistics") && <TabButton value="logistics" icon={<Truck className="h-4 w-4 mr-2" />}>Logística</TabButton>}{allowed.includes("invoices") && <TabButton value="invoices" icon={<FileText className="h-4 w-4 mr-2" />}>NF</TabButton>}{allowed.includes("payments") && <TabButton value="payments" icon={<CreditCard className="h-4 w-4 mr-2" />}>Pagamento</TabButton>}{allowed.includes("approvals") && <TabButton value="pilots" icon={<ImageIcon className="h-4 w-4 mr-2" />}>Aprovações de Piloto</TabButton>}{allowed.includes("timeline") && <TabButton value="timeline" icon={<History className="h-4 w-4 mr-2" />}>Timeline</TabButton>}</TabsList>; }

function ItemsAuditTab({ controller }: { controller: DetailController }) {
  const order = controller.order;
  if (!order) return null;
  return <TabsContent value="items" className="space-y-4 pt-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Card className="border-[1.5px] bg-muted/20"><CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><Stamp className="h-3 w-3" /> Metadados de Auditoria</CardTitle></CardHeader><CardContent className="space-y-2"><AuditRow label="Protocolo Digital" value={`SIC-${controller.orderId.slice(0, 12).toUpperCase()}`} mono /><AuditRow label="Integridade" value="Protegida por regras transacionais" /><AuditRow label="Política aplicada" value={order.approval_policy_version || "Não registrada"} /><AuditRow label="Última Modificação" value={order.updated_at ? new Date(order.updated_at).toLocaleDateString("pt-BR") : "---"} /></CardContent></Card><Card className="border-[1.5px] bg-amber-50/50 border-amber-200/50"><CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase tracking-wider text-amber-700">Fluxo BPMN</CardTitle></CardHeader><CardContent className="space-y-2"><AuditRow label="Alçada Atual" value={`R$ ${controller.resources.threshold.threshold.toLocaleString("pt-BR")}`} /><div className="flex justify-between items-center text-sm"><span className="text-muted-foreground">Requer Aprovação</span><Badge variant={controller.isOverThreshold ? "warning" : "success"} className="h-5">{controller.isOverThreshold ? "Sim" : "Não"}</Badge></div></CardContent></Card></div><Card className="border-[1.5px]"><CardHeader><CardTitle className="text-sm">Auditoria de Itens</CardTitle></CardHeader><CardContent><OrderItemsHistory logs={controller.resources.details.logs} /></CardContent></Card></TabsContent>;
}

function AuditRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) { return <div className="flex justify-between items-center text-sm"><span className="text-muted-foreground">{label}</span><span className={mono ? "font-mono text-[10px] font-bold" : "font-medium"}>{value}</span></div>; }

function DetailTabs({ controller }: { controller: DetailController }) {
  const { allowedTabs: allowed, orderId, order } = controller;
  if (!order) return null;
  return <Tabs defaultValue="items"><TabsNavigation allowed={allowed} /><TabsContent value="comments" className="pt-6"><OrderCommentsTab orderId={orderId} /></TabsContent><ItemsAuditTab controller={controller} />{allowed.includes("logistics") && <TabsContent value="logistics" className="pt-6"><OrderLogisticsTab orderId={orderId} orderStatus={order.status} canManage={controller.canManageFulfillment} /></TabsContent>}{allowed.includes("invoices") && <TabsContent value="invoices" className="pt-6"><OrderInvoicesTab orderId={orderId} canManage={controller.canManageFulfillment} /></TabsContent>}{allowed.includes("payments") && <TabsContent value="payments" className="pt-6"><OrderPaymentsTab orderId={orderId} /></TabsContent>}{allowed.includes("approvals") && <TabsContent value="pilots" className="pt-6"><OrderPilotApprovalsTab orderId={orderId} /></TabsContent>}{allowed.includes("timeline") && <TabsContent value="timeline" className="pt-6"><Card className="border-[1.5px]"><CardHeader><CardTitle className="text-sm">Status Timeline</CardTitle></CardHeader><CardContent><OrderHistoryTimeline orderId={orderId} /></CardContent></Card></TabsContent>}</Tabs>;
}

function BudgetProgressNotice({ state, budget }: { state: "loading" | "unavailable" | "unconfigured"; budget: DetailController["resources"]["budget"] }) {
  if (state === "loading") return <p className="text-xs text-muted-foreground" role="status">Consultando saldo da verba do PA…</p>;
  if (state === "unconfigured") return <Alert><AlertCircle className="h-4 w-4" /><AlertDescription className="text-xs">Verba não configurada para esta competência. Não há saldo nem limite financeiro confirmados.</AlertDescription></Alert>;
  const message = budget.targetPaId
    ? "Não foi possível consultar a verba. O saldo não foi presumido."
    : "Não foi possível identificar o PA para consultar a verba.";
  return <Alert variant="destructive" role="alert"><AlertCircle className="h-4 w-4" /><AlertDescription className="text-xs">{message}{budget.targetPaId && <Button type="button" variant="link" size="sm" className="h-auto px-1" onClick={() => void budget.refetch()}>Tentar novamente</Button>}</AlertDescription></Alert>;
}

function ConfiguredBudgetProgress({ controller }: { controller: DetailController }) {
  const budget = controller.resources.budget;
  const totalBudget = Math.max(budget.budget?.verba_total ?? 1, 1);
  const orderWidth = Math.min((controller.orderTotal / totalBudget) * 100, 100);
  const remainingLeft = Math.min(((budget.remainingBudget - controller.orderTotal) / totalBudget) * 100, 100);
  return <div className="space-y-3"><div className="flex justify-between text-xs items-center"><span>Verba PA Disponível</span><span className={controller.isOverBudget ? "text-destructive font-bold flex items-center gap-1" : "text-success font-bold"}>{controller.isOverBudget && <AlertTriangle className="h-3 w-3" />}R$ {budget.remainingBudget.toLocaleString("pt-BR")}</span></div><div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden relative"><div className={cn("h-full transition-all duration-500", controller.isOverBudget ? "bg-destructive" : "bg-success")} style={{ width: `${orderWidth}%` }} /><div className="absolute top-0 h-full bg-primary/30 animate-pulse" style={{ left: `${remainingLeft}%`, width: `${orderWidth}%` }} /></div><p className="text-[10px] text-muted-foreground flex justify-between"><span>Impacto do Pedido: R$ {controller.orderTotal.toLocaleString("pt-BR")}</span><span>Total Verba: R$ {(budget.budget?.verba_total ?? 0).toLocaleString("pt-BR")}</span></p></div>;
}

function BudgetProgress({ controller }: { controller: DetailController }) {
  const budget = controller.resources.budget;
  const state = resolvePaBudgetState({
    isLoading: budget.isLoading,
    hasError: Boolean(budget.error),
    hasPaId: Boolean(budget.targetPaId),
    hasBudget: hasConfiguredPaBudget(budget.budget),
  });
  if (state === "configured") return <ConfiguredBudgetProgress controller={controller} />;
  return <BudgetProgressNotice state={state} budget={budget} />;
}

function ProductionCard({ controller }: { controller: DetailController }) {
  const order = controller.order;
  if (!order) return null;
  return <Card><CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Produção e Logística</CardTitle></CardHeader><CardContent className="space-y-4">{controller.canManageFulfillment && <div className="space-y-2"><Label className="text-xs">Status do Workflow</Label><Select value={order.status} onValueChange={value => controller.actions.updateStatus(value as OrderStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(ORDER_STATUS_CONFIG).map(([value, config]) => <SelectItem key={value} value={value} disabled={!canTransitionTo(order.status, value as OrderStatus)}>{config.label}</SelectItem>)}</SelectContent></Select></div>}<div className="flex items-center justify-between text-sm pt-2 border-t"><span className="text-muted-foreground flex items-center gap-2"><AlertCircle className="h-4 w-4" />Limite de Alçada</span><span className="font-bold">R$ {controller.resources.threshold.threshold.toLocaleString("pt-BR")}</span></div><BudgetProgress controller={controller} />{controller.isOverBudget === true ? <Alert variant="destructive" className="py-2 bg-destructive/10 border-destructive/20"><AlertCircle className="h-4 w-4" /><AlertDescription className="text-xs font-medium">Overbudget detectado.</AlertDescription></Alert> : controller.isOverBudget === false ? <div className="p-3 bg-success/10 border border-success/20 rounded-lg"><p className="text-xs text-success font-medium flex items-center gap-1"><CheckCircle className="h-3 w-3" />Dentro da alçada e verba disponível.</p></div> : null}</CardContent></Card>;
}

function IntelligenceSidebar({ controller }: { controller: DetailController }) {
  const order = controller.order;
  if (!order) return null;
  return <div className="space-y-6"><OrderBudgetIntelligence orderTotal={controller.orderTotal} remainingBudget={controller.resources.budget.remainingBudget} allocatedBudget={controller.resources.budget.budget?.verba_total ?? null} paName={order.pa?.nome || "PA Sicoob"} competenceLabel={controller.resources.budget.competenceLabel ?? undefined} isLoading={controller.resources.budget.isLoading} hasError={Boolean(controller.resources.budget.error)} hasPaId={Boolean(controller.resources.budget.targetPaId)} onRetry={() => void controller.resources.budget.refetch()} orderStatus={order.status} /><LogisticsCommandCenter orderId={controller.orderId} trackingCode={order.tracking_code} status={order.status} /></div>;
}

export default function OrderDetailPage() {
  const controller = useOrderDetailController();
  if (controller.resources.orderQuery.isLoading) return <div className="flex items-center justify-center h-64"><p>Carregando detalhes do pedido...</p></div>;
  if (!controller.order) return null;
  return <><PageSEO title={`Pedido #${controller.order.order_number || controller.orderId} - Sicoob`} description="Detalhes do pedido Sicoob." path={`/sicoob/pedidos/${controller.orderId}`} noIndex /><div className="space-y-6"><OrderAlerts controller={controller} /><DetailHeader controller={controller} /><OrderProductionReadiness orderId={controller.order.id} orderStatus={controller.order.status} requiresArtwork={controller.order.requires_artwork} /><div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2 space-y-6"><OrderItemsCard controller={controller} /><DetailTabs controller={controller} /></div><div className="space-y-6"><ProductionCard controller={controller} /></div><IntelligenceSidebar controller={controller} /></div></div></>;
}
