import {
  createClient,
  type SupabaseClient as SupabaseJsClient,
} from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";
import { withStructuredLogging } from "../_shared/structured-logger.ts";
import {
  buildVerifiedReorderItems,
  personalizationRequestsFromSnapshot,
  ReorderValidationError,
  type CatalogProduct,
  type CatalogVariant,
  type SourceItem,
} from "./catalog.ts";
import {
  buildVerifiedPersonalization,
  type VerifiedKitPersonalization,
} from "../sicoob-kit-quote/catalog.ts";
import { hashReorderIntent, type ReorderSourceKind } from "./idempotency.ts";

type SupabaseClient = SupabaseJsClient<any, "public", any>;

interface ReorderSource {
  id: string;
  kind: ReorderSourceKind;
  items: SourceItem[];
}

interface ReorderRequestBody {
  orderId?: unknown;
  sourceQuoteId?: unknown;
  revalidateQuoteId?: unknown;
  idempotencyKey?: unknown;
}

function json(req: Request, body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

function bridgeRecords<T>(payload: unknown): T[] {
  if (!payload || typeof payload !== "object") return [];
  const direct = (payload as { data?: { records?: T[] } }).data?.records;
  if (Array.isArray(direct)) return direct;
  const nested = (payload as { data?: { data?: { records?: T[] } } }).data?.data?.records;
  return Array.isArray(nested) ? nested : [];
}

function bridgeRpcData(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") return null;
  const response = payload as { success?: unknown; data?: unknown };
  if ("success" in response) return response.data ?? null;
  if (response.data && typeof response.data === "object") {
    const nested = response.data as { success?: unknown; data?: unknown };
    if ("success" in nested) return nested.data ?? null;
  }
  return response.data ?? null;
}

function sourceProductIds(items: SourceItem[]): string[] {
  const ids = items.map((item) => item.product_id);
  if (ids.some((id) => typeof id !== "string" || !id)) {
    throw new ReorderValidationError("Há item sem produto vinculado; revise a origem antes da recompra.");
  }
  return [...new Set(ids as string[])];
}

async function loadOrderSource(userClient: SupabaseClient, orderId: string): Promise<ReorderSource> {
  const { data: order, error: orderError } = await userClient
    .from("sicoob_orders")
    .select("id, status")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError || !order) {
    throw new ReorderValidationError("Pedido não encontrado ou fora do seu escopo.");
  }
  if (order.status !== "completed") {
    throw new ReorderValidationError("Somente pedidos concluídos podem ser refeitos.");
  }

  const { data, error } = await userClient
    .from("sicoob_order_items")
    .select("id, product_id, product_name, quantity, unit_price, variant_id, color_name, color_hex, size_code, personalization_snapshot")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  if (!data?.length) throw new ReorderValidationError("O pedido original não possui itens para recompra.");
  const items = data as SourceItem[];
  sourceProductIds(items);
  return { id: orderId, kind: "order", items };
}

async function loadQuoteSource(userClient: SupabaseClient, quoteId: string): Promise<ReorderSource> {
  const { data: quote, error: quoteError } = await userClient
    .from("quotes")
    .select("id, status")
    .eq("id", quoteId)
    .maybeSingle();
  if (quoteError || !quote) {
    throw new ReorderValidationError("Orçamento não encontrado ou fora do seu escopo.");
  }
  if (!["approved", "approved_singular", "converted"].includes(quote.status)) {
    throw new ReorderValidationError("Somente orçamentos aprovados podem iniciar uma recompra.");
  }

  const { data: quoteItems, error: itemsError } = await userClient
    .from("quote_items")
    .select("id, product_id, product_name, quantity, unit_price, source_variant_id, color_name, color_hex, size_code")
    .eq("quote_id", quoteId)
    .order("sort_order", { ascending: true });
  if (itemsError) throw itemsError;
  if (!quoteItems?.length) throw new ReorderValidationError("O orçamento original não possui itens para recompra.");

  const quoteItemIds = quoteItems.map((item) => item.id);
  const { data: personalizations, error: personalizationsError } = await userClient
    .from("quote_item_personalizations")
    .select("quote_item_id, technique_id, colors_count, width_cm, height_cm")
    .in("quote_item_id", quoteItemIds);
  if (personalizationsError) throw personalizationsError;

  const items: SourceItem[] = quoteItems.map((item) => ({
    id: item.id,
    product_id: item.product_id,
    product_name: item.product_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    variant_id: item.source_variant_id,
    color_name: item.color_name,
    color_hex: item.color_hex,
    size_code: item.size_code,
    personalization_snapshot: (personalizations ?? [])
      .filter((personalization) => personalization.quote_item_id === item.id)
      .map((personalization) => ({
        technique_id: personalization.technique_id,
        colors_count: personalization.colors_count,
        width_cm: personalization.width_cm,
        height_cm: personalization.height_cm,
      })),
  }));
  sourceProductIds(items);
  return { id: quoteId, kind: "quote", items };
}

