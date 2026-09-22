/**
 * useTransactionalEmail — Hook para enviar emails transacionais.
 */
import { supabase } from "@/integrations/supabase/client";

export type EmailEventType =
  | "quote_sent"
  | "quote_approved"
  | "quote_rejected"
  | "order_created";

interface SendEmailParams {
  event_type: EmailEventType;
  recipient_email: string;
  recipient_name?: string;
  data: Record<string, unknown>;
}

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
