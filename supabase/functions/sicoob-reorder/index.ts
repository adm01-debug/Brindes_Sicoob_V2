import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";
import {
  buildVerifiedReorderItems,
  type CatalogProduct,
  type CatalogVariant,
  type SourceItem,
} from "./catalog.ts";

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
        select: "id,name,sku,sale_price,base_price,primary_image_url,is_active,active,stock_quantity,min_quantity",
        filters: { id: productIds },
        limit: Math.min(productIds.length, 100),
      },
    });
    if (productBridge.error) throw productBridge.error;
    const products = bridgeRecords<CatalogProduct>(productBridge.data);

    const variantIds = [...new Set(items.map(item => item.variant_id).filter((id): id is string => Boolean(id)))];
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
    const currentItems = buildVerifiedReorderItems(items, products, variants, checkedAt);

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
