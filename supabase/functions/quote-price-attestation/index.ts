import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { withStructuredLogging } from '../_shared/structured-logger.ts';
import {
  createExternalCatalogClient,
  prepareAuthenticatedCatalogRequest,
} from '../_shared/catalog-client.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import {
  EXTERNAL_PRODUCT_CORE_SELECT,
} from '../_shared/external-product-contract.ts';
import {
  buildVerifiedPersonalization,
  type VerifiedKitLine,
} from '../sicoob-kit-quote/catalog.ts';
import {
  isQuoteCatalogSnapshotUnchanged,
  readBoundedBody,
  unwrapSuccessfulRpcEnvelope,
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
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) return null;
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function closeMoney(value: unknown, expected: number): boolean {
  const number = numberOrNull(value);
  return number !== null && number === expected;
}

class CatalogUnavailableError extends Error {}

const PERSONALIZATION_SNAPSHOT_FIELDS = [
  'technique_id', 'technique_name', 'colors_count', 'positions_count', 'area_cm2',
  'width_cm', 'height_cm', 'personalized_quantity', 'setup_cost', 'unit_cost', 'total_cost', 'notes',
] as const;

function samePersonalizationSnapshot(requested: unknown, saved: unknown): boolean {
  const normalize = (value: unknown) => (Array.isArray(value) ? value : []).map((entry) => {
    const row = isRecord(entry) ? entry : {};
    return Object.fromEntries(PERSONALIZATION_SNAPSHOT_FIELDS.map((field) => {
      if (field === 'colors_count' || field === 'positions_count') {
        return [field, numberOrNull(row[field]) ?? 1];
      }
      if (['area_cm2', 'width_cm', 'height_cm', 'personalized_quantity', 'setup_cost', 'unit_cost', 'total_cost'].includes(field)) {
        return [field, numberOrNull(row[field])];
      }
      return [field, typeof row[field] === 'string' && row[field] ? row[field] : null];
    }));
  }).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  return JSON.stringify(normalize(requested)) === JSON.stringify(normalize(saved));
}

async function selectProducts(external: NonNullable<Awaited<ReturnType<typeof createExternalCatalogClient>>>, ids: string[]) {
  const query = await external.from('products').select(`${EXTERNAL_PRODUCT_CORE_SELECT},cost_price,images`)
    .in('id', ids).limit(ids.length);
  if (query.error) throw new CatalogUnavailableError('Falha na consulta de produtos do catálogo.');
  return (query.data ?? []) as unknown as QuoteCatalogProduct[];
}

async function selectVariants(external: NonNullable<Awaited<ReturnType<typeof createExternalCatalogClient>>>, ids: string[]) {
  if (!ids.length) return [] as QuoteCatalogVariant[];
  const [query, imageQuery] = await Promise.all([
    external.from('product_variants')
      .select('id,product_id,sku,supplier_sku,sale_price,color_name,color_hex,size_code,selected_thumbnail,images,is_active')
      .in('id', ids).limit(ids.length),
    external.from('product_images')
      .select('variant_id,url_cdn,image_type')
      .in('variant_id', ids).limit(ids.length * 20),
  ]);
  if (query.error || imageQuery.error) throw new CatalogUnavailableError('Falha na consulta de variantes do catálogo.');
  const imagesByVariant = new Map<string, string[]>();
  for (const image of imageQuery.data ?? []) {
    if (!image.variant_id || !image.url_cdn || image.image_type === 'box') continue;
    const images = imagesByVariant.get(image.variant_id) ?? [];
    images.push(image.url_cdn);
    imagesByVariant.set(image.variant_id, images);
  }
  return (query.data ?? []).map((variant) => ({
    ...variant,
    catalog_image_urls: imagesByVariant.get(variant.id) ?? [],
  })) as unknown as QuoteCatalogVariant[];
}