async function loadRevalidationSource(userClient: SupabaseClient, quoteId: string): Promise<ReorderSource> {
  const { data: quote, error } = await userClient
    .from("quotes")
    .select("id, status, reorder_source_order_id, reorder_source_quote_id")
    .eq("id", quoteId)
    .maybeSingle();
  if (error || !quote) throw new ReorderValidationError("Orçamento de recompra não encontrado ou fora do seu escopo.");
  if (!["draft", "revision", "rejected", "rejected_singular"].includes(quote.status)) {
    throw new ReorderValidationError("A revalidação só é permitida enquanto a recompra pode ser editada.");
  }
  if (quote.reorder_source_order_id) return loadOrderSource(userClient, quote.reorder_source_order_id);
  if (quote.reorder_source_quote_id) return loadQuoteSource(userClient, quote.reorder_source_quote_id);
  throw new ReorderValidationError("Este orçamento não possui uma origem de recompra auditável.");
}

async function queryCurrentCatalog(userClient: SupabaseClient, source: ReorderSource) {
  const productIds = sourceProductIds(source.items);
  const productBridge = await userClient.functions.invoke("external-db-bridge", {
    body: {
      table: "products",
      operation: "select",
      select: "id,name,sku,sale_price,base_price,primary_image_url,is_active,active,stock_quantity,min_quantity,min_order_quantity,is_stockout,last_stock_update_at,price_updated_at,price_verified_at,price_last_verified_at,price_freshness_threshold_days",
      filters: { id: productIds },
      limit: Math.min(productIds.length, 100),
    },
  });
  if (productBridge.error) throw productBridge.error;
  const products = bridgeRecords<CatalogProduct>(productBridge.data);

  const variantIds = [...new Set(source.items
    .map((item) => item.variant_id)
    .filter((id): id is string => Boolean(id)))];
  let variants: CatalogVariant[] = [];
  if (variantIds.length) {
    const variantBridge = await userClient.functions.invoke("external-db-bridge", {
      body: {
        table: "product_variants",
        operation: "select",
        select: "id,product_id,sku,sale_price,color_name,color_hex,size_code,stock_quantity,selected_thumbnail,is_active",
        filters: { id: variantIds },
        limit: Math.min(variantIds.length, 100),
      },
    });
    if (variantBridge.error) throw variantBridge.error;
    variants = bridgeRecords<CatalogVariant>(variantBridge.data);
  }

  const checkedAt = new Date().toISOString();
  const verifiedItems = buildVerifiedReorderItems(source.items, products, variants, checkedAt);
  const currentItems = [];
  for (const sourceItem of source.items) {
    const verifiedItem = verifiedItems.find((item) => item.source_order_item_id === sourceItem.id);
    if (!verifiedItem) throw new Error("A recompra perdeu a correspondência com um item da origem.");
    const verifiedPersonalizations: VerifiedKitPersonalization[] = [];
    for (const request of personalizationRequestsFromSnapshot(sourceItem.personalization_snapshot)) {
      const [options, price] = await Promise.all([
        userClient.functions.invoke("external-db-bridge", {
          body: {
            operation: "rpc",
            rpcName: "fn_get_product_customization_options",
            rpcParams: { p_product_id: verifiedItem.product_id },
          },
        }),
        userClient.functions.invoke("external-db-bridge", {
          body: {
            operation: "rpc",
            rpcName: "fn_get_customization_price",
            rpcParams: {
              p_area_id: request.techniqueId,
              p_quantidade: verifiedItem.quantity,
              p_num_cores: request.colors ?? 1,
              ...(request.width ? { p_largura_cm: request.width } : {}),
              ...(request.height ? { p_altura_cm: request.height } : {}),
            },
          },
        }),
      ]);
      if (options.error) throw options.error;
      if (price.error) throw price.error;
      try {
        verifiedPersonalizations.push(buildVerifiedPersonalization(
          request,
          { ...verifiedItem, line_id: sourceItem.id, kind: "item" },
          bridgeRpcData(options.data),
          bridgeRpcData(price.data),
          checkedAt,
        ));
      } catch {
        throw new ReorderValidationError("A personalização do item precisa ser revisada antes da recompra.");
      }
    }
    currentItems.push({ ...verifiedItem, personalizations: verifiedPersonalizations });
  }
  return currentItems;
}

