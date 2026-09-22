import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageSEO } from "@/components/seo/PageSEO";
import { toast } from "sonner";

interface Delivery {
  id: string;
  request_id: string;
  event_kind: string;
  channel: string;
  destination_label: string;
  state: "uncertain" | "failed";
  attempts: number;
  last_error_code: string | null;
  updated_at: string;
}

interface WorkerHealth { failed_24h: number; queued: number; oldest_queued_seconds: number; deliveries_delayed: number; unresolved_deliveries: number; healthy: boolean }

async function invoke(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("sicoob-approval-reconciliation", { body });
  if (error) throw error;
  return data;
}

function DeliveryCard({ delivery }: { delivery: Delivery }) {
  const client = useQueryClient();
  const [reason, setReason] = useState("");
  const [providerId, setProviderId] = useState("");
  const mutation = useMutation({
    mutationFn: (resolution: "delivered" | "requeue") => invoke({
      action: "reconcile",
      deliveryId: delivery.id,
      resolution,
      reason,
      providerId: resolution === "delivered" ? providerId : null,
    }),
    onSuccess: async () => {
      toast.success("Entrega reconciliada com trilha de auditoria.");
      await client.invalidateQueries({ queryKey: ["sicoob-approval-reconciliation"] });
    },
    onError: () => toast.error("Não foi possível reconciliar esta entrega."),
  });
  const reasonValid = reason.trim().length >= 10;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div><CardTitle className="text-base">{delivery.channel.toUpperCase()} · {delivery.event_kind}</CardTitle><CardDescription>{delivery.destination_label}</CardDescription></div>
          <Badge variant={delivery.state === "failed" ? "destructive" : "secondary"}>{delivery.state === "failed" ? "Falha" : "Resultado incerto"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-1 text-xs text-muted-foreground">
          <span>Solicitação: {delivery.request_id}</span><span>Tentativas: {delivery.attempts}</span><span>Código: {delivery.last_error_code ?? "não informado"}</span><span>Atualização: {new Date(delivery.updated_at).toLocaleString("pt-BR")}</span>
        </div>
        <div className="grid gap-2"><Label htmlFor={`reason-${delivery.id}`}>Motivo da decisão</Label><Textarea id={`reason-${delivery.id}`} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} placeholder="Descreva a conferência feita no provedor." /></div>
        <div className="grid gap-2"><Label htmlFor={`provider-${delivery.id}`}>Recibo do provedor</Label><Input id={`provider-${delivery.id}`} value={providerId} onChange={(event) => setProviderId(event.target.value)} maxLength={200} placeholder="Obrigatório ao confirmar entrega" /></div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => mutation.mutate("delivered")} disabled={mutation.isPending || !reasonValid || !providerId.trim()}><CheckCircle2 className="mr-2 h-4 w-4" />Confirmar entrega</Button>
          <Button variant="outline" onClick={() => mutation.mutate("requeue")} disabled={mutation.isPending || !reasonValid}><RefreshCw className="mr-2 h-4 w-4" />Criar nova tentativa</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SicoobApprovalReconciliationPage() {
  const query = useQuery({
    queryKey: ["sicoob-approval-reconciliation"],
    queryFn: async () => (await invoke({ action: "list" })) as { deliveries: Delivery[]; workerHealth: WorkerHealth },
    refetchInterval: 60_000,
  });
  return (
    <main className="container mx-auto max-w-5xl space-y-6 p-6">
      <PageSEO title="Reconciliação de notificações Sicoob" description="Confirme ou reprocesse entregas com resultado incerto." />
      <div><h1 className="text-2xl font-bold">Reconciliação de notificações</h1><p className="text-muted-foreground">Analise o provedor antes de confirmar uma entrega ou criar uma nova geração.</p></div>
      {query.data?.workerHealth && <Card><CardContent className="flex flex-wrap gap-4 p-4 text-sm"><Badge variant={query.data.workerHealth.healthy ? "secondary" : "destructive"}>{query.data.workerHealth.healthy ? "Worker saudável" : "Worker requer atenção"}</Badge><span>Falhas em 24h: {query.data.workerHealth.failed_24h}</span><span>Na fila: {query.data.workerHealth.queued}</span><span>Entregas atrasadas: {query.data.workerHealth.deliveries_delayed}</span><span>Reconciliações pendentes: {query.data.workerHealth.unresolved_deliveries}</span></CardContent></Card>}
      {query.isLoading && <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Carregando fila...</div>}
      {query.isError && <Card><CardContent className="flex items-center gap-2 p-6 text-destructive"><AlertTriangle className="h-5 w-5" />Não foi possível consultar a fila.</CardContent></Card>}
      {query.data?.deliveries.length === 0 && <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhuma entrega exige reconciliação.</CardContent></Card>}
      <div className="grid gap-4">{query.data?.deliveries.map((delivery) => <DeliveryCard key={delivery.id} delivery={delivery} />)}</div>
    </main>
  );
}
