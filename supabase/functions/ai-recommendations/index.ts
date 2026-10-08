// build-tag: 2026-04-16-fix-nonneg
import { getCorsHeaders, handleCorsPreflightIfNeeded } from '../_shared/cors.ts';
import { authenticateRequest, authErrorResponse } from '../_shared/auth.ts';
import { callAiWithTracking, QuotaExceededError, callAiWithFallback } from '../_shared/ai-usage.ts';
import { z } from '../_shared/zod-validate.ts';
import { rateLimiters, applyRateLimit } from '../_shared/rate-limiter.ts';
import { runBotProtection } from '../_shared/bot-protection.ts';

const ClientSchema = z.object({
  name: z.string().trim().min(1).max(255),
  company: z.string().max(255).optional(),
  industry: z.string().max(100).optional(),
  preferences: z.array(z.string().max(100)).max(20).optional(),
  purchaseHistory: z.array(z.string().max(200)).max(50).optional(),
  budget: z.string().max(100).optional(),
});

const ProductSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  category: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  priceRange: z.string().max(50).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

const RecommendationRequestSchema = z.object({
  client: ClientSchema,
  products: z.array(ProductSchema).min(1).max(100),
});

type RecommendationInput = z.infer<typeof RecommendationRequestSchema>;

function buildDeterministicFallback({ client, products }: RecommendationInput) {
  return {
    recommendations: products.slice(0, 6).map((product, index) => ({
      productId: product.id,
      score: Math.max(0.5, 0.8 - index * 0.05),
      reason: `${product.name} é uma opção aderente à categoria ${product.category}.`,
    })),
    insights: `Seleção inicial para ${client.name}, ordenada pela disponibilidade informada. Refine o perfil para recomendações personalizadas.`,
    fallback: true,
    source: 'deterministic',
  };
}

/**
 * Robustly extract & parse JSON from an LLM response.
 * Handles markdown fences, prose around JSON, trailing commas, and minor
 * truncation (auto-closes one missing `]` or `}` at the end).
 */
function extractAndParseJSON(raw: string): unknown {
  let s = String(raw ?? "").trim();

  // Strip markdown fences
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

  // Slice from first { or [ to last matching } or ]
  const firstObj = s.indexOf("{");
  const firstArr = s.indexOf("[");
  const start =
    firstObj === -1 ? firstArr :
    firstArr === -1 ? firstObj :
    Math.min(firstObj, firstArr);
  if (start === -1) throw new Error("No JSON object/array found in AI response");
  const isArray = s[start] === "[";
  const end = isArray ? s.lastIndexOf("]") : s.lastIndexOf("}");
  s = end > start ? s.slice(start, end + 1) : s.slice(start);

  // Remove trailing commas before } or ]
  const cleaned = s.replace(/,(\s*[}\]])/g, "$1");

  try {
    return JSON.parse(cleaned);
  } catch (e1) {
    // Last-resort: auto-close one missing bracket if truncated
    const opens = (cleaned.match(/[{[]/g) || []).length;
    const closes = (cleaned.match(/[}\]]/g) || []).length;
    if (opens > closes) {
      const patched = cleaned + (isArray ? "]" : "}");
      try { return JSON.parse(patched); } catch { /* fall through */ }
    }
    console.error("[ai-recommendations] JSON parse failed. Raw snippet:", cleaned.slice(0, 500));
    throw e1;
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Anti-scraping: bot UA check + rate limit por IP (camada externa antes do auth)
    const protection = await runBotProtection(req, {
      endpoint: 'ai-recommendations',
      maxRequests: 60,
      windowSeconds: 60,
      blockSeconds: 1800,
    }, corsHeaders);
    if (!protection.allowed) return protection.blockResponse!;

    // Auth guard: require authenticated user
    const auth = await authenticateRequest(req);
    const user = { id: auth.userId };

    // Rate limit: 20 req/min por usuário
    const rl = await applyRateLimit(req, rateLimiters.ai, () => user.id);
    if (rl) {
      const headers = new Headers(rl.headers);
      Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));
      return new Response(rl.body, { status: rl.status, headers });
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = RecommendationRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { client, products } = parsed.data;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.warn('[ai-recommendations] LOVABLE_API_KEY ausente; usando fallback determinístico');
      return new Response(JSON.stringify(buildDeterministicFallback(parsed.data)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Você é um especialista em brindes promocionais e marketing corporativo. 
Sua tarefa é analisar o perfil de um cliente e recomendar os melhores produtos para ele.

Considere:
- O segmento/indústria do cliente
- Histórico de compras anteriores
- Preferências de cores e estilos
- Orçamento disponível
- Ocasiões e datas comemorativas relevantes

Retorne EXATAMENTE em formato JSON com a estrutura:
{
  "recommendations": [
    {
      "productId": "id do produto",
      "score": 0.95,
      "reason": "Motivo breve da recomendação"
    }
  ],
  "insights": "Uma análise geral do perfil do cliente e sugestões"
}

Ordene por score (maior primeiro). Retorne no máximo 6 recomendações.`;

    const userPrompt = `
## Perfil do Cliente
- Nome: ${client.name}
${client.company ? `- Empresa: ${client.company}` : ""}
${client.industry ? `- Segmento: ${client.industry}` : ""}
${client.preferences?.length ? `- Preferências: ${client.preferences.join(", ")}` : ""}
${client.purchaseHistory?.length ? `- Histórico de Compras: ${client.purchaseHistory.join(", ")}` : ""}
${client.budget ? `- Orçamento: ${client.budget}` : ""}

## Produtos Disponíveis
${products.map(p => `- ID: ${p.id} | ${p.name} | Categoria: ${p.category}${p.tags?.length ? ` | Tags: ${p.tags.join(", ")}` : ""}`).join("\n")}

Com base no perfil do cliente, recomende os produtos mais adequados.`;

    const models = ["google/gemini-2.5-flash", "google/gemini-2.0-flash", "openai/gpt-4o-mini"];

    const response = await callAiWithFallback({
      userId: user.id,
      functionName: "ai-recommendations",
      models,
      apiKey: LOVABLE_API_KEY,
      requestBody: {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos na sua conta." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      return new Response(JSON.stringify(buildDeterministicFallback(parsed.data)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("[ai-recommendations] Provedor respondeu sem conteúdo; usando fallback");
      return new Response(JSON.stringify(buildDeterministicFallback(parsed.data)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse JSON from response — robust extraction + sanitization to survive
    // markdown fences, trailing commas, prose around the JSON, and minor truncation.
    let recommendations: unknown;
    try {
      recommendations = extractAndParseJSON(content);
    } catch {
      console.error("[ai-recommendations] Resposta inválida do provedor; usando fallback");
      recommendations = buildDeterministicFallback(parsed.data);
    }

    return new Response(JSON.stringify(recommendations), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return new Response(
        JSON.stringify({ error: "Limite mensal de IA atingido. Contate o administrador." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if ((error as any)?.status === 401 || (error as any)?.status === 403) {
      return authErrorResponse(error, corsHeaders);
    }
    console.error("Error in ai-recommendations:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro ao gerar recomendações" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