async function validatePersonalizations(
  external: NonNullable<Awaited<ReturnType<typeof createExternalCatalogClient>>>,
  item: JsonObject,
): Promise<void> {
  const personalizations = Array.isArray(item.personalizations) ? item.personalizations : [];
  const validateOne = async (raw: unknown) => {
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
      external.rpc('fn_get_product_customization_options', { p_product_id: productId }, { get: true }),
      external.rpc('fn_get_customization_price', {
        p_area_id: techniqueId,
        p_quantidade: quantity,
        p_num_cores: colors,
        ...(width ? { p_largura_cm: width } : {}),
        ...(height ? { p_altura_cm: height } : {}),
      }, { get: true }),
    ]);
    if (optionsResult.error || priceResult.error) {
      throw new CatalogUnavailableError('O catálogo não conseguiu consultar as regras de personalização.');
    }

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
      unwrapSuccessfulRpcEnvelope(optionsResult.data),
      unwrapSuccessfulRpcEnvelope(priceResult.data),
      line.catalog_checked_at,
    );
    if (!closeMoney(raw.unit_cost, verified.unit_cost * positions)
        || !closeMoney(raw.setup_cost, verified.setup_cost * positions)
        || !closeMoney(raw.total_cost, verified.total_cost * positions)
        || (raw.technique_name != null && raw.technique_name !== verified.technique_name)) {
      throw new Error('O preço da personalização diverge da tabela vigente. Atualize a personalização.');
    }
  };
  for (let index = 0; index < personalizations.length; index += 5) {
    await Promise.all(personalizations.slice(index, index + 5).map(validateOne));
  }
}

