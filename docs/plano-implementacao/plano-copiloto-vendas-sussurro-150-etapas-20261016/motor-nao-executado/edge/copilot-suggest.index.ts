/**
 * copilot-suggest — Gerador de Sugestões de Próxima Mensagem (F07, E061-E065)
 *
 * Lê o estado COOPERA, identifica a próxima letra não preenchida e gera
 * 3 sugestões de resposta para o vendedor, salvas em copilot_suggestions.
 */
// deno-lint-ignore-file no-explicit-any

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getCorsHeaders } from "../_shared/cors.ts";
import { authenticateUser } from "../_shared/auth.ts";
import { callAiWithTracking, QuotaExceededError } from "../_shared/ai-usage.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const MODEL = "google/gemini-2.5-flash";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const COOPERA_PRIORITY = ["C", "O_orcamento", "O_ocasiao", "P", "E", "R", "A"] as const;

const COOPERA_LABELS: Record<string, string> = {
  C: "Contexto (por que agora, qual o gatilho da compra)",
  O_orcamento: "Orçamento (verba disponível, alçada de aprovação)",
  O_ocasiao: "Ocasião e prazo (data do evento, prazo de entrega)",
  P: "Pessoas (quem decide, quem influencia)",
  E: "Escopo (produto, quantidade, personalização, PAs atendidas)",
  R: "Risco (objeções, experiências negativas anteriores)",
  A: "Aprovação (próximo passo com data)",
};

interface CooperaField {
  status: "pendente" | "parcial" | "completo";
  value: string | null;
}

interface Suggestion {
  type: "reply" | "question" | "action";
  content: string;
  rationale: string;
  next_action_type: "send_reply" | "ask_question" | "send_quote" | "schedule_call";
  priority: number;
}

interface SuggestResult {
  suggestions: Suggestion[];
  ghost_text: string;
}

function findNextCooperaField(cooperaState: Record<string, CooperaField>): string {
  for (const key of COOPERA_PRIORITY) {
    const field = cooperaState[key];
    if (!field || field.status === "pendente") return key;
  }
  return "A";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY ausente — habilite Lovable AI." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const bodyRaw = await req.json();
    const conversationId: string = bodyRaw.conversation_id;

    if (!conversationId) {
      return new Response(
        JSON.stringify({ error: "conversation_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const isInternalCall = req.headers.get("x-internal-call") === "true";
    let userId: string;

    if (isInternalCall) {
      userId = bodyRaw.user_id ?? "system";
    } else {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Não autorizado" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const auth = await authenticateUser(
        new Request(req.url, { headers: req.headers, method: req.method }),
      );
      if (!auth.ok) {
        return new Response(JSON.stringify({ error: "Não autorizado" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = auth.userId;
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const [convResult, msgResult, contactResult] = await Promise.all([
      supabase
        .from("copilot_conversations")
        .select("coopera_state, ai_risk_level, sentiment, crm_contact_id")
        .eq("id", conversationId)
        .single(),
      supabase
        .from("copilot_messages")
        .select("role, content, sent_at")
        .eq("conversation_id", conversationId)
        .order("sent_at", { ascending: false })
        .limit(10),
      supabase
        .from("copilot_contacts")
        .select("name, org_name, purchase_history")
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
    const messages = (msgResult.data || []).reverse();

    const nextCooperaKey = findNextCooperaField(cooperaState);
    const nextCooperaLabel = COOPERA_LABELS[nextCooperaKey] ?? nextCooperaKey;

    const messagesText = messages
      .map((m: any) => `[${m.role.toUpperCase()}]: ${m.content}`)
      .join("\n");

    const cooperaSummary = Object.entries(cooperaState)
      .map(([k, v]) => `${k}: ${v.status}${v.value ? ` — "${v.value}"` : ""}`)
      .join("\n");

    const historyContext =
      contact?.purchase_history && (contact.purchase_history as any[]).length > 0
        ? `\nHistórico de compras do contato:\n${JSON.stringify(contact.purchase_history, null, 2)}`
        : "";

    const systemPrompt = `Você é um assistente de vendas B2B para a Promo Brindes, especializada em brindes para cooperativas Sicoob.\n\nBaseado no estado atual da qualificação COOPERA e nas últimas mensagens, gere 3 sugestões de próxima mensagem para o vendedor.\n\nEstado COOPERA atual:\n${cooperaSummary}\n${historyContext}\n\nPróxima letra COOPERA a preencher: ${nextCooperaKey} — ${nextCooperaLabel}\n\nRegras:\n- Máximo 2 perguntas por mensagem\n- Tom: informal, direto, sem jargão de vendas\n- Nunca prometer preço ou prazo sem fonte\n- Priorize a próxima letra COOPERA não preenchida\n- Sugestões devem ser curtas (máximo 3 frases)\n\nRetorne APENAS JSON válido no formato:\n{\n  "suggestions": [\n    {\n      "type": "reply|question|action",\n      "content": "texto pronto para enviar",\n      "rationale": "por que essa sugestão",\n      "next_action_type": "send_reply|ask_question|send_quote|schedule_call",\n      "priority": 1\n    },\n    {\n      "type": "reply|question|action",\n      "content": "texto pronto para enviar",\n      "rationale": "por que essa sugestão",\n      "next_action_type": "send_reply|ask_question|send_quote|schedule_call",\n      "priority": 2\n    },\n    {\n      "type": "reply|question|action",\n      "content": "texto pronto para enviar",\n      "rationale": "por que essa sugestão",\n      "next_action_type": "send_reply|ask_question|send_quote|schedule_call",\n      "priority": 3\n    }\n  ],\n  "ghost_text": "sugestão de continuação de frase de 1 linha"\n}`;

    const aiResponse = await callAiWithTracking({
      userId,
      functionName: "copilot-suggest",
      model: MODEL,
      apiKey: LOVABLE_API_KEY,
      requestBody: {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Últimas mensagens:\n${messagesText}` },
        ],
        temperature: 0.4,
        max_tokens: 800,
        response_format: { type: "json_object" },
      },
    });

    if (!aiResponse.ok) {
      console.error("[copilot-suggest] AI Gateway error:", aiResponse.status);
      return new Response(
        JSON.stringify({ error: "Erro no provedor de IA" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData?.choices?.[0]?.message?.content ?? "{}";

    let result: SuggestResult;
    try {
      result = JSON.parse(rawContent);
    } catch {
      console.error("[copilot-suggest] JSON parse falhou:", rawContent);
      return new Response(
        JSON.stringify({ error: "Resposta do LLM não é JSON válido" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const suggestions = (result.suggestions || []).slice(0, 3);
    const ghostText = result.ghost_text || "";

    if (suggestions.length > 0) {
      const rows = suggestions.map((s: Suggestion) => ({
        conversation_id: conversationId,
        type: s.type || "reply",
        content: s.content,
        rationale: s.rationale,
        next_action_type: s.next_action_type,
        priority: s.priority || 1,
        ghost_text: s.priority === 1 ? ghostText : null,
      }));
      await supabase.from("copilot_suggestions").insert(rows);
    }

    return new Response(
      JSON.stringify({
        suggestions,
        ghost_text: ghostText,
        next_coopera_field: nextCooperaKey,
        next_coopera_label: nextCooperaLabel,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return new Response(
        JSON.stringify({ error: "Cota de IA excedida para este mês", quota: err.quota }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    console.error("[copilot-suggest] Erro inesperado:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