async function findIdempotentReplay(
  adminClient: SupabaseClient,
  actorId: string,
  source: ReorderSource,
  idempotencyKey: string,
  requestHash: string,
): Promise<string | null> {
  const rpcName = source.kind === "order"
    ? "get_sicoob_reorder_idempotency"
    : "get_sicoob_quote_reorder_idempotency";
  const sourceArgument = source.kind === "order"
    ? { p_order_id: source.id }
    : { p_quote_id: source.id };
  const result = await adminClient.rpc(rpcName, {
    p_actor_id: actorId,
    ...sourceArgument,
    p_idempotency_key: idempotencyKey,
    p_request_hash: requestHash,
  });
  if (result.error) throw result.error;
  return typeof result.data === "string" ? result.data : null;
}

async function persistReorder(
  adminClient: SupabaseClient,
  actorId: string,
  source: ReorderSource,
  items: unknown[],
  idempotencyKey: string,
  requestHash: string,
): Promise<string> {
  const rpcName = source.kind === "order"
    ? "reorder_sicoob_order_as_quote"
    : "reorder_sicoob_quote_as_quote";
  const sourceArgument = source.kind === "order"
    ? { p_order_id: source.id }
    : { p_quote_id: source.id };
  const result = await adminClient.rpc(rpcName, {
    ...sourceArgument,
    p_items: items,
    p_idempotency_key: idempotencyKey,
    p_actor_id: actorId,
    p_request_hash: requestHash,
  });
  if (result.error) throw result.error;
  if (typeof result.data !== "string") throw new Error("O banco não confirmou a criação do orçamento.");
  return result.data;
}

Deno.serve(withStructuredLogging("sicoob-reorder", async (req) => {
  const preflight = handleCorsPreflightIfNeeded(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return json(req, { error: "Método não permitido." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authorization = req.headers.get("Authorization");
    if (!supabaseUrl || !anonKey || !serviceKey || !authorization) {
      return json(req, { error: "Autenticação necessária para refazer o pedido." }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return json(req, { error: "Sessão inválida ou expirada." }, 401);

    const body = await req.json() as ReorderRequestBody;
    const createSelectors = [body.orderId, body.sourceQuoteId]
      .filter((value) => typeof value === "string");
    const isRevalidation = typeof body.revalidateQuoteId === "string";
    if ((isRevalidation && createSelectors.length > 0) || (!isRevalidation && createSelectors.length !== 1)) {
      return json(req, { error: "Informe uma única origem válida para a recompra." }, 400);
    }

    const source = isRevalidation
      ? await loadRevalidationSource(userClient, body.revalidateQuoteId as string)
      : typeof body.orderId === "string"
        ? await loadOrderSource(userClient, body.orderId)
        : await loadQuoteSource(userClient, body.sourceQuoteId as string);
    const currentItems = await queryCurrentCatalog(userClient, source);
    const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    if (isRevalidation) {
      const result = await adminClient.rpc("refresh_sicoob_reorder_quote", {
        p_quote_id: body.revalidateQuoteId,
        p_items: currentItems,
        p_actor_id: authData.user.id,
      });
      if (result.error) throw result.error;
      return json(req, {
        quoteId: body.revalidateQuoteId,
        revalidated: true,
        catalogValidUntil: currentItems[0]?.catalog_valid_until,
        priceChangedItems: currentItems.filter((item) => item.price_changed).length,
        stockIsReserved: false,
      });
    }

    if (typeof body.idempotencyKey !== "string") {
      return json(req, { error: "Chave de idempotência inválida." }, 400);
    }
    const requestHash = await hashReorderIntent(source.id, source.kind);
    const existingQuoteId = await findIdempotentReplay(
      adminClient,
      authData.user.id,
      source,
      body.idempotencyKey,
      requestHash,
    );
    if (existingQuoteId) {
      return json(req, { quoteId: existingQuoteId, idempotentReplay: true });
    }

    const quoteId = await persistReorder(
      adminClient,
      authData.user.id,
      source,
      currentItems,
      body.idempotencyKey,
      requestHash,
    );
    return json(req, {
      quoteId,
      catalogValidUntil: currentItems[0]?.catalog_valid_until,
      priceChangedItems: currentItems.filter((item) => item.price_changed).length,
      stockIsReserved: false,
    });
  } catch (error) {
    if (error instanceof ReorderValidationError) {
      return json(req, { error: error.message }, 409);
    }
    console.error("[sicoob-reorder] falha operacional", error);
    return json(req, { error: "erro_interno" }, 500);
  }
}));
