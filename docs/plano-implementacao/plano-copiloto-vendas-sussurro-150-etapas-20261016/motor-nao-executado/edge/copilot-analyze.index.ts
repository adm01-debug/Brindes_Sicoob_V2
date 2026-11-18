/**
 * copilot-analyze — Motor de Análise em Tempo Real (F06, E056-E060)
 *
 * Analisa a conversa de vendas usando o método COOPERA e atualiza:
 * - coopera_state e ai_risk_level na tabela copilot_conversations
 * - insights (buying_signals, risk_flags) em copilot_insights
 * - eventos de auditoria em copilot_events
 * - dispara copilot-suggest de forma assíncrona
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

interface CooperaField {
  status: "pendente" | "parcial" | "completo";
  value: string | null;
}

interface CooperaState {
  C: CooperaField;
  O_orcamento: CooperaField;
  O_ocasiao: CooperaField;
  P: CooperaField;
  E: CooperaField;
  R: CooperaField;
  A: CooperaField;
}

interface AnalysisResult {
  coopera_updates: Record<string, CooperaField>;
  sentiment: "positive" | "neutral" | "negative" | "urgent";
  intent: "question" | "objection" | "interest" | "close" | "other";
  buying_signals: string[];
  risk_flags: string[];
  summary_one_line: string;
}

function calcCooperaCompletionPct(state: CooperaState): number {
  const fields = Object.values(state);
  if (fields.length === 0) return 0;
  const complete = fields.filter((f) => f.status === "completo").length;
  const partial = fields.filter((f) => f.status === "parcial").length;
  return Math.round(((complete + partial * 0.5) / fields.length) * 100);
}

function mapRiskLevel(
  riskFlags: string[],
  sentiment: string,
): "low" | "medium" | "high" | "critical" {
  if (riskFlags.length >= 3 || sentiment === "urgent") return "critical";
  if (riskFlags.length >= 2 || sentiment === "negative") return "high";
  if (riskFlags.length >= 1) return "medium";
  return "low";
}

async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
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

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY ausente — habilite Lovable AI." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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

    const { data: messages, error: msgError } = await supabase
      .from("copilot_messages")
      .select("role, content, sent_at")
      .eq("conversation_id", conversationId)
      .order("sent_at", { ascending: false })
      .limit(30);

    if (msgError) {
      console.error("[copilot-analyze] Erro ao buscar mensagens:", msgError.message);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar mensagens da conversa" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: conversation, error: convError } = await supabase
      .from("copilot_conversations")
      .select("coopera_state, ai_risk_level, analysis_count")
      .eq("id", conversationId)
      .single();

    if (convError || !conversation) {
      return new Response(
        JSON.stringify({ error: "Conversa não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const cooperaState: CooperaState = conversation.coopera_state;

    const messagesText = (messages || [])
      .reverse()
      .map((m: any) => `[${m.role.toUpperCase()}]: ${m.content}`)
      .join("\n");

    const systemPrompt = `Você é um assistente de análise de vendas B2B para a Promo Brindes, especializada em brindes para cooperativas Sicoob. Analise a conversa e retorne JSON.\n\nMétodo COOPERA:\nC=Contexto (por que agora, qual gatilho), O_orcamento=Orçamento (verba, alçada), O_ocasiao=Ocasião e prazo (data evento, entrega), P=Pessoas (quem decide), E=Escopo (produto, qtd, personalização, PAs), R=Risco (objeções, problemas anteriores), A=Aprovação (próximo passo com data)\n\nEstado COOPERA atual:\n${JSON.stringify(cooperaState, null, 2)}\n\nRetorne APENAS JSON válido no formato:\n{\n  "coopera_updates": {\n    "C": {"status":"pendente|parcial|completo","value":"valor extraído ou null"},\n    "O_orcamento": {"status":"pendente|parcial|completo","value":"valor extraído ou null"},\n    "O_ocasiao": {"status":"pendente|parcial|completo","value":"valor extraído ou null"},\n    "P": {"status":"pendente|parcial|completo","value":"valor extraído ou null"},\n    "E": {"status":"pendente|parcial|completo","value":"valor extraído ou null"},\n    "R": {"status":"pendente|parcial|completo","value":"valor extraído ou null"},\n    "A": {"status":"pendente|parcial|completo","value":"valor extraído ou null"}\n  },\n  "sentiment": "positive|neutral|negative|urgent",\n  "intent": "question|objection|interest|close|other",\n  "buying_signals": ["sinal1", "sinal2"],\n  "risk_flags": ["risco1"],\n  "summary_one_line": "resumo em 1 linha"\n}`;

    const aiResponse = await callAiWithTracking({
      userId: auth.userId,
      functionName: "copilot-analyze",
      model: MODEL,
      apiKey: LOVABLE_API_KEY,
      requestBody: {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Conversa:\n${messagesText}` },
        ],
        temperature: 0.2,
        max_tokens: 1000,
        response_format: { type: "json_object" },
      },
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("[copilot-analyze] AI Gateway error:", aiResponse.status, errText);
      return new Response(
        JSON.stringify({ error: "Erro no provedor de IA" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData?.choices?.[0]?.message?.content ?? "{}";

    let analysis: AnalysisResult;
    try {
      analysis = JSON.parse(rawContent);
    } catch {
      console.error("[copilot-analyze] JSON parse falhou:", rawContent);
      return new Response(
        JSON.stringify({ error: "Resposta do LLM não é JSON válido" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const updatedCoopera: CooperaState = { ...cooperaState };
    for (const [key, value] of Object.entries(analysis.coopera_updates || {})) {
      if (key in updatedCoopera) {
        const field = value as CooperaField;
        const currentStatus = (updatedCoopera as any)[key]?.status;
        const statusOrder: Record<string, number> = { pendente: 0, parcial: 1, completo: 2 };
        if ((statusOrder[field.status] ?? 0) >= (statusOrder[currentStatus] ?? 0)) {
          (updatedCoopera as any)[key] = field;
        }
      }
    }

    const newRiskLevel = mapRiskLevel(analysis.risk_flags || [], analysis.sentiment || "neutral");
    const completionPct = calcCooperaCompletionPct(updatedCoopera);

    await supabase
      .from("copilot_conversations")
      .update({
        coopera_state: updatedCoopera,
        ai_risk_level: newRiskLevel,
        sentiment: analysis.sentiment || "neutral",
        last_analyzed_at: new Date().toISOString(),
        analysis_count: (conversation.analysis_count || 0) + 1,
      })
      .eq("id", conversationId);

    const insightsToInsert: any[] = [];
    for (const signal of analysis.buying_signals || []) {
      insightsToInsert.push({ conversation_id: conversationId, type: "buying_signal", content: signal, confidence: 0.80 });
    }
    for (const flag of analysis.risk_flags || []) {
      insightsToInsert.push({ conversation_id: conversationId, type: "risk_flag", content: flag, confidence: 0.75 });
    }
    if (insightsToInsert.length > 0) {
      await supabase.from("copilot_insights").insert(insightsToInsert);
    }

    fetch(`${SUPABASE_URL}/functions/v1/copilot-suggest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        "x-internal-call": "true",
      },
      body: JSON.stringify({ conversation_id: conversationId, user_id: auth.userId }),
    }).catch((e) => console.warn("[copilot-analyze] copilot-suggest fire-forget falhou:", e));

    const payloadHash = await hashContent(`${conversationId}:${Date.now()}`);
    await supabase.from("copilot_events").insert({
      conversation_id: conversationId,
      event_type: "llm_called",
      payload_hash: payloadHash,
      metadata: {
        model: MODEL,
        function_name: "copilot-analyze",
        sentiment: analysis.sentiment,
        intent: analysis.intent,
        buying_signals_count: (analysis.buying_signals || []).length,
        risk_flags_count: (analysis.risk_flags || []).length,
      },
    });

    return new Response(
      JSON.stringify({
        status: "analyzed",
        conversation_id: conversationId,
        coopera_completion_pct: completionPct,
        sentiment: analysis.sentiment,
        intent: analysis.intent,
        risk_level: newRiskLevel,
        summary: analysis.summary_one_line,
        buying_signals_count: (analysis.buying_signals || []).length,
        risk_flags_count: (analysis.risk_flags || []).length,
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
    console.error("[copilot-analyze] Erro inesperado:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
