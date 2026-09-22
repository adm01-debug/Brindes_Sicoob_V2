import { getCorsHeaders } from "../_shared/cors.ts";
import { withStructuredLogging } from "../_shared/structured-logger.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const supportedEvents = new Set([
  "quote_sent",
  "quote_approved",
  "quote_rejected",
  "order_created",
  "sicoob_order_status_change",
  "sicoob_order_approval_request",
]);

serve(withStructuredLogging("send-transactional-email", async (req) => {
  const corsHeaders = getCorsHeaders(req);
  const json = (body: unknown, status: number) => new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "metodo_nao_permitido" }, 405);

  const authHeader = req.headers.get("authorization");
  if (!authHeader) return json({ error: "nao_autorizado" }, 401);
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return json({ error: "token_invalido" }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "json_invalido" }, 400);
  }
  if (typeof body.event_type !== "string" || !supportedEvents.has(body.event_type)
      || typeof body.recipient_email !== "string") {
    return json({ error: "payload_invalido" }, 422);
  }

  // Compatibilidade temporária: este endpoint nunca teve transporte durável.
  // OTP e aprovações Sicoob usam entregadores próprios, com recibo do provedor.
  return json({
    success: false,
    error: "email_transacional_sem_entrega",
    message: "O envio deste email ainda não está implementado.",
  }, 501);
}));
