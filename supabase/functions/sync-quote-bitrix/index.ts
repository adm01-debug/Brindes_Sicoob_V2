import { getCorsHeaders } from '../_shared/cors.ts';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from '../_shared/zod-validate.ts';
import { fetchWithBreaker, CircuitOpenError, circuitOpenResponse } from '../_shared/external-fetch.ts';
import { createStructuredLogger } from "../_shared/structured-logger.ts";
import { getOrCreateRequestId } from "../_shared/request-id.ts";
import { authorize } from "../_shared/authorize.ts";
import { resolveCredential } from "../_shared/credentials.ts";

// Mapping: seller email → Bitrix24 numeric seller_id
const SELLER_EMAIL_MAP: Record<string, number> = {
  "comercial01@promobrindes.com.br": 8,
  "henrique.silva@promobrindes.com.br": 10,
  "comercial03@promobrindes.com.br": 16,
  "comercial04@promobrindes.com.br": 5174,
  "comercial06@promobrindes.com.br": 5176,
  "comercial05@promobrindes.com.br": 5180,
  "comercial07@promobrindes.com.br": 16558,
};

const SyncQuoteBitrixSchema = z.object({
  quoteId: z.string().uuid(),
  pdfPath: z.string().max(600).optional(),
});

class SyncQuoteError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

type StoredQuote = {
  id: string;
  seller_id: string;
  quote_number: string;
  client_name: string | null;
  client_company: string | null;
  client_id: string | null;
  discount_percent: number | null;
  internal_notes: string | null;
  shipping_type: string | null;
  shipping_cost: number | null;
};

type StoredQuoteItem = {
  id: string;
  product_name: string | null;
  product_sku: string | null;
  quantity: number | null;
  unit_price: number | null;
  source_variant_id: string | null;
  color_name: string | null;
};

type StoredPersonalization = {
  quote_item_id: string;
  technique_name: string | null;
  total_cost: number | null;
  setup_cost: number | null;
  width_cm: number | null;
  height_cm: number | null;
  area_cm2: number | null;
  notes: string | null;
};

type BitrixCompany = { bitrix_company_id: string | number | null };
type BitrixProductVariant = { id: string; bitrix_product_id: string | number | null };
type BitrixResult = {
  quote_id?: string | number | null;
  bitrix_quote_id?: string | number | null;
  deal_id?: string | number | null;
  bitrix_deal_id?: string | number | null;
  message?: string;
};

