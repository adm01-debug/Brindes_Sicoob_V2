/**
 * QuoteApprovalPage — página pública para o cliente visualizar e aprovar/recusar orçamento via token.
 */
import { useParams } from "react-router-dom";
import { useState } from "react";
import { useQuoteApprovalToken } from "@/hooks/useQuoteApprovalToken";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { QuoteApprovalCard } from "@/components/quotes/QuoteApprovalCard";
import { QuoteSignaturePad } from "@/components/quotes/QuoteSignaturePad";
import { PageSEO } from "@/components/seo/PageSEO";
import { toast } from "sonner";

export default function QuoteApprovalPage() {
  const { token } = useParams<{ token: string }>();
  const { data: quote, isLoading, isError } = useQuoteApprovalToken(token);
  const [pendingResponse, setPendingResponse] = useState<"approved" | "rejected" | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) return <Skeleton className="max-w-2xl mx-auto mt-12 h-72" />;

  if (isError) {
    return (
      <div className="container mx-auto p-12 text-center">
        <PageSEO title="Serviço indisponível" description="Não foi possível consultar o orçamento" />
        <p className="text-muted-foreground">Não foi possível consultar o orçamento. Tente novamente em instantes.</p>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="container mx-auto p-12 text-center">
        <PageSEO title="Link inválido" description="Token de aprovação inválido ou expirado" />
        <p className="text-muted-foreground">Link inválido ou expirado.</p>
      </div>
    );
  }

  const isResponded = !!quote.responded_at || submitted;

  const handleSign = async (sigData: { name: string; document: string; signatureDataUrl: string }) => {
    if (!pendingResponse || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("quote-approval", {
        body: {
          action: "respond",
          token,
          status: pendingResponse,
          signer: sigData,
        },
      });
      if (error) throw error;
      if (data?.success !== true) throw new Error("O link expirou, foi revogado ou já recebeu uma resposta. Atualize a página.");

      setSubmitted(true);
      toast.success("Resposta registrada com sucesso");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao registrar");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl p-6 space-y-6">
      <PageSEO title={`Aprovar orçamento ${quote.quote_number}`} description="Aprove ou recuse o orçamento enviado a você." />
      <QuoteApprovalCard
        quoteNumber={quote.quote_number}
        clientName={quote.client_name}
        total={Number(quote.total ?? 0)}
        validUntil={quote.valid_until}
        status={isResponded ? quote.response ?? "responded" : quote.status}
        items={quote.items}
        paymentTerms={quote.payment_terms}
        deliveryTime={quote.delivery_time}
        shippingCost={quote.shipping_cost}
        notes={quote.notes}
        isResponded={isResponded}
        onApprove={() => setPendingResponse("approved")}
        onReject={() => setPendingResponse("rejected")}
      />

      {pendingResponse && !isResponded && (
        <QuoteSignaturePad onSign={handleSign} isSubmitting={isSubmitting} />
      )}
    </div>
  );
}