Deno.serve(withStructuredLogging('quote-price-attestation', async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: getCorsHeaders(req) });
  if (req.method !== 'POST') return json(req, { error: 'Método não permitido.' }, 405);
  const auth = await prepareAuthenticatedCatalogRequest(req);
  if (!auth.ok) return auth.response;

  try {
    const rawBody = await readBoundedBody(req, 524_288);
    if (rawBody === null) return json(req, { error: 'O orçamento excede o limite de validação.' }, 413);
    let body: QuoteAttestationBody;
    try {
      body = JSON.parse(rawBody) as QuoteAttestationBody;
    } catch {
      return json(req, { error: 'O corpo da solicitação não contém JSON válido.' }, 400);
    }
    if (!isRecord(body) || !isRecord(body.quote) || !Array.isArray(body.items) || body.items.length === 0
        || body.items.length > 200 || !Array.isArray(body.history)) {
      return json(req, { error: 'O conteúdo do orçamento não pode ser atestado.' }, 400);
    }
    const quote = body.quote as JsonObject;
    const items = body.items.filter(isRecord);
    if (items.length !== body.items.length) return json(req, { error: 'Há itens inválidos no orçamento.' }, 400);
    if (items.some((item) => typeof item.product_id !== 'string' || !item.product_id.trim()
        || typeof item.product_name !== 'string' || !Number.isSafeInteger(item.quantity)
        || Number(item.quantity) <= 0 || Number(item.quantity) > 100_000)) {
      return json(req, { error: 'Há itens com produto, nome ou quantidade inválidos.' }, 400);
    }
    const personalizationCount = items.reduce((count, item) => {
      const personalizations = Array.isArray(item.personalizations) ? item.personalizations : [];
      return count + personalizations.length;
    }, 0);
    if (personalizationCount > 50 || items.some((item) =>
      Array.isArray(item.personalizations) && item.personalizations.length > 10
    )) {
      return json(req, { error: 'O orçamento excede o limite de personalizações por validação.' }, 413);
    }
    if (body.history.length > 100) return json(req, { error: 'O histórico do orçamento excede o limite de validação.' }, 413);
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
    let previousPersonalizationsByItem = new Map<string, Array<Record<string, unknown>>>();
    if (quoteId) {
      const { data: currentQuote, error: quoteError } = await userClient.from('quotes')
        .select('id,row_version').eq('id', quoteId).maybeSingle();
      if (quoteError) throw quoteError;
      if (!currentQuote) return json(req, { error: 'Orçamento não encontrado ou sem acesso.' }, 404);
      if (currentQuote.row_version !== expectedRowVersion) {
        return json(req, { error: 'O orçamento mudou; atualize a página antes de validar os preços.' }, 409);
      }
      const { data: previousItems, error: itemsError } = await userClient.from('quote_items')
        .select('id,product_id,source_variant_id,unit_price,unit_cost,quantity,product_name,product_sku,product_image_url,source_variant_sku,color_name,color_hex,size_code,gender,kit_group_id,kit_name')
        .eq('quote_id', quoteId);
      if (itemsError) throw itemsError;
      previousById = new Map((previousItems ?? []).map((row) => [row.id, {
        product_id: row.product_id ?? '',
        source_variant_id: row.source_variant_id ?? null,
        unit_price: Number(row.unit_price),
        unit_cost: Number(row.unit_cost ?? 0),
        quantity: row.quantity,
        product_name: row.product_name,
        product_sku: row.product_sku ?? null,
        product_image_url: row.product_image_url ?? null,
        source_variant_sku: row.source_variant_sku ?? null,
        color_name: row.color_name ?? null,
        color_hex: row.color_hex ?? null,
        size_code: row.size_code ?? null,
        gender: row.gender ?? null,
        kit_group_id: row.kit_group_id ?? null,
        kit_name: row.kit_name ?? null,
      }]));
      const previousItemIds = (previousItems ?? []).map((row) => row.id);
      if (previousItemIds.length) {
        const { data: previousPersonalizations, error: personalizationsError } = await userClient
          .from('quote_item_personalizations')
          .select('quote_item_id,technique_id,technique_name,colors_count,positions_count,area_cm2,width_cm,height_cm,personalized_quantity,setup_cost,unit_cost,total_cost,notes')
          .in('quote_item_id', previousItemIds);
        if (personalizationsError) throw personalizationsError;
        previousPersonalizationsByItem = new Map();
        for (const row of previousPersonalizations ?? []) {
          const rows = previousPersonalizationsByItem.get(row.quote_item_id) ?? [];
          rows.push(row);
          previousPersonalizationsByItem.set(row.quote_item_id, rows);
        }
      }
    }

    const productIds = [...new Set(items.map((item) => String(item.product_id ?? '')).filter(Boolean))];
    const variantIds = [...new Set(items.map((item) => String(item.source_variant_id ?? '')).filter(Boolean))];
    if (!productIds.length || productIds.length > 200 || variantIds.length > 200) {
      return json(req, { error: 'A quantidade de produtos ou variantes é inválida.' }, 400);
    }
    const catalogItems = items.filter((item) => {
      const itemId = typeof item.id === 'string' ? item.id : null;
      const previous = itemId ? previousById.get(itemId) : undefined;
      return !isQuoteCatalogSnapshotUnchanged(item as never, previous)
        || !samePersonalizationSnapshot(
          item.personalizations,
          itemId ? previousPersonalizationsByItem.get(itemId) ?? [] : [],
        );
    });
    const catalogProductIds = [...new Set(catalogItems.map((item) => String(item.product_id ?? '')).filter(Boolean))];
    const catalogVariantIds = [...new Set(catalogItems.map((item) => String(item.source_variant_id ?? '')).filter(Boolean))];
    let external: Awaited<ReturnType<typeof createExternalCatalogClient>> = null;
    let products: QuoteCatalogProduct[] = [];
    let variants: QuoteCatalogVariant[] = [];
    if (catalogItems.length) {
      external = await createExternalCatalogClient();
      if (!external) return json(req, { error: 'O catálogo Promobrind não está disponível para validar preços.' }, 503);
      [products, variants] = await Promise.all([
        selectProducts(external, catalogProductIds), selectVariants(external, catalogVariantIds),
      ]);
    }
    const productsById = new Map(products.map((product) => [product.id, product]));
    const variantsById = new Map(variants.map((variant) => [variant.id, variant]));
    for (const item of items) {
      const itemId = typeof item.id === 'string' ? item.id : null;
      const previous = itemId ? previousById.get(itemId) : undefined;
      if (itemId && !previous) return json(req, { error: 'Um item do orçamento não pertence à versão carregada.' }, 409);
      const personalizationsUnchanged = samePersonalizationSnapshot(
        item.personalizations,
        itemId ? previousPersonalizationsByItem.get(itemId) ?? [] : [],
      );
      try {
        verifyQuoteCatalogItem(
          item as never,
          productsById.get(String(item.product_id ?? '')),
          item.source_variant_id ? variantsById.get(String(item.source_variant_id)) : undefined,
          previous,
        );
        if (!isQuoteCatalogSnapshotUnchanged(item as never, previous) || !personalizationsUnchanged) {
          if (!external) return json(req, { error: 'O catálogo Promobrind não está disponível para validar preços.' }, 503);
          await validatePersonalizations(external, item);
        }
      } catch (error) {
        if (error instanceof CatalogUnavailableError) {
          return json(req, { error: 'O catálogo está temporariamente indisponível para validar os preços.' }, 503);
        }
        return json(req, {
          error: error instanceof Error ? error.message : 'O preço ou a personalização não foi validado.',
        }, 409);
      }
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
    if (attestationError) {
      console.error('[quote-price-attestation] Não foi possível registrar o atestado.', attestationError.message);
      return json(req, { error: 'Não foi possível registrar a validação de preço. Tente novamente.' }, 503);
    }
    if (typeof attestationId !== 'string') throw new Error('O banco não retornou o atestado de preço.');
    return json(req, { attestationId, expiresInSeconds: 300 });
  } catch (error) {
    console.error('[quote-price-attestation] Falha interna na validação.', error);
    return json(req, { error: 'Não foi possível validar o orçamento. Tente novamente.' }, 500);
  }
}));
