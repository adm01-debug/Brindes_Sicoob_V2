/**
 * useTransactionalEmail — Hook para enviar emails transacionais.
 *
 * O servidor resolve destinatário, dados e link a partir da referência, sob a
 * RLS do usuário: mandar `recipient_email` ou `data` do cliente permitiria
 * disparar e-mail para qualquer endereço anunciando um estado inexistente.
 */
import { supabase } from "@/integrations/supabase/client";

export type EmailEventType =
  | "quote_sent"
  | "quote_approved"
  | "quote_rejected"
  | "order_created"
  | "sicoob_order_status_change"
  | "sicoob_order_approval_request";

interface SendEmailParamsBase {
  /** Complemento opcional (motivo/observação) — nunca define destinatário nem status. */
  reason?: string;
  notes?: string;
}

export type SendEmailParams =
  | (SendEmailParamsBase & { event_type: "quote_sent" | "quote_approved" | "quote_rejected"; quote_id: string })
  | (SendEmailParamsBase & { event_type: "order_created" | "sicoob_order_status_change"; order_id: string })
  | (SendEmailParamsBase & { event_type: "sicoob_order_approval_request"; approval_request_id: string });

export async function sendTransactionalEmail(params: SendEmailParams) {
  try {
    const { data, error } = await supabase.functions.invoke("send-transactional-email", {
      body: params,
    });

    // O endpoint antigo retornava success=true sem fila nem transporte.
    // Exigir recibo também protege o cliente antes da atualização da Edge Function.
    if (error || data?.success !== true || data?.delivery_status !== "accepted"
      || typeof data?.provider_id !== "string" || data.provider_id.length === 0) {
      return { success: false, error: "O serviço não confirmou o envio do email." };
    }

    return { success: true, data };
  } catch {
    return { success: false, error: "Não foi possível solicitar o envio do email." };
  }
}
