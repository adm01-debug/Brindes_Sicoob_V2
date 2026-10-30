import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { withStructuredLogging } from '../_shared/structured-logger.ts';
import {
  catalogFunctionErrorResponse,
  createExternalCatalogClient,
  prepareAuthenticatedCatalogRequest,
} from '../_shared/catalog-client.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import {
  EXTERNAL_ACTIVE_PRODUCT_FILTER,
  EXTERNAL_PRODUCT_CORE_SELECT,
} from '../_shared/external-product-contract.ts';
import {
  buildVerifiedPersonalization,
  type VerifiedKitLine,
} from '../sicoob-kit-quote/catalog.ts';
import {
  verifyQuoteCatalogItem,
  type QuoteCatalogProduct,
  type QuoteCatalogVariant,
  type VerifiedSnapshot,
} from './contract.ts';

type JsonObject = Record<string, unknown>;

interface QuoteAttestationBody {
  quoteId?: unknown;
  expectedRowVersion?: unknown;
  quote?: unknown;
  items?: unknown;
  history?: unknown;
}

function json(req: Request, body: JsonObject, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  });
}

function isRecord(value: unknown): value is JsonObject {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function numberOrNull(value: unknown): number | null {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function closeMoney(value: unknown, expected: number): boolean {
  const number = numberOrNull(value);
  return number !== null && Math.abs(number - expected) <= 0.005;
}

function unwrapRpc(value: unknown): unknown {
  if (!isRecord(value)) return value;
  if ('success' in value && 'data' in value) return value.data;
  if (isRecord(value.data) && 'success' in value.data && 'data' in value.data) return value.data.data;
  return value.data ?? value;
}

async function selectProducts(external: NonNullable<Awaited<ReturnType<typeof createExternalCatalogClient>>>, ids: string[]) {
  let query = await external.from('products')
    .select(`${EXTERNAL_PRODUCT_CORE_SELECT},cost_price`)
    .in('id', ids).match(EXTERNAL_ACTIVE_PRODUCT_FILTER).limit(ids.length);
  if (query.error?.code === '42703') {
    query = await external.from('products').select(EXTERNAL_PRODUCT_CORE_SELECT)
      .in('id', ids).match(EXTERNAL_ACTIVE_PRODUCT_FILTER).limit(ids.length);
  }
  if (query.error) throw query.error;
  return (query.data ?? []) as QuoteCatalogProduct[];
}

async function selectVariants(external: NonNullable<Awaited<ReturnType<typeof createExternalCatalogClient>>>, ids: string[]) {
  if (!ids.length) return [] as QuoteCatalogVariant[];
  let query = await external.from('product_variants')
    .select('id,product_id,sku,sale_price,cost_price,color_name,color_hex,size_code,selected_thumbnail,is_active')
    .in('id', ids).limit(ids.length);
  if (query.error?.code === '42703') {
    query = await external.from('product_variants')
      .select('id,product_id,sku,sale_price,color_name,color_hex,size_code,selected_thumbnail,is_active')
      .in('id', ids).limit(ids.length);
  }
  if (query.error) throw query.error;
  return (query.data ?? []) as QuoteCatalogVariant[];
}

async function validatePersonalizations(
  external: NonNullable<Awaited<ReturnType<typeof createExternalCatalogClient>>>,
  item: JsonObject,
): Promise<void> {
  const personalizations = Array.isArray(item.personalizations) ? item.personalizations : [];
  for (const raw of personalizations) {
    if (!isRecord(raw)) throw new Error('Uma personalização do orçamento possui formato inválido.');
    const techniqueId = typeof raw.technique_id === 'string' ? raw.technique_id.trim() : '';
    const productId = typeof item.product_id === 'string' ? item.product_id : '';
    const quantity = numberOrNull(raw.personalized_quantity) ?? numberOrNull(item.quantity);
    const colors = numberOrNull(raw.colors_count) ?? 1;
    const positions = numberOrNull(raw.positions_count) ?? 1;
    const width = numberOrNull(raw.width_cm);
    const height = numberOrNull(raw.height_cm);
    if (!techniqueId || !productId || !Number.isInteger(quantity) || quantity! <= 0
        || !Number.isInteger(colors) || colors <= 0 || !Number.isInteger(positions) || positions <= 0) {
      throw new Error('A técnica, quantidade ou configuração de personalização é inválida.');
    }
    const [optionsResult, priceResult] = await Promise.all([
      external.rpc('fn_get_product_customization_options', { p_product_id: productId }),
      external.rpc('fn_get_customization_price', {
        p_area_id: techniqueId,
        p_quantidade: quantity,
        p_num_cores: colors,
        ...(width ? { p_largura_cm: width } : {}),
        ...(height ? { p_altura_cm: height } : {}),
      }),
    ]);
    if (optionsResult.error) throw optionsResult.error;
    if (priceResult.error) throw priceResult.error;

    const line: VerifiedKitLine = {
      line_id: typeof item.id === 'string' ? item.id : productId,
      kind: 'item',
      product_id: productId,
      product_name: typeof item.product_name === 'string' ? item.product_name : '',
      product_sku: typeof item.product_sku === 'string' ? item.product_sku : null,
      product_image_url: typeof item.product_image_url === 'string' ? item.product_image_url : null,
      quantity: quantity!,
      unit_price: numberOrNull(item.unit_price) ?? 0,
      minimum_quantity: 1,
      source_variant_id: typeof item.source_variant_id === 'string' ? item.source_variant_id : null,
      source_variant_sku: typeof item.source_variant_sku === 'string' ? item.source_variant_sku : null,
      color_name: typeof item.color_name === 'string' ? item.color_name : null,
      color_hex: typeof item.color_hex === 'string' ? item.color_hex : null,
      size_code: typeof item.size_code === 'string' ? item.size_code : null,
      catalog_checked_at: new Date().toISOString(),
    };
    const verified = buildVerifiedPersonalization(
      { techniqueId, colors, width, height },
      line,
      unwrapRpc(optionsResult.data),
      unwrapRpc(priceResult.data),
      line.catalog_checked_at,
    );
    if (!closeMoney(raw.unit_cost, verified.unit_cost * positions)
        || !closeMoney(raw.setup_cost, verified.setup_cost * positions)
        || !closeMoney(raw.total_cost, verified.total_cost * positions)
        || (raw.technique_name != null && raw.technique_name !== verified.technique_name)) {
      throw new Error('O preço da personalização diverge da tabela vigente. Atualize a personalização.');
    }
  }
}

Deno.serve(withStructuredLogging('quote-price-attestation', async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: getCorsHeaders(req) });
  if (req.method !== 'POST') return json(req, { error: 'Método não permitido.' }, 405);
  const auth = await prepareAuthenticatedCatalogRequest(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json() as QuoteAttestationBody;
    if (!isRecord(body.quote) || !Array.isArray(body.items) || body.items.length === 0
        || body.items.length > 200 || !Array.isArray(body.history)) {
      return json(req, { error: 'O conteúdo do orçamento não pode ser atestado.' }, 400);
    }
    const quote = body.quote as JsonObject;
    const items = body.items.filter(isRecord);
    if (items.length !== body.items.length) return json(req, { error: 'Há itens inválidos no orçamento.' }, 400);
    const quoteId = typeof body.quoteId === 'string' ? body.quoteId : null;
    const expectedRowVersion = body.expectedRowVersion == null ? null : Number(body.expectedRowVersion);
    if ((quoteId === null && expectedRowVersion !== null)
        || (quoteId !== null && (!Number.isInteger(expectedRowVersion) || expectedRowVersion! <= 0))) {
      return json(req, { error: 'A versão informada para editar o orçamento é inválida.' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authorization = req.headers.get('Authorization');
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization) {
      return json(req, { error: 'O serviço de orçamento não está configurado.' }, 503);
    }
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    let previousById = new Map<string, VerifiedSnapshot>();
    if (quoteId) {
      const { data: currentQuote, error: quoteError } = await userClient.from('quotes')
        .select('id,row_version').eq('id', quoteId).maybeSingle();
      if (quoteError) throw quoteError;
      if (!currentQuote) return json(req, { error: 'Orçamento não encontrado ou sem acesso.' }, 404);
      if (currentQuote.row_version !== expectedRowVersion) {
        return json(req, { error: 'O orçamento mudou; atualize a página antes de validar os preços.' }, 409);
      }
      const { data: previousItems, error: itemsError } = await userClient.from('quote_items')
        .select('id,product_id,source_variant_id,unit_price,unit_cost').eq('quote_id', quoteId);
      if (itemsError) throw itemsError;
      previousById = new Map((previousItems ?? []).map((row) => [row.id, {
        product_id: row.product_id ?? '',
        source_variant_id: row.source_variant_id ?? null,
        unit_price: Number(row.unit_price),
        unit_cost: Number(row.unit_cost ?? 0),
      }]));
    }

    const productIds = [...new Set(items.map((item) => String(item.product_id ?? '')).filter(Boolean))];
    const variantIds = [...new Set(items.map((item) => String(item.source_variant_id ?? '')).filter(Boolean))];
    if (!productIds.length || productIds.length > 200 || variantIds.length > 200) {
      return json(req, { error: 'A quantidade de produtos ou variantes é inválida.' }, 400);
    }
    const external = await createExternalCatalogClient();
    if (!external) return json(req, { error: 'O catálogo Promobrind não está disponível para validar preços.' }, 503);
    const [products, variants] = await Promise.all([
      selectProducts(external, productIds), selectVariants(external, variantIds),
    ]);
    if (products.length !== productIds.length || variants.length !== variantIds.length) {
      return json(req, { error: 'O catálogo não confirmou todos os produtos e variantes do orçamento.' }, 409);
    }
    const productsById = new Map(products.map((product) => [product.id, product]));
    const variantsById = new Map(variants.map((variant) => [variant.id, variant]));
    for (const item of items) {
      const itemId = typeof item.id === 'string' ? item.id : null;
      const previous = itemId ? previousById.get(itemId) : undefined;
      if (itemId && !previous) return json(req, { error: 'Um item do orçamento não pertence à versão carregada.' }, 409);
      verifyQuoteCatalogItem(
        item as never,
        productsById.get(String(item.product_id ?? '')),
        item.source_variant_id ? variantsById.get(String(item.source_variant_id)) : undefined,
        previous,
      );
      await validatePersonalizations(external, item);
    }

    const { data: attestationId, error: attestationError } = await adminClient.rpc(
      'register_quote_price_attestation',
      {
        p_actor_id: auth.userId,
        p_quote_id: quoteId,
        p_expected_row_version: expectedRowVersion,
        p_quote: quote,
        p_items: items,
        p_history: body.history,
      },
    );
    if (attestationError) throw attestationError;
    if (typeof attestationId !== 'string') throw new Error('O banco não retornou o atestado de preço.');
    return json(req, { attestationId, expiresInSeconds: 300 });
  } catch (error) {
    return catalogFunctionErrorResponse(error, getCorsHeaders(req), 'quote-price-attestation');
  }
}));