function externalId(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

async function recordSuccessfulSync(
  admin: { rpc: (name: string, params: Record<string, unknown>) => PromiseLike<{ error: { message?: string } | null }> },
  quoteId: string,
  result: BitrixResult | undefined,
) {
  const { error } = await admin.rpc("record_quote_bitrix_sync", {
    p_quote_id: quoteId,
    p_bitrix_quote_id: externalId(result?.bitrix_quote_id ?? result?.quote_id),
    p_bitrix_deal_id: externalId(result?.bitrix_deal_id ?? result?.deal_id),
  });
  if (error) throw new Error(error.message || "Falha ao registrar a sincronização com Bitrix.");
}

/**
 * Resolve os IDs externos a partir dos vínculos persistidos no orçamento.
 * IDs recebidos do navegador nunca são aceitos como destino no Bitrix.
 */
async function resolveBitrixTargets(quote: StoredQuote, items: StoredQuoteItem[]) {
  if (!quote.client_id) {
    throw new SyncQuoteError("O orçamento não possui cliente vinculado ao CRM.", 409);
  }

  const [crmUrl, crmServiceKey, crmAnonKey, catalogUrl, catalogServiceKey] = await Promise.all([
    resolveCredential("EXTERNAL_CRM_URL"),
    resolveCredential("EXTERNAL_CRM_SERVICE_ROLE_KEY"),
    resolveCredential("EXTERNAL_CRM_ANON_KEY"),
    resolveCredential("EXTERNAL_PROMOBRIND_URL"),
    resolveCredential("EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY"),
  ]);
  const crmKey = crmServiceKey.value ?? crmAnonKey.value;
  if (!crmUrl.value || !crmKey || !catalogUrl.value || !catalogServiceKey.value) {
    throw new SyncQuoteError("As integrações de CRM e catálogo precisam estar configuradas para sincronizar com o Bitrix24.", 503);
  }

  const crm = createClient(crmUrl.value, crmKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: company, error: companyError } = await crm
    .from("companies")
    .select("bitrix_company_id")
    .eq("id", quote.client_id)
    .maybeSingle();
  if (companyError) throw companyError;
  const companyId = Number((company as BitrixCompany | null)?.bitrix_company_id);
  if (!Number.isSafeInteger(companyId) || companyId <= 0) {
    throw new SyncQuoteError("O cliente vinculado ao orçamento não possui ID válido no Bitrix24.", 409);
  }

  const variantIds = [...new Set(items.map((item) => item.source_variant_id).filter((id): id is string => !!id))];
  if (!variantIds.length) {
    throw new SyncQuoteError("Os itens do orçamento não possuem vínculo persistido com variantes do catálogo.", 409);
  }
  const catalog = createClient(catalogUrl.value, catalogServiceKey.value, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: variants, error: variantsError } = await catalog
    .from("product_variants")
    .select("id, bitrix_product_id")
    .in("id", variantIds);
  if (variantsError) throw variantsError;

  const productIds = new Map<string, string | number | null>();
  for (const variant of (variants ?? []) as BitrixProductVariant[]) {
    productIds.set(String(variant.id), variant.bitrix_product_id);
  }
  return { companyId, productIds };
}

function buildTrustedPdfUrl(quoteId: string, pdfPath: string | undefined): { filename: string; url: string } | undefined {
  if (!pdfPath) return undefined;
  const expectedPrefix = `quotes/${quoteId}/`;
  if (!pdfPath.startsWith(expectedPrefix) || !pdfPath.toLowerCase().endsWith(".pdf")) {
    throw new SyncQuoteError("O documento informado não pertence a este orçamento.", 400);
  }
  const baseUrl = Deno.env.get("SUPABASE_URL");
  if (!baseUrl) throw new SyncQuoteError("Configuração do armazenamento indisponível.", 503);
  const safePath = pdfPath.split("/").map(encodeURIComponent).join("/");
  return {
    filename: pdfPath.split("/").at(-1) || `proposta-${quoteId}.pdf`,
    url: `${baseUrl}/storage/v1/object/public/proposals/${safePath}`,
  };
}

Deno.serve(async (req) => {
  const requestId = getOrCreateRequestId(req);
  const log = createStructuredLogger({ fn: "sync-quote-bitrix", requestId, req });
  
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  log.info("request_start");

  try {
    let rawBody: unknown;
    try { 
      rawBody = await req.json(); 
    } catch {
      log.warn("invalid_json_body");
      return log.respond(new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      }));
    }

    const parsed = SyncQuoteBitrixSchema.safeParse(rawBody);
    if (!parsed.success) {
      log.warn("validation_failed", { errors: parsed.error.flatten().fieldErrors });
      return log.respond(new Response(JSON.stringify({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      }));
    }

    const {
      quoteId,
      pdfPath,
    } = parsed.data;

    const auth = await authorize(req, { requireRole: "agente", enforceServerSide: true });
    if (!auth.ok) return log.respond(auth.response);

    const { data: quoteRow, error: quoteError } = await auth.supabaseUser
      .from("quotes")
      .select("id, seller_id, quote_number, client_name, client_company, client_id, discount_percent, internal_notes, shipping_type, shipping_cost")
      .eq("id", quoteId)
      .maybeSingle();
    if (quoteError) throw quoteError;
    if (!quoteRow) {
      return log.respond(new Response(JSON.stringify({ success: false, error: "Orçamento não encontrado ou fora do seu escopo." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      }));
    }
    const quote = quoteRow as StoredQuote;
    if (auth.role === "agente" && quote.seller_id !== auth.user.id) {
      return log.respond(new Response(JSON.stringify({ success: false, error: "Você não possui acesso a este orçamento." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      }));
    }

    const { data: itemRows, error: itemError } = await auth.supabaseUser
      .from("quote_items")
      .select("id, product_name, product_sku, quantity, unit_price, source_variant_id, color_name")
      .eq("quote_id", quote.id)
      .order("sort_order", { ascending: true });
    if (itemError) throw itemError;
    const items = (itemRows ?? []) as StoredQuoteItem[];
    if (!items.length) {
      return log.respond(new Response(JSON.stringify({ success: false, error: "O orçamento não possui itens para sincronizar." }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      }));
    }

    const itemIds = items.map((item) => item.id);
    const { data: personalizationRows, error: personalizationError } = await auth.supabaseUser
      .from("quote_item_personalizations")
      .select("quote_item_id, technique_name, total_cost, setup_cost, width_cm, height_cm, area_cm2, notes")
      .in("quote_item_id", itemIds);
    if (personalizationError) throw personalizationError;
    const personalizationsByItem = new Map<string, StoredPersonalization[]>();
    for (const personalization of (personalizationRows ?? []) as StoredPersonalization[]) {
      const current = personalizationsByItem.get(personalization.quote_item_id) ?? [];
      current.push(personalization);
      personalizationsByItem.set(personalization.quote_item_id, current);
    }

    const { companyId, productIds } = await resolveBitrixTargets(quote, items);
    const pdf = buildTrustedPdfUrl(quote.id, pdfPath);

    // ── 1. Validate secrets ──────────────────────────────────────────────
    const webhookUrl = Deno.env.get("N8N_QUOTE_WEBHOOK_URL");
    if (!webhookUrl) {
      log.error("missing_webhook_url_secret");
      throw new Error("N8N_QUOTE_WEBHOOK_URL não configurado nos secrets");
    }

    // ── 2. Resolve seller_id ─────────────────────────────────────────────────
    const sellerId = auth.user.email ? SELLER_EMAIL_MAP[auth.user.email] : undefined;
    if (auth.user.email && sellerId === undefined) {
      log.warn("seller_not_found_in_map");
    }

    // ── 3. bitrix_quote_id não é enviado: o n8n decide criar ou atualizar. ───
    // Spec v3: o n8n busca pelo quote_id (código interno) no Bitrix e resolve sozinho
    // se deve criar ou atualizar. O gifts-store não precisa manter o ID do Bitrix.

    // ── 5. Build products array ──────────────────────────────────────────────
    // offer_id is null if not mapped — n8n handles this gracefully
    const rawItems = items.map((item) => ({
      ...item,
      bitrix_product_id: item.source_variant_id ? productIds.get(item.source_variant_id) ?? null : null,
      name: item.product_name,
      supplier_sku: item.product_sku,
      personalizations: personalizationsByItem.get(item.id) ?? [],
    }));

    // ── Spec §3: excluir itens sem bitrix_product_id (ainda não importados no Bitrix24) ──
    const itemsValidos = rawItems.filter((item: any) => !!item.bitrix_product_id);
    const itemsExcluidos = rawItems.length - itemsValidos.length;
    if (itemsExcluidos > 0) {
      log.warn("items_excluded_no_bitrix_id", { count: itemsExcluidos });
    }
    if (itemsValidos.length === 0) {
      log.warn("no_valid_items_to_sync");
      throw new Error("Nenhum produto da proposta possui ID no Bitrix24 (bitrix_product_id nulo em todos os itens). Aguarde a importação do catálogo.");
    }

    const products = itemsValidos.map((item: any) => {
      // Spec §6.2: offer_id = product_variants.bitrix_product_id (obrigatório)
      const offerId = Number(item.bitrix_product_id);
      if (!Number.isFinite(offerId) || offerId <= 0) {
        log.warn("item_ignored_invalid_offer_id", { bitrix_product_id: item.bitrix_product_id, name: item.name });
        return null;
      }

      const baseName = item.name || item.product_name || "Produto";
      const colorSuffix = item.color ? ` - ${item.color}` : "";
      const productName = `${baseName}${colorSuffix}`;

      const sku = item.supplier_sku || item.composedCode || item.sku || item.product_sku || "";

      const qty = Number(item.quantity ?? 1);
      if (!Number.isFinite(qty) || qty <= 0) {
        log.warn("item_ignored_invalid_quantity", { quantity: item.quantity, name: baseName });
        return null;
      }

      // Spec v3.4: price = preço unitário SÓ DO PRODUTO (sem gravação, sem desconto)
      const unitPrice = Number(item.unitPrice ?? item.unit_price ?? 0);

      const product: any = {
        offer_id: offerId,
        product_name: productName,
        sku,
        price: Math.round(unitPrice * 10000) / 10000,
        quantity: qty,
      };

      // Gravação (engraving) — valores do banco, sem recalcular
      // DB fields: unit_cost (preço unitário c/ markup), total_cost (MAX(valor_gravacao, setup)),
      //            setup_cost (custo de setup c/ markup)
      const allPers = item.personalizations || [];
      if (allPers.length > 0) {
        // Support multiple personalizations: aggregate all into one engraving block
        const engravings = allPers.map((pers: any) => {
          // total_cost from DB is the source of truth (includes markup + min billing)
          // unit_price = total_cost / qty rounded to 2 decimals — matches UI display
          const engravingTotal = Number(pers.total_cost ?? 0);
          const engravingUnit = qty > 0 ? Math.round((engravingTotal / qty) * 100) / 100 : 0;
          const setupPrice = Number(pers.setup_cost ?? 0);

          // size: try structured fields first, then parse from notes "Local — CODE | WxHcm"
          let sizeStr = "";
          if (pers.width_cm != null && pers.height_cm != null) {
            sizeStr = `${pers.width_cm}x${pers.height_cm}cm`;
          } else if (pers.area_cm2 != null) {
            sizeStr = `${pers.area_cm2}cm²`;
          } else if (pers.notes) {
            const dimMatch = String(pers.notes).match(/\|\s*([\d.,]+)\s*[x×]\s*([\d.,]+)\s*cm/i);
            if (dimMatch) {
              sizeStr = `${dimMatch[1]}x${dimMatch[2]}cm`;
            }
          }

          // engraving.type = "Technique | Location"
          let engravingType = pers.technique_name || "Personalização";
          if (pers.notes) {
            const notesRaw = String(pers.notes);
            const [locationPart] = notesRaw.split(" | ");
            if (locationPart) {
              const locationName = locationPart.split(" — ")[0]?.trim();
              if (locationName) {
                engravingType = `${engravingType} | ${locationName}`;
              }
            }
          }

          // Recalculate total from rounded unit to ensure subtotal parity with proposal
          const engravingTotalRounded = engravingUnit * qty;

          return {
            type: engravingType,
            unit_price: engravingUnit,
            total_price: Math.round(engravingTotalRounded * 100) / 100,
            setup_price: setupPrice,
            size: sizeStr,
          };
        });

        // Primary engraving (first one) — backward compatible
        product.engraving = engravings[0];

        // If multiple, attach full array
        if (engravings.length > 1) {
          product.engravings = engravings;
        }
      }

      return product;
    }).filter((p: any) => p !== null);

    if (products.length === 0) {
      log.warn("all_items_rejected");
      throw new Error("Todos os itens foram rejeitados por dados inválidos (offer_id ou quantity). Verifique os dados dos produtos.");
    }

    // ── 6. Assemble final payload ────────────────────────────────────────────
    const rawClientName =
      quote.client_company ||
      quote.client_name ||
      "Cliente";

    // Fix #4: Remove trailing " - XXXX" (bitrix_id suffix) to avoid duplication in title
    const clientName = rawClientName.replace(/\s*-\s*\d+\s*$/, "").trim();

    const payload: Record<string, unknown> = {
      title: `Orçamento - ${clientName} - ${companyId}`,
      company_id: companyId,
      products,
    };

    // Only include optional fields when resolved
    if (sellerId) payload.seller_id = sellerId;

    // Spec v3: quote_id = código interno do gifts-store (ex: "10001/26")
    const internalQuoteId = quote.quote_number.replace(/\s+/g, "");
    if (internalQuoteId) payload.quote_id = internalQuoteId;

    // Spec v3.4: discount_percentage — desconto global em % (ex: 5, 10, 15)
    const rawDiscount = Number(quote.discount_percent ?? 0);
    if (Number.isFinite(rawDiscount) && rawDiscount > 0) {
      payload.discount_percentage = rawDiscount;
    }

    // Spec v3.4: freight — from direct shippingType/shippingCost fields (decoded by frontend)
    // Fallback: parse from internal_notes marker |||FRETE:tipo:custo|||
    let resolvedFreightType: string | null = null;
    let resolvedFreightValue: number | null = null;

    if (quote.shipping_type) {
      // Direct fields from frontend (preferred)
      const typeMap: Record<string, string> = { cif: "CIF", fob: "FOB", fob_pre: "FOB_PRE" };
      resolvedFreightType = typeMap[quote.shipping_type.toLowerCase()] || null;
      resolvedFreightValue = Number(quote.shipping_cost) || null;
    } else {
      // Fallback: parse from internal_notes marker
      const freightMatch = String(quote.internal_notes || "").match(/\|\|\|FRETE:([^:]+):([^|]*)\|\|\|/);
      if (freightMatch) {
        const freightTypeMap: Record<string, string> = { CIF: "CIF", FOB: "FOB", FOB_PRE: "FOB_PRE" };
        resolvedFreightType = freightTypeMap[freightMatch[1].toUpperCase()] || null;
        resolvedFreightValue = parseFloat(freightMatch[2]) || null;
      }
    }

    if (resolvedFreightType) {
      const freight: Record<string, unknown> = { type: resolvedFreightType };
      if (resolvedFreightValue && Number.isFinite(resolvedFreightValue) && resolvedFreightValue > 0) {
        // If type is FOB but has a value, upgrade to FOB_PRE
        if (resolvedFreightType === "FOB") {
          freight.type = "FOB_PRE";
        }
        freight.value = resolvedFreightValue;
      }
      payload.freight = freight;
    }

    if (pdf) payload.pdf = pdf;

    // ── 7. Log payload overview ──────────────────────────────────────────
    log.info("payload_ready", {
      title: payload.title,
      products_count: products.length,
      has_pdf: !!payload.pdf,
      company_id: companyId
    });

    // ── 8. Call n8n webhook ──────────────────────────────────────────────────
    const response = await fetchWithBreaker("bitrix", webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    let result: unknown;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      result = await response.json();
    } else {
      const text = await response.text();
      result = { raw: text };
    }

    log.info("n8n_response", { status: response.status });

    if (!response.ok) {
      const errMsg = (result as any)?.error || (result as any)?.raw || `HTTP ${response.status}`;
      log.error("n8n_failed", { error: errMsg, status: response.status });
      throw new Error(errMsg);
    }

    await recordSuccessfulSync(auth.supabaseAdmin, quote.id, result as BitrixResult | undefined);

    return log.respond(new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }));

  } catch (error: unknown) {
    if (error instanceof CircuitOpenError) {
      log.warn("circuit_breaker_open");
      return log.respond(circuitOpenResponse(error, corsHeaders));
    }
    const status = error instanceof SyncQuoteError ? error.status : 500;
    log.error("request_failed", { err: error });
    const publicMessage = status < 500 ? "Não foi possível sincronizar este orçamento." : "Erro interno ao sincronizar o orçamento.";
    return log.respond(new Response(
      JSON.stringify({ success: false, error: publicMessage }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    ));
  }
});
