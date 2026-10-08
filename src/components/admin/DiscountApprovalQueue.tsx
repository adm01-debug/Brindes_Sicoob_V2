/**
 * DiscountApprovalQueue — fila administrativa de solicitações de desconto pendentes.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { logAdminAction } from "@/utils/adminAudit";
import type { Database } from "@/integrations/supabase/types";

type DiscountApprovalRequest = Database["public"]["Tables"]["discount_approval_requests"]["Row"] & {
  quotes?: {
    quote_number?: string | null;
    client_name?: string | null;
    client_company?: string | null;
    total?: number | null;
    subtotal?: number | null;
    discount_percent?: number | null;
    negotiation_markup_percent?: number | null;
    real_subtotal?: number | null;
    real_discount_percent?: number | null;
  } | null;
};

interface DiscountRequestCardProps {
  notes: string;
  onNotesChange: (notes: string) => void;
  onRespond: (approved: boolean) => void;
  pending: boolean;
  request: DiscountApprovalRequest;
}

type QuoteSummary = NonNullable<DiscountApprovalRequest["quotes"]>;

function DiscountHeader({ quote, hasMarkup, apparent, realPct, markup, limit }: {
  quote?: QuoteSummary | null; hasMarkup: boolean; apparent: number; realPct: number; markup: number; limit: number;
}) {
  const title = hasMarkup
    ? `Real: ${realPct.toFixed(2)}% · Aparente: ${apparent.toFixed(1)}% · Markup: +${markup.toFixed(1)}%`
    : undefined;
  return (
    <CardHeader className="pb-3"><CardTitle className="text-base flex items-center justify-between gap-2 flex-wrap">
      <span>Orçamento {quote?.quote_number ?? "—"}</span>
      <div className="flex gap-1.5 flex-wrap">
        {hasMarkup && <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">Aparente {apparent.toFixed(1)}%</Badge>}
        <Badge variant="destructive" title={title}>{hasMarkup ? `Real ${realPct.toFixed(1)}%` : `${realPct.toFixed(1)}%`} (limite {limit}%)</Badge>
      </div>
    </CardTitle></CardHeader>
  );
}

function ClientSummary({ quote }: { quote?: QuoteSummary | null }) {
  const client = quote?.client_name || quote?.client_company || "—";
  return (
    <p className="text-sm text-muted-foreground">
      Cliente: <strong>{client}</strong>
      {quote?.total !== null && quote?.total !== undefined && <> · Total: <strong>R$ {Number(quote.total).toFixed(2)}</strong></>}
    </p>
  );
}

function MarkupSummary({ quote, apparent, realPct, markup }: {
  quote?: QuoteSummary | null; apparent: number; realPct: number; markup: number;
}) {
  if (markup <= 0) return null;
  return (
    <div className="text-xs bg-warning/5 border border-warning/20 rounded-md p-2 space-y-0.5">
      <p className="font-medium text-warning">⚠️ Margem de negociação aplicada (+{markup.toFixed(1)}%)</p>
      <p className="text-muted-foreground">Cliente vê subtotal R$ {Number(quote?.subtotal ?? 0).toFixed(2)} com {apparent.toFixed(1)}% off. Real: R$ {Number(quote?.real_subtotal ?? 0).toFixed(2)} → desconto efetivo <strong>{realPct.toFixed(2)}%</strong>.</p>
    </div>
  );
}

function SellerNotes({ notes }: { notes?: string | null }) {
  if (!notes) return null;
  return <p className="text-sm bg-muted/40 rounded p-2">📝 {notes}</p>;
}

function DiscountRequestCard({ notes, onNotesChange, onRespond, pending, request }: DiscountRequestCardProps) {
  const quote = request.quotes;
  const markup = Number(quote?.negotiation_markup_percent ?? 0);
  const apparent = Number(quote?.discount_percent ?? 0);
  const realPct = Number(quote?.real_discount_percent ?? request.requested_discount_percent);
  const hasMarkup = markup > 0;

  return (
    <Card>
      <DiscountHeader quote={quote} hasMarkup={hasMarkup} apparent={apparent} realPct={realPct}
        markup={markup} limit={request.max_allowed_percent} />
      <CardContent className="space-y-3">
        <ClientSummary quote={quote} />
        <MarkupSummary quote={quote} apparent={apparent} realPct={realPct} markup={markup} />
        <SellerNotes notes={request.seller_notes} />
        <Textarea placeholder="Notas (opcional)" value={notes} onChange={(event) => onNotesChange(event.target.value)} rows={2} />
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10" onClick={() => onRespond(false)} disabled={pending}><XCircle className="h-4 w-4 mr-2" /> Recusar</Button>
          <Button onClick={() => onRespond(true)} disabled={pending}><CheckCircle2 className="h-4 w-4 mr-2" /> Aprovar</Button>
        </div>
      </CardContent>
    </Card>
  );
}

async function fetchDiscountApprovalQueue() {
  const { data, error } = await supabase
    // rls-allow: fila exclusiva de supervisor; policy valida a cooperativa
    .from("discount_approval_requests")
    .select("*, quotes:quote_id(quote_number, client_name, client_company, total, subtotal, discount_percent, negotiation_markup_percent, real_subtotal, real_discount_percent)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

async function respondToDiscount({ id, approved, request, notes }: { id: string; approved: boolean; request: DiscountApprovalRequest; notes: string | undefined }) {
  const { data: user } = await supabase.auth.getUser();
  const status = approved ? "approved" : "rejected";
  const { error } = await supabase
    // rls-allow: decisão por solicitação; policy valida supervisor e escopo
    .from("discount_approval_requests")
    .update({ status, admin_id: user.user?.id ?? null, admin_notes: notes ?? null, responded_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  await logAdminAction({
    event_type: approved ? 'APPROVE_CHANGE' : 'REJECT_CHANGE',
    entity_type: 'discount_approval_requests',
    entity_id: id,
    payload: { status, notes },
    metadata: { quote_number: request.quotes?.quote_number ?? null, requested_discount: request.requested_discount_percent },
  });
}

function useDiscountApprovalQueue(notes: Record<string, string>) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["discount-approval-queue"], queryFn: fetchDiscountApprovalQueue });
  const respond = useMutation({
    mutationFn: ({ id, approved, request }: { id: string; approved: boolean; request: DiscountApprovalRequest }) => respondToDiscount({ id, approved, request, notes: notes[id] }),
    onSuccess: () => { toast.success("Resposta registrada"); queryClient.invalidateQueries({ queryKey: ["discount-approval-queue"] }); },
    onError: (error: Error) => toast.error(error.message),
  });
  return { ...query, respond };
}

export function DiscountApprovalQueue() {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const { data, isLoading, respond } = useDiscountApprovalQueue(notes);

  if (isLoading) {
    return <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-32" />)}</div>;
  }

  if (!data?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ShieldAlert className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma solicitação pendente.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((request) => (
        <DiscountRequestCard key={request.id} request={request} notes={notes[request.id] ?? ""}
          onNotesChange={(value) => setNotes((current) => ({ ...current, [request.id]: value }))}
          onRespond={(approved) => respond.mutate({ id: request.id, approved, request })}
          pending={respond.isPending} />
      ))}
    </div>
  );
}
