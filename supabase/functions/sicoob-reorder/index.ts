import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

interface SourceItem {
  id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  variant_id: string | null;
  color_name: string | null;
  color_hex: string | null;
  size_code: string | null;
}

interface CatalogProduct {
  id: string;
  name: string;
  sku: string | null;
  sale_price: number | null;
  base_price?: number | null;
  primary_image_url: string | null;
  image_url?: string | null;
  is_active: boolean | null;
  active?: boolean | null;
  stock_quantity: number | null;
  min_quantity: number | null;
}

interface CatalogVariant {
  id: string;
  product_id: string;
  sku: string | null;
  color_name: string | null;
  color_hex: string | null;
  size_code: string | null;
  stock_quantity: number | null;
  selected_thumbnail: string | null;
  is_active: boolean | null;
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

Deno.serve(async (req) => {
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

    const body = await req.json() as { orderId?: unknown; idempotencyKey?: unknown };
    if (typeof body.orderId !== "string" || typeof body.idempotencyKey !== "string") {
      return json(req, { error: "Pedido ou chave de idempotência inválidos." }, 400);
    }

    const { data: order, error: orderError } = await userClient
      .from("sicoob_orders")
      .select("id, status")
      .eq("id", body.orderId)
      .maybeSingle();
    if (orderError || !order) return json(req, { error: "Pedido não encontrado ou fora do seu escopo." }, 404);
    if (order.status !== "completed") return json(req, { error: "Somente pedidos concluídos podem ser refeitos." }, 409);

    const { data: sourceItems, error: itemsError } = await userClient
      .from("sicoob_order_items")
      .select("id, product_id, product_name, quantity, variant_id, color_name, color_hex, size_code")
      .eq("order_id", body.orderId)
      .order("created_at", { ascending: true });
    if (itemsError) throw itemsError;
    if (!sourceItems?.length) return json(req, { error: "O pedido original não possui itens para recompra." }, 409);

    const items = sourceItems as SourceItem[];
    const productIds = [...new Set(items.map(item => item.product_id).filter((id): id is string => Boolean(id)))];
    if (productIds.length !== new Set(items.map(item => item.product_id)).size) {
      return json(req, { error: "Há item sem produto vinculado; revise o pedido antes da recompra." }, 409);
    }

    const productBridge = await userClient.functions.invoke("external-db-bridge", {
      body: {
        table: "products",
        operation: "select",
        select: "id,name,sku,sale_price,primary_image_url,is_active,active,stock_quantity,min_quantity",
        filters: { id: productIds },
        limit: Math.min(productIds.length, 100),
      },
    });
    if (productBridge.error) throw productBridge.error;
    const products = bridgeRecords<CatalogProduct>(productBridge.data);
    const productsById = new Map(products.map(product => [product.id, product]));

    const variantIds = [...new Set(items.map(item => item.variant_id).filter((id): id is string => Boolean(id)))];
    let variants: CatalogVariant[] = [];
    if (variantIds.length) {
      const variantBridge = await userClient.functions.invoke("external-db-bridge", {
        body: {
          table: "product_variants",
          operation: "select",
          select: "id,product_id,sku,color_name,color_hex,size_code,stock_quantity,selected_thumbnail,is_active",
          filters: { id: variantIds },
          limit: Math.min(variantIds.length, 100),
        },
      });
      if (variantBridge.error) throw variantBridge.error;
      variants = bridgeRecords<CatalogVariant>(variantBridge.data);
    }

    const variantsById = new Map(variants.map(variant => [variant.id, variant]));
    const checkedAt = new Date().toISOString();
    const currentItems = items.map(item => {
      const product = item.product_id ? productsById.get(item.product_id) : undefined;
      if (!product || product.is_active === false || product.active === false) {
        throw new Error(`O produto “${item.product_name}” não está mais disponível no catálogo.`);
      }
      const price = Number(product.sale_price ?? product.base_price ?? 0);
      if (!Number.isFinite(price) || price <= 0) throw new Error(`O produto “${product.name}” está sem preço vigente.`);
      const minimum = Number(product.min_quantity ?? 1);
      if (item.quantity < minimum) throw new Error(`A quantidade mínima vigente de “${product.name}” é ${minimum}.`);

      const variant = item.variant_id ? variantsById.get(item.variant_id) : undefined;
      if (item.variant_id && (!variant || variant.product_id !== product.id || variant.is_active === false)) {
        throw new Error(`A variante de “${product.name}” não está mais disponível.`);
      }
      const stock = Number(variant ? variant.stock_quantity : product.stock_quantity);
      if (!Number.isFinite(stock) || stock < item.quantity) throw new Error(`Estoque insuficiente para “${product.name}”.`);

      return {
        source_order_item_id: item.id,
        product_id: product.id,
        product_sku: variant?.sku || product.sku,
        product_name: product.name,
        product_image_url: variant?.selected_thumbnail || product.primary_image_url || product.image_url || null,
        quantity: item.quantity,
        unit_price: price,
        minimum_quantity: minimum,
        source_variant_id: variant?.id || null,
        source_variant_sku: variant?.sku || null,
        color_name: variant?.color_name || item.color_name,
        color_hex: variant?.color_hex || item.color_hex,
        size_code: variant?.size_code || item.size_code,
        catalog_checked_at: checkedAt,
      };
    });

    const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: quoteId, error: reorderError } = await adminClient.rpc("reorder_sicoob_order_as_quote", {
      p_order_id: body.orderId,
      p_items: currentItems,
      p_idempotency_key: body.idempotencyKey,
      p_actor_id: authData.user.id,
    });
    if (reorderError) throw reorderError;
    if (!quoteId) throw new Error("O banco não confirmou a criação do orçamento.");
    return json(req, { quoteId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível refazer o pedido.";
    console.error("[sicoob-reorder] falha", { message });
    return json(req, { error: message }, 400);
  }
});
