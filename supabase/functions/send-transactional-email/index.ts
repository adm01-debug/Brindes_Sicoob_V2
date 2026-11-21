import { getCorsHeaders } from "../_shared/cors.ts";
import { withStructuredLogging } from "../_shared/structured-logger.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { deliverTransactionalEmail } from "./deliver.ts";
import { renderTemplate } from "./templates.ts";

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

  const eventType = body.event_type as string;
  const recipientEmail = body.recipient_email;
  const recipientName = typeof body.recipient_name === "string" ? body.recipient_name : undefined;
  const eventData = (body.data && typeof body.data === "object")
    ? body.data as Record<string, unknown>
    : {};

  const template = renderTemplate(eventType, { recipientName, data: eventData });
  if (!template) {
    return json({ error: "template_indisponivel" }, 422);
  }

  const result = await deliverTransactionalEmail({
    eventType,
    recipientEmail,
    recipientName,
    subject: template.subject,
    html: template.html,
  });

  if (!result.accepted) {
    // Sem secrets, o transporte degrada com recibo estruturado em vez de 501:
    // o cliente continua funcionando e o envio volta a ser tentado quando configurado.
    return json({
      success: false,
      error: result.errorCode ?? "delivery_failed",
      message: "O envio do e-mail não pôde ser confirmado pelo provedor.",
      delivered: false,
    }, result.errorCode === "email_not_configured" ? 503 : 502);
  }

  return json({
    success: true,
    delivery_status: "accepted",
    provider_id: result.providerId,
    event_type: eventType,
  }, 200);
}));
