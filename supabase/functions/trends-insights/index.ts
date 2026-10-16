import { getCorsHeaders } from "../_shared/cors.ts";
// Edge function: trends-insights
// Agrega métricas de Tendências e gera narrativa via Lovable AI Gateway.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { authenticateRequest } from "../_shared/auth.ts";
import { callAiWithTracking, QuotaExceededError } from "../_shared/ai-usage.ts";
import { runBotProtection } from "../_shared/bot-protection.ts";
import { hasActivePortalMembership } from "../_shared/portal-access-policy.ts";
import { applyRateLimit, rateLimiters } from "../_shared/rate-limiter.ts";
import { redactPotentialPii } from "../_shared/pii-redaction.ts";
import {
  loadAllTrendActivity,
  TRENDS_INSIGHTS_PAGE_SIZE,
  trendCursorFilter,
} from "./pagination.ts";

const BodySchema = z.object({
  days: z.number().int().min(1).max(365).optional().default(30),
}).strict();

const MODEL = "google/gemini-2.5-flash";
const InsightResponseSchema = z.object({
  summary: z.string().min(1).max(1200),
  what_changed: z.string().min(1).max(2000),
  why: z.string().min(1).max(2000),
  next_action: z.string().min(1).max(2000),
}).strict();

function jsonResponse(body: Record<string, unknown>, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const auth = await authenticateRequest(req);
    const { data: membershipProfile, error: membershipError } = await auth.localServiceClient
      .from("profiles")
      .select("is_active, deleted_at")
      .eq("user_id", auth.userId)
      .maybeSingle();
    if (membershipError || !hasActivePortalMembership(membershipProfile, auth.userRoles)) {
      return jsonResponse({ error: "Usuário sem vínculo ativo ou papel autorizado" }, 403, corsHeaders);
    }

    const protection = await runBotProtection(req, {
      endpoint: "trends-insights",
      maxRequests: 20,
      windowSeconds: 60,
      blockSeconds: 1800,
      customIdentifier: `user:${auth.userId}`,
    }, corsHeaders);
    if (!protection.allowed) return protection.blockResponse!;

    const rateLimited = await applyRateLimit(req, rateLimiters.ai, () => auth.userId);
    if (rateLimited) {
      const headers = new Headers(rateLimited.headers);
      Object.entries(corsHeaders).forEach(([key, value]) => headers.set(key, value));
      return new Response(rateLimited.body, { status: rateLimited.status, headers });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return jsonResponse({ error: "Serviço de IA indisponível" }, 503, corsHeaders);
    }

    const authHeader = req.headers.get("Authorization")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const parsedBody = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsedBody.success) return jsonResponse({ error: "Dados inválidos" }, 400, corsHeaders);
    const { days } = parsedBody.data;

    const sinceCurrent = new Date(Date.now() - days * 86400000).toISOString();
    const sincePrevious = new Date(Date.now() - days * 2 * 86400000).toISOString();

    // Carrega o período completo com cursor estável. Qualquer falha interrompe a
    // geração para que a IA nunca apresente uma amostra parcial como total real.
    const [views, searches] = await Promise.all([
      loadAllTrendActivity("visualizações de produtos", (cursor) => {
        let query = supabase
          .from("product_views")
          .select("id, product_id, product_name, view_type, created_at")
          .gte("created_at", sincePrevious)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(TRENDS_INSIGHTS_PAGE_SIZE);
        if (cursor) query = query.or(trendCursorFilter(cursor));
        return query;
      }),
      loadAllTrendActivity("buscas", (cursor) => {
        let query = supabase
          .from("search_analytics")
          .select("id, search_term, results_count, created_at")
          .gte("created_at", sincePrevious)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(TRENDS_INSIGHTS_PAGE_SIZE);
        if (cursor) query = query.or(trendCursorFilter(cursor));
        return query;
      }),
    ]);

    const split = <T extends { created_at: string }>(rows: T[] | null) => {
      const cur: T[] = [], prev: T[] = [];
      (rows ?? []).forEach(r => (r.created_at >= sinceCurrent ? cur : prev).push(r));
      return { cur, prev };
    };
    const v = split(views as Array<{ created_at: string; product_name: string | null }>);
    const s = split(searches as Array<{ created_at: string; search_term: string | null; results_count: number | null }>);

    // Top 5 produtos
    const productCount = new Map<string, number>();
    v.cur.forEach((r) => {
      const k = r.product_name ?? "Sem nome";
      productCount.set(k, (productCount.get(k) ?? 0) + 1);
    });
    const topProducts = Array.from(productCount.entries())
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Top 5 buscas + sem resultado
    const searchCount = new Map<string, { count: number; zero: number }>();
    s.cur.forEach(r => {
      const t = (r.search_term ?? "").toLowerCase().trim();
      if (!t) return;
      const e = searchCount.get(t) ?? { count: 0, zero: 0 };
      e.count += 1;
      if ((r.results_count ?? 0) === 0) e.zero += 1;
      searchCount.set(t, e);
    });
    const topSearches = Array.from(searchCount.entries())
      .sort((a, b) => b[1].count - a[1].count).slice(0, 5)
      .map(([term, d]) => ({ term: redactPotentialPii(term), count: d.count, zero: d.zero }));
    const unmet = Array.from(searchCount.entries())
      .filter(([, d]) => d.zero >= 2)
      .sort((a, b) => b[1].zero - a[1].zero).slice(0, 5)
      .map(([term, d]) => ({ term: redactPotentialPii(term), zero: d.zero }));

    const totalViewsCur = v.cur.length;
    const totalViewsPrev = v.prev.length;
    const totalSearchesCur = s.cur.length;
    const totalSearchesPrev = s.prev.length;
    const pct = (a: number, b: number) => b === 0 ? (a > 0 ? 100 : 0) : Math.round(((a - b) / b) * 100);

    const summary = {
      window_days: days,
      total_views: totalViewsCur,
      views_growth_pct: pct(totalViewsCur, totalViewsPrev),
      total_searches: totalSearchesCur,
      searches_growth_pct: pct(totalSearchesCur, totalSearchesPrev),
      top_products: topProducts,
      top_searches: topSearches,
      unmet_demand: unmet,
    };

    const prompt = `Você é um analista comercial sênior. Com base nas métricas abaixo de um catálogo B2B de brindes, gere insights acionáveis em português brasileiro. Seja específico, cite produtos/termos reais, e foque em ações práticas.

DADOS (últimos ${days} dias):
${JSON.stringify(summary, null, 2)}

Retorne via tool call.`;

    const aiResp = await callAiWithTracking({
      userId: auth.userId,
      functionName: "trends-insights",
      model: MODEL,
      apiKey: LOVABLE_API_KEY,
      requestBody: {
        messages: [
          { role: "system", content: "Você gera insights comerciais concisos e acionáveis em português brasileiro." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "report_insights",
            description: "Reporta insights estruturados",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string", description: "1 frase resumindo o período" },
                what_changed: { type: "string", description: "O que mudou — números e produtos específicos" },
                why: { type: "string", description: "Hipótese plausível para o que mudou" },
                next_action: { type: "string", description: "Ação recomendada concreta" },
              },
              required: ["summary", "what_changed", "why", "next_action"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "report_insights" } },
        max_completion_tokens: 1200,
      },
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("[trends-insights] AI gateway failure", { status: aiResp.status });
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({
        summary: "Sem dados suficientes para gerar insights ainda.",
        what_changed: "Aguardando mais atividade no catálogo.",
        why: "Volume baixo de eventos no período.",
        next_action: "Continue acompanhando — em breve haverá padrões claros.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const parsed = InsightResponseSchema.safeParse(JSON.parse(toolCall.function.arguments));
    if (!parsed.success) {
      console.error("[trends-insights] Invalid structured AI response");
      return jsonResponse({ error: "Resposta de IA inválida" }, 502, corsHeaders);
    }

    return new Response(JSON.stringify(parsed.data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const status = typeof e === "object" && e !== null && "status" in e
      ? Number((e as { status?: number }).status) || 500
      : e instanceof QuotaExceededError ? 429 : 500;
    if (status >= 500) console.error("[trends-insights] Internal failure", { status });
    const message = status === 401 ? "Não autorizado"
      : status === 403 ? "Acesso negado"
      : status === 429 ? "Limite de uso da IA atingido"
      : "Não foi possível gerar os insights";
    return jsonResponse({ error: message }, status, corsHeaders);
  }
});
