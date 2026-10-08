import { useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Layers, Loader2, PackageCheck, Truck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { normalizeAssignedRoles } from "@/lib/access/role-policy";
import {
  getConsolidationIntent,
  getDeliveryReceiptIntent,
  validateDeliveryReceiptInput,
} from "@/lib/sicoob/consolidation-intent";

interface Allocation {
  id: string;
  quantity: number;
  received_quantity: number;
  damaged_quantity: number;
  missing_quantity: number;
  sicoob_order_items: { product_name: string; product_sku: string | null } | null;
}

interface Destination {
  id: string;
  pa_id: string;
  destination_name: string;
  address_snapshot: Record<string, unknown>;
  sicoob_delivery_allocations: Allocation[];
}

interface Consolidation {
  id: string;
  vendedor_id: string;
  order_count: number;
  total_value: number;
  status: string;
  created_at: string | null;
  received_at: string | null;
  order_consolidation_orders: Array<{ order_id: string }>;
  sicoob_delivery_destinations: Destination[];
}

interface EligibleOrder {
  id: string;
  total_amount: number | null;
  postos_atendimento: { nome: string } | null;
}

const statusLabel: Record<string, string> = {
  draft: "Rascunho",
  pending_seller: "Pronto para despacho",
  in_production: "Em produção",
  sent: "Despachado",
  partially_received: "Recebimento parcial",
  received: "Recebido",
  received_with_issues: "Recebido com divergência",
};

function progressOf(consolidation: Consolidation) {
  const allocations = consolidation.sicoob_delivery_destinations.flatMap((destination) => destination.sicoob_delivery_allocations);
  const expected = allocations.reduce((sum, allocation) => sum + allocation.quantity, 0);
  const accounted = allocations.reduce(
    (sum, allocation) => sum + allocation.received_quantity + allocation.damaged_quantity + allocation.missing_quantity,
    0,
  );
  return { expected, accounted, percent: expected > 0 ? Math.min(100, (accounted / expected) * 100) : 0 };
}

function ManagementOnly({ allowed, children }: { allowed: boolean; children: ReactNode }) {
  return allowed ? <>{children}</> : null;
}

function getReceiptFormState(
  allocation: Allocation | null,
  input: { received: number; damaged: number; missing: number; notes: string },
) {
  if (!allocation) return { remaining: 0, error: null };
  const remaining = allocation.quantity
    - allocation.received_quantity
    - allocation.damaged_quantity
    - allocation.missing_quantity;
  return { remaining, error: validateDeliveryReceiptInput({ ...input, remaining }) };
}

function assertDistributionResult(value: unknown): void {
  if (!Number.isInteger(value) || Number(value) < 1) {
    throw new Error("O banco não confirmou itens nos destinos.");
  }
}

function assertReceiptInput(input: Parameters<typeof validateDeliveryReceiptInput>[0]): void {
  const error = validateDeliveryReceiptInput(input);
  if (error) throw new Error(error);
}

function ReceiptValidationMessage({ error, remaining }: { error: string | null; remaining: number }) {
  if (error) return <p className="text-sm text-destructive" role="alert">{error}</p>;
  return <p className="text-sm text-muted-foreground">Saldo pendente: {remaining} unidade(s).</p>;
}

export default function GestorConsolidatedOrdersPage() {
  const queryClient = useQueryClient();
  const { roles } = useAuth();
  const normalizedRoles = normalizeAssignedRoles(roles);
  const canManage = normalizedRoles.some((role) => ['dev', 'supervisor', 'gestor_compras', 'comprador_singular'].includes(role));
  const createIntentRef = useRef<{ signature: string; key: string } | null>(null);
  const receiptIntentRef = useRef<{ signature: string; key: string } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [sellerId, setSellerId] = useState("");
  const [receiptAllocation, setReceiptAllocation] = useState<Allocation | null>(null);
  const [received, setReceived] = useState(0);
  const [damaged, setDamaged] = useState(0);
  const [missing, setMissing] = useState(0);
  const [notes, setNotes] = useState("");
  const receiptFormState = getReceiptFormState(receiptAllocation, { received, damaged, missing, notes });

  const consolidationsQuery = useQuery({
    queryKey: ["sicoob-consolidations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_consolidations")
        .select(`
          id, vendedor_id, order_count, total_value, status, created_at, received_at,
          order_consolidation_orders(order_id),
          sicoob_delivery_destinations(
            id, pa_id, destination_name, address_snapshot,
            sicoob_delivery_allocations(
              id, quantity, received_quantity, damaged_quantity, missing_quantity,
              sicoob_order_items(product_name, product_sku)
            )
          )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Consolidation[];
    },
  });

  const eligibleOrdersQuery = useQuery({
    queryKey: ["sicoob-orders", "eligible-for-consolidation"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sicoob_orders")
        .select("id, total_amount, postos_atendimento(nome)")
        .eq("status", "confirmed")
        .is("consolidation_id", null)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as EligibleOrder[];
    },
    enabled: canManage,
  });

  const sellersQuery = useQuery({
    queryKey: ["sicoob-consolidation-sellers"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_sicoob_consolidation_sellers");
      if (error) throw error;
      return data ?? [];
    },
    enabled: canManage,
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["sicoob-consolidations"] }),
      queryClient.invalidateQueries({ queryKey: ["sicoob-orders"] }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (selectedOrders.size === 0 || !sellerId) throw new Error("Selecione pedidos e um vendedor.");
      createIntentRef.current = getConsolidationIntent(createIntentRef.current, sellerId, [...selectedOrders]);
      const { data, error } = await supabase.rpc("create_sicoob_order_consolidation", {
        p_order_ids: [...selectedOrders],
        p_seller_id: sellerId,
        p_idempotency_key: createIntentRef.current.key,
      });
      if (error) throw error;
      if (!data) throw new Error("O banco não confirmou a consolidação.");
      return data;
    },
    onSuccess: async () => {
      await invalidate();
      setCreateOpen(false);
      setSelectedOrders(new Set());
      setSellerId("");
      createIntentRef.current = null;
      toast.success("Pedidos consolidados e distribuídos por destino.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível consolidar os pedidos."),
  });

  const dispatchMutation = useMutation({
    mutationFn: async (consolidationId: string) => {
      const { error } = await supabase.rpc("dispatch_sicoob_order_consolidation", { p_consolidation_id: consolidationId });
      if (error) throw error;
    },
    onSuccess: async () => {
      await invalidate();
      toast.success("Consolidação marcada como despachada.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível despachar."),
  });

  const refreshDistributionMutation = useMutation({
    mutationFn: async (consolidationId: string) => {
      const { data, error } = await supabase.rpc("allocate_sicoob_consolidation_by_order_pa", {
        p_consolidation_id: consolidationId,
      });
      if (error) throw error;
      assertDistributionResult(data);
    },
    onSuccess: async () => {
      await invalidate();
      toast.success("Destinos e endereços atualizados.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível atualizar os destinos."),
  });

  const receiptMutation = useMutation({
    mutationFn: async () => {
      if (!receiptAllocation) throw new Error("Selecione um item de destino.");
      assertReceiptInput({
        received,
        damaged,
        missing,
        notes,
        remaining: receiptFormState.remaining,
      });
      receiptIntentRef.current = getDeliveryReceiptIntent(receiptIntentRef.current, {
        allocationId: receiptAllocation.id,
        received,
        damaged,
        missing,
        notes,
      });
      const { data, error } = await supabase.rpc("record_sicoob_delivery_receipt", {
        p_allocation_id: receiptAllocation.id,
        p_idempotency_key: receiptIntentRef.current.key,
        p_received_quantity: received,
        p_damaged_quantity: damaged,
        p_missing_quantity: missing,
        p_notes: notes.trim() || undefined,
      });
      if (error) throw error;
      if (!data) throw new Error("O banco não confirmou o recebimento.");
    },
    onSuccess: async () => {
      await invalidate();
      setReceiptAllocation(null);
      setReceived(0);
      setDamaged(0);
      setMissing(0);
      setNotes("");
      receiptIntentRef.current = null;
      toast.success("Recebimento registrado com rastreabilidade.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível registrar o recebimento."),
  });

  const consolidations = useMemo(() => consolidationsQuery.data ?? [], [consolidationsQuery.data]);
  const summary = useMemo(
    () =>
      consolidations.reduce(
        (acc, item) => {
          const value = Number(item.total_value || 0);
          if (item.status === "pending_seller") acc.pending += value;
          if (item.status === "sent" || item.status === "partially_received") acc.transit += value;
          if (item.status === "received" || item.status === "received_with_issues") acc.received += value;
          return acc;
        },
        { pending: 0, transit: 0, received: 0 },
      ),
    [consolidations],
  );

  const toggleOrder = (orderId: string) => {
    setSelectedOrders((current) => {
      const next = new Set(current);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  return (
    <div className="container mx-auto space-y-6 p-6 animate-fade-in">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-sicoob-green-dark">Agregados da Singular</h1>
          <p className="text-muted-foreground">Consolide pedidos, distribua por PA e acompanhe recebimentos e divergências.</p>
        </div>
        <ManagementOnly allowed={canManage}>
          <Button className="gap-2" onClick={() => setCreateOpen(true)}>
            <Layers className="h-4 w-4" /> Nova consolidação
          </Button>
        </ManagementOnly>
      </div>

      {(consolidationsQuery.error || eligibleOrdersQuery.error || sellersQuery.error) && (
        <Card className="border-destructive/40 bg-destructive/5" role="alert">
          <CardContent className="flex items-center gap-3 py-4 text-sm text-destructive">
            <AlertCircle className="h-5 w-5" /> Não foi possível carregar todos os dados de consolidação.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <SummaryCard title="Prontos para despacho" value={summary.pending} />
        <SummaryCard title="Em trânsito/parcial" value={summary.transit} />
        <SummaryCard title="Recebidos" value={summary.received} />
      </div>

      <ConsolidationList
        consolidations={consolidations}
        isLoading={consolidationsQuery.isLoading}
        isDispatching={dispatchMutation.isPending}
        isRefreshing={refreshDistributionMutation.isPending}
        onDispatch={(id) => dispatchMutation.mutate(id)}
        onRefresh={(id) => refreshDistributionMutation.mutate(id)}
        canDispatch={canManage}
        onReceive={(allocation, remaining) => {
          setReceiptAllocation(allocation);
          setReceived(remaining);
        }}
      />

      <Dialog open={createOpen} onOpenChange={(open) => {
        setCreateOpen(open);
        if (!open && !createMutation.isPending) createIntentRef.current = null;
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova consolidação</DialogTitle>
            <DialogDescription>Somente pedidos confirmados e ainda não consolidados podem compor o lote.</DialogDescription>
          </DialogHeader>
          <EligibleOrderList
            isLoading={eligibleOrdersQuery.isLoading}
            orders={eligibleOrdersQuery.data ?? []}
            selectedOrders={selectedOrders}
            onToggle={toggleOrder}
          />
          <div className="space-y-2">
            <Label>Vendedor responsável</Label>
            <Select value={sellerId} onValueChange={setSellerId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o vendedor" />
              </SelectTrigger>
              <SelectContent>
                {(sellersQuery.data ?? []).map((seller) => (
                  <SelectItem key={seller.id} value={seller.id}>{seller.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); createIntentRef.current = null; }}>Cancelar</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || selectedOrders.size === 0 || !sellerId}
            >
              {createMutation.isPending ? "Consolidando…" : `Consolidar ${selectedOrders.size} pedido(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(receiptAllocation)} onOpenChange={(open) => {
        if (!open && !receiptMutation.isPending) {
          setReceiptAllocation(null);
          receiptIntentRef.current = null;
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar recebimento</DialogTitle>
            <DialogDescription>As quantidades são acumuladas e cada lançamento gera um evento imutável.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="received">Recebidas</Label>
              <Input id="received" type="number" min={0} max={receiptFormState.remaining} step={1} value={received} onChange={(event) => setReceived(Number(event.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="damaged">Avariadas</Label>
              <Input id="damaged" type="number" min={0} max={receiptFormState.remaining} step={1} value={damaged} onChange={(event) => setDamaged(Number(event.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="missing">Faltantes</Label>
              <Input id="missing" type="number" min={0} max={receiptFormState.remaining} step={1} value={missing} onChange={(event) => setMissing(Number(event.target.value))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="receipt-notes">Observação da divergência</Label>
            <Input id="receipt-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Obrigatória para avaria ou falta" />
          </div>
          <ReceiptValidationMessage {...receiptFormState} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReceiptAllocation(null); receiptIntentRef.current = null; }}>Cancelar</Button>
            <Button onClick={() => receiptMutation.mutate()} disabled={receiptMutation.isPending || Boolean(receiptFormState.error)}>Registrar recebimento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EligibleOrderList({
  isLoading,
  orders,
  selectedOrders,
  onToggle,
}: {
  isLoading: boolean;
  orders: EligibleOrder[];
  selectedOrders: Set<string>;
  onToggle: (orderId: string) => void;
}) {
  if (isLoading) return <Loader2 className="mx-auto h-6 w-6 animate-spin" />;
  if (orders.length === 0) {
    return <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhum pedido elegível.</p>;
  }
  return (
    <div className="max-h-72 space-y-2 overflow-y-auto">
      {orders.map((order) => (
        <label key={order.id} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3">
          <Checkbox checked={selectedOrders.has(order.id)} onCheckedChange={() => onToggle(order.id)} />
          <span className="flex-1 text-sm">
            #{order.id.slice(0, 8)} · {order.postos_atendimento?.nome || "PA não identificada"}
          </span>
          <strong className="text-sm">{formatCurrency(Number(order.total_amount || 0))}</strong>
        </label>
      ))}
    </div>
  );
}

function ConsolidationList({
  consolidations,
  isLoading,
  isDispatching,
  isRefreshing,
  onDispatch,
  onRefresh,
  canDispatch,
  onReceive,
}: {
  consolidations: Consolidation[];
  isLoading: boolean;
  isDispatching: boolean;
  isRefreshing: boolean;
  onDispatch: (id: string) => void;
  onRefresh: (id: string) => void;
  canDispatch: boolean;
  onReceive: (allocation: Allocation, remaining: number) => void;
}) {
  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>;
  if (consolidations.length === 0) {
    return <Card><CardContent className="p-12 text-center text-sm text-muted-foreground">Nenhuma consolidação registrada para este contexto.</CardContent></Card>;
  }
  return <>{consolidations.map((consolidation) => (
    <ConsolidationCard
      key={consolidation.id}
      consolidation={consolidation}
      isDispatching={isDispatching}
      isRefreshing={isRefreshing}
      onDispatch={onDispatch}
      onRefresh={onRefresh}
      canDispatch={canDispatch}
      onReceive={onReceive}
    />
  ))}</>;
}

function ConsolidationCard({
  consolidation,
  isDispatching,
  isRefreshing,
  onDispatch,
  onRefresh,
  canDispatch,
  onReceive,
}: {
  consolidation: Consolidation;
  isDispatching: boolean;
  isRefreshing: boolean;
  onDispatch: (id: string) => void;
  onRefresh: (id: string) => void;
  canDispatch: boolean;
  onReceive: (allocation: Allocation, remaining: number) => void;
}) {
  const [progress, mayReceive] = [progressOf(consolidation), ["sent", "partially_received"].includes(consolidation.status)];
  return (
    <Card className="border-[1.5px]">
      <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
            Lote #{consolidation.id.slice(0, 8)}
            <Badge variant="outline">{statusLabel[consolidation.status] || consolidation.status}</Badge>
          </CardTitle>
          <CardDescription>
            {consolidation.order_count} pedido(s) · {formatCurrency(Number(consolidation.total_value))} · {consolidation.sicoob_delivery_destinations.length} destino(s)
          </CardDescription>
        </div>
        <PendingDispatchActions
          visible={canDispatch && consolidation.status === "pending_seller"}
          consolidationId={consolidation.id}
          isDispatching={isDispatching}
          isRefreshing={isRefreshing}
          onDispatch={onDispatch}
          onRefresh={onRefresh}
        />
      </CardHeader>
      <CardContent className="space-y-5">
        <ConsolidationProgress progress={progress} />
        <div className="grid gap-4 xl:grid-cols-2">
          {consolidation.sicoob_delivery_destinations.map((destination) => (
            <DestinationCard key={destination.id} destination={destination} mayReceive={mayReceive} onReceive={onReceive} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ConsolidationProgress({ progress }: { progress: ReturnType<typeof progressOf> }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Recebimento conciliado</span><span>{progress.accounted}/{progress.expected} unidades</span>
      </div>
      <Progress value={progress.percent} className="h-2" />
    </div>
  );
}

function PendingDispatchActions({
  visible,
  consolidationId,
  isDispatching,
  isRefreshing,
  onDispatch,
  onRefresh,
}: {
  visible: boolean;
  consolidationId: string;
  isDispatching: boolean;
  isRefreshing: boolean;
  onDispatch: (id: string) => void;
  onRefresh: (id: string) => void;
}) {
  if (!visible) return null;
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => onRefresh(consolidationId)} disabled={isRefreshing || isDispatching}>
        Atualizar destinos
      </Button>
      <Button size="sm" className="gap-2" onClick={() => onDispatch(consolidationId)} disabled={isDispatching || isRefreshing}>
        <Truck className="h-4 w-4" /> Confirmar despacho
      </Button>
    </div>
  );
}

function getDestinationProgress(destination: Destination) {
  return destination.sicoob_delivery_allocations.reduce(
    (summary, allocation) => ({
      expected: summary.expected + allocation.quantity,
      accounted: summary.accounted
        + allocation.received_quantity
        + allocation.damaged_quantity
        + allocation.missing_quantity,
    }),
    { expected: 0, accounted: 0 },
  );
}

function getDestinationAddress(destination: Destination): string {
  return [
    destination.address_snapshot.endereco,
    destination.address_snapshot.cidade,
    destination.address_snapshot.uf,
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0).join(" · ");
}

function DestinationCard({ destination, mayReceive, onReceive }: {
  destination: Destination;
  mayReceive: boolean;
  onReceive: (allocation: Allocation, remaining: number) => void;
}) {
  const destinationProgress = getDestinationProgress(destination);
  const address = getDestinationAddress(destination);
  return (
    <div className="rounded-xl border bg-muted/20 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <div className="font-semibold">{destination.destination_name}</div>
          {address && <div className="text-xs text-muted-foreground">{address}</div>}
        </div>
        <Badge variant="secondary">{destinationProgress.accounted}/{destinationProgress.expected} conciliadas</Badge>
      </div>
      <div className="space-y-2">
        {destination.sicoob_delivery_allocations.map((allocation) => {
          const accounted = allocation.received_quantity + allocation.damaged_quantity + allocation.missing_quantity;
          const remaining = allocation.quantity - accounted;
          return (
            <div key={allocation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-background p-3 text-sm">
              <div>
                <div className="font-medium">{allocation.sicoob_order_items?.product_name || "Item do pedido"}</div>
                <div className="text-xs text-muted-foreground">
                  {allocation.received_quantity} recebida(s) · {allocation.damaged_quantity} avariada(s) · {allocation.missing_quantity} faltante(s) · {remaining} pendente(s)
                </div>
              </div>
              {mayReceive && remaining > 0 && (
                <Button variant="outline" size="sm" onClick={() => onReceive(allocation, remaining)}>
                  <PackageCheck className="mr-2 h-4 w-4" /> Receber
                </Button>
              )}
              {remaining === 0 && <CheckCircle2 className="h-5 w-5 text-success" aria-label="Item conciliado" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SummaryCard({ title, value }: { title: string; value: number }) {
  return (
    <Card className="border-[1.5px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatCurrency(value)}</div>
      </CardContent>
    </Card>
  );
}
