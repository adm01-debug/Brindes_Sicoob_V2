import type { SupabaseClient } from "npm:@supabase/supabase-js@2.49.4";
import { authorize } from "../_shared/authorize.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { withStructuredLogging } from "../_shared/structured-logger.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { deliverTransactionalEmail } from "./deliver.ts";
import { renderTemplate } from "./templates.ts";
import { resolveEmailIntent, type ResolveAdapter } from "./resolve.ts";

const supportedEvents = new Set([
  "quote_sent",
  "quote_approved",
  "quote_rejected",
  "order_created",
  "sicoob_order_status_change",
  "sicoob_order_approval_request",
]);

/** O cliente só indica a referência; estes campos seriam o destinatário e o texto do e-mail. */
const CLIENT_CONTROLLED_FIELDS = ["recipient_email", "recipient_name", "data", "action_url"];

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Teto por remetente para o mesmo evento+referencia. Sem isso um vendedor podia
 * reenviar o mesmo e-mail indefinidamente e inundar a caixa do cliente.
 * `check_rate_limit` e a SSOT transacional (a janela em memoria da instancia nao
 * vale entre isolates).
 */
async function withinSendBudget(
  admin: SupabaseClient,
  identifier: string,
  endpoint: string,
): Promise<boolean> {
  const { data, error } = await admin.rpc("check_rate_limit", {
    _identifier: identifier,
    _endpoint: endpoint,
    _max_requests: 3,
    _window_seconds: 3600,
    _block_duration_seconds: 3600,
  });
  if (error || !data || typeof (data as { allowed?: unknown }).allowed !== "boolean") {
    // Servico de protecao fora: falha fechado para nao liberar envio em massa.
    return false;
  }
  return (data as { allowed: boolean }).allowed;
}

serve(withStructuredLogging("send-transactional-email", async (req) => {
  const corsHeaders = getCorsHeaders(req);
  const json = (body: unknown, status: number) => new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "metodo_nao_permitido" }, 405);

  const auth = await authorize(req);
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "json_invalido" }, 400);
  }

  const eventType = typeof body?.event_type === "string" ? body.event_type : "";
  if (!supportedEvents.has(eventType)) return json({ error: "payload_invalido" }, 422);
  // Antes desta versão o endpoint aceitava destinatário e corpo livres: qualquer
  // conta autenticada disparava e-mail para um endereço arbitrário anunciando um
  // estado que não existia. Recusar o formato antigo impede que um cliente
  // desatualizado volte a depender desse contrato.
  if (CLIENT_CONTROLLED_FIELDS.some((field) => field in body)) {
    return json({ error: "payload_invalido", message: "Envie apenas event_type e a referência." }, 422);
  }

  const supabaseUser = auth.supabaseUser;
  const supabaseAdmin = auth.supabaseAdmin;

  const reference = ["quote_id", "order_id", "approval_request_id"]
    .map((key) => (typeof body[key] === "string" ? `${key}=${String(body[key]).trim()}` : ""))
    .find((value) => value.length > 0) ?? "";

  const deps: ResolveAdapter = {
    async find(table, columns, filters) {
      let query = supabaseUser.from(table).select(columns);
      for (const [column, value] of Object.entries(filters)) query = query.eq(column, value);
      const { data, error } = await query.maybeSingle();
      if (error) {
        console.error(`send-transactional-email: lookup falhou em ${table}`);
        return null;
      }
      return (data as Record<string, unknown> | null) ?? null;
    },
    async ensureApprovalToken(quoteId, sellerId) {
      // O token é emitido em nome do vendedor do orçamento; profiles e tokens não
      // são legíveis por todos, então a emissão usa service_role como o editor.
      const { data: existing, error: readError } = await supabaseAdmin
        .from("quote_approval_tokens")
        .select("token, expires_at")
        .eq("quote_id", quoteId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (readError) return null;
      const token = typeof existing?.token === "string" ? existing.token : "";
      const expiresAt = typeof existing?.expires_at === "string" ? Date.parse(existing.expires_at) : Number.NaN;
      if (token && (Number.isNaN(expiresAt) || expiresAt > Date.now())) return token;

      const { data: created, error: insertError } = await supabaseAdmin
        .from("quote_approval_tokens")
        .insert({ quote_id: quoteId, seller_id: sellerId, token: randomToken(), status: "active" })
        .select("token")
        .single();
      if (insertError || typeof created?.token !== "string") return null;
      return created.token;
    },
    async findApprovalRecipient(userId) {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("email, full_name, is_active, deleted_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (error || !data || data.is_active === false || data.deleted_at) return null;
      const email = typeof data.email === "string" ? data.email : "";
      if (!email) return null;
      return { email, full_name: typeof data.full_name === "string" ? data.full_name : null };
    },
  };

  const resolved = await resolveEmailIntent({
    eventType,
    body,
    user: auth.user,
    canViewAll: auth.role === "supervisor" || auth.role === "dev",
    publicAppUrl: Deno.env.get("PUBLIC_APP_URL"),
    deps,
  });
  if (!resolved.ok) return json({ error: resolved.failure.error }, resolved.failure.status);

  const { intent } = resolved;
  // A cota acompanha a transicao que o servidor acabou de ler, nao apenas o
  // pedido: quatro etapas distintas no mesmo pedido sao quatro avisos
  // legitimamente diferentes e precisam sair. Repetir a mesma transicao cai na
  // mesma cota, entao o reenvio em massa continua barrado.
  const transition = typeof intent.data.status === "string" ? intent.data.status : "-";
  const allowed = await withinSendBudget(
    supabaseAdmin,
    `${auth.user.id}|${eventType}|${reference}|${transition}`,
    "send-transactional-email",
  );
  if (!allowed) {
    return json({
      error: "limite_de_envio",
      message: "Limite de envio deste e-mail atingido. Aguarde para tentar novamente.",
    }, 429);
  }

  const template = renderTemplate(eventType, {
    recipientName: intent.recipientName,
    data: intent.actionUrl ? { ...intent.data, action_url: intent.actionUrl } : intent.data,
  });
  if (!template) return json({ error: "template_indisponivel" }, 422);

  const result = await deliverTransactionalEmail({
    eventType,
    recipientEmail: intent.recipientEmail,
    recipientName: intent.recipientName,
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
