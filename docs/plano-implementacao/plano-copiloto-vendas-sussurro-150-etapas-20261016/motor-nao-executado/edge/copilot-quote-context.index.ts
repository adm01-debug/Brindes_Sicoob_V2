/**
 * copilot-quote-context — Serviço de Contexto de Orçamento (F08, E076-E080)
 *
 * Extrai do estado COOPERA os dados necessários para pré-preencher o sicoob-kit-quote:
 * produto sugerido, quantidade, faixa de verba, data do evento e nome do cliente.
 */
// deno-lint-ignore-file no-explicit-any

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getCorsHeaders } from "../_shared/cors.ts";
import { authenticateUser } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface CooperaField {
  status: "pendente" | "parcial" | "completo";
  value: string | null;
}

interface QuoteContext {
  product_suggestion: string | null;
  quantity: string | null;
  budget_range: string | null;
  event_date: string | null;
  client_name: string | null;
  scope_complete: boolean;
}

function extractQuantity(scopeValue: string | null): string | null {
  if (!scopeValue) return null;
  const match = scopeValue.match(/\b(\d[\d.,]*)\s*(un|pç|peça|peças|unidades?|kit|kits)?\b/i);
  return match ? match[1] : null;
}

function extractProductSuggestion(scopeValue: string | null): string | null {
  if (!scopeValue) return null;
  return scopeValue.replace(/^\d[\d.,]*\s*(un|pç|peça|peças|unidades?|kit|kits)?\s*/i, "").trim() || null;
}

function extractEventDate(ocasiaoValue: string | null): string | null {
  if (!ocasiaoValue) return null;
  const patterns = [
    /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/,
    /\b(\d{1,2}-\d{1,2}-\d{2,4})\b/,
    /\b(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)[\/\s-]*(\d{2,4})\b/i,
    /\b(\d{1,2})\s*de\s*(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)/i,
  ];
  for (const pattern of patterns) {
    const match = ocasiaoValue.match(pattern);
    if (match) return match[0];
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const auth = await authenticateUser(req);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const conversationId: string = body.conversation_id;

    if (!conversationId) {
      return new Response(
        JSON.stringify({ error: "conversation_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const [convResult, contactResult] = await Promise.all([
      supabase
        .from("copilot_conversations")
        .select("coopera_state, ai_risk_level")
        .eq("id", conversationId)
        .single(),
      supabase
        .from("copilot_contacts")
        .select("name, org_name")
        .eq("conversation_id", conversationId)
        .maybeSingle(),
    ]);

    if (convResult.error || !convResult.data) {
      return new Response(
        JSON.stringify({ error: "Conversa não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const cooperaState: Record<string, CooperaField> = convResult.data.coopera_state;
    const contact = contactResult.data;

    const scopeField = cooperaState["E"];
    const budgetField = cooperaState["O_orcamento"];
    const ocasiaoField = cooperaState["O_ocasiao"];
    const peopleField = cooperaState["P"];

    const clientName = contact?.name || contact?.org_name || peopleField?.value || null;

    const quoteContext: QuoteContext = {
      product_suggestion: extractProductSuggestion(scopeField?.value ?? null),
      quantity: extractQuantity(scopeField?.value ?? null),
      budget_range: budgetField?.value ?? null,
      event_date: extractEventDate(ocasiaoField?.value ?? null),
      client_name: clientName,
      scope_complete: scopeField?.status === "completo",
    };

    return new Response(
      JSON.stringify({ quote_context: quoteContext }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[copilot-quote-context] Erro inesperado:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
