import { withStructuredLogging } from "../_shared/structured-logger.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { getCorsHeaders, handleCorsPreflightIfNeeded } from '../_shared/cors.ts';
import {
  buildVerifiedKitLines,
  buildVerifiedPersonalization,
  assertCompleteVariantCatalog,
  type CatalogProduct,
  type CatalogVariant,
  type KitLineRequest,
  type VerifiedKitLine,
  type VerifiedKitPersonalization,
} from './catalog.ts';
import { hashKitQuoteIntent } from './idempotency.ts';

interface KitQuoteBody {
  kitName?: unknown;
  kitType?: unknown;
  kitQuantity?: unknown;
  identityTag?: unknown;
  idempotencyKey?: unknown;
  lines?: unknown;
}

function json(req: Request, body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  });
}

function bridgeRecords<T>(payload: unknown): T[] {
  if (!payload || typeof payload !== 'object') return [];
  const direct = (payload as { data?: { records?: T[] } }).data?.records;
  if (Array.isArray(direct)) return direct;
  const nested = (payload as { data?: { data?: { records?: T[] } } }).data?.data?.records;
  return Array.isArray(nested) ? nested : [];
}

function bridgeCount(payload: unknown): number | null {
  if (!payload || typeof payload !== 'object') return null;
  const direct = (payload as { data?: { count?: unknown } }).data?.count;
  if (typeof direct === 'number') return direct;
  const nested = (payload as { data?: { data?: { count?: unknown } } }).data?.data?.count;
  return typeof nested === 'number' ? nested : null;
}

function bridgeRpcData(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') return null;
  const response = payload as { success?: unknown; data?: unknown };
  if ('success' in response) return response.data ?? null;
  if (response.data && typeof response.data === 'object') {
    const nested = response.data as { success?: unknown; data?: unknown };
    if ('success' in nested) return nested.data ?? null;
  }
  return response.data ?? null;
}

function validLine(value: unknown): value is KitLineRequest {
  if (!value || typeof value !== 'object') return false;
  const line = value as Record<string, unknown>;
  if (typeof line.lineId !== 'string' || typeof line.productId !== 'string') return false;
  if (line.kind !== 'box' && line.kind !== 'item') return false;
  if (!Number.isInteger(line.unitsPerKit)) return false;
  if (line.variantId != null && typeof line.variantId !== 'string') return false;
  if (line.personalization == null) return true;
  if (typeof line.personalization !== 'object') return false;
  const personalization = line.personalization as Record<string, unknown>;
  return typeof personalization.techniqueId === 'string';
}

Deno.serve(withStructuredLogging("sicoob-kit-quote", async (req) => {
  const preflight = handleCorsPreflightIfNeeded(req);
  if (preflight) return preflight;
  if (req.method !== 'POST') return json(req, { error: 'Método não permitido.' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authorization = req.headers.get('Authorization');
    if (!supabaseUrl || !anonKey || !serviceKey || !authorization) {
      return json(req, { error: 'Autenticação necessária para criar o orçamento.' }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return json(req, { error: 'Sessão inválida ou expirada.' }, 401);

    const invokeExternalRpc = async (rpcName: string, rpcParams: Record<string, unknown>): Promise<unknown> => {
      const response = await userClient.functions.invoke('external-db-bridge', {
        body: { operation: 'rpc', rpcName, rpcParams },
      });
      if (response.error) throw response.error;
      const data = bridgeRpcData(response.data);
      if (!data) throw new Error(`O catálogo não respondeu à consulta ${rpcName}.`);
      return data;
    };

    const body = await req.json() as KitQuoteBody;
    const kitName = typeof body.kitName === 'string' ? body.kitName.trim() : '';
    const kitType = typeof body.kitType === 'string' ? body.kitType : '';
    const identityTag = typeof body.identityTag === 'string' ? body.identityTag.trim() : '';
    const kitQuantity = Number(body.kitQuantity);
    const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey.trim() : '';
    if (!kitName || kitName.length > 120 || !['montado', 'original', 'simples'].includes(kitType)) {
      return json(req, { error: 'Nome ou tipo do kit inválido.' }, 400);
    }
    if (identityTag.length > 60 || idempotencyKey.length < 8 || idempotencyKey.length > 128) {
      return json(req, { error: 'Identidade ou chave de idempotência inválida.' }, 400);
    }
    if (!Array.isArray(body.lines) || !body.lines.every(validLine)) {
      return json(req, { error: 'A composição do kit é inválida.' }, 400);
    }

    const lines = body.lines as KitLineRequest[];
    const productIds = [...new Set(lines.map((line) => line.productId))];
    if (!productIds.length || productIds.length > 50) return json(req, { error: 'Quantidade de produtos inválida.' }, 400);

    // A identidade representa somente a intenção do cliente. Preço, nome,
    // estoque e timestamps mudam entre consultas e não podem invalidar o retry.
    const requestHash = await hashKitQuoteIntent({ kitName, kitType, kitQuantity, identityTag, lines });
    const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const existingRequest = await adminClient.rpc('get_sicoob_kit_quote_idempotency', {
      p_actor_id: authData.user.id,
      p_idempotency_key: idempotencyKey,
      p_request_hash: requestHash,
    });
    if (existingRequest.error) throw existingRequest.error;
    if (existingRequest.data) {
      const existing = existingRequest.data as Record<string, unknown>;
      return json(req, {
        quoteId: existing.quote_id,
        quoteNumber: existing.quote_number,
        total: existing.total,
        catalogCheckedAt: null,
        stockReserved: false,
        idempotentReplay: true,
      });
    }

    const [productBridge, variantBridge] = await Promise.all([
      userClient.functions.invoke('external-db-bridge', {
        body: {
          table: 'products',
          operation: 'select',
          select: 'id,name,sku,sale_price,base_price,primary_image_url,image_url,is_active,active,stock_quantity,min_quantity',
          filters: { id: productIds, active: true },
          limit: productIds.length,
        },
      }),
      userClient.functions.invoke('external-db-bridge', {
        body: {
          table: 'product_variants',
          operation: 'select',
          select: 'id,product_id,sku,sale_price,color_name,color_hex,size_code,stock_quantity,selected_thumbnail,is_active',
          filters: { product_id: productIds, is_active: true },
          limit: 500,
          countMode: 'exact',
        },
      }),
    ]);
    if (productBridge.error) throw productBridge.error;
    if (variantBridge.error) throw variantBridge.error;

    const productRecords = bridgeRecords<CatalogProduct>(productBridge.data);
    const variantRecords = bridgeRecords<CatalogVariant>(variantBridge.data);
    const variantCount = bridgeCount(variantBridge.data);
    assertCompleteVariantCatalog(variantCount, variantRecords);

    const checkedAt = new Date().toISOString();
    const verifiedLines = buildVerifiedKitLines(
      lines,
      productRecords,
      variantRecords,
      kitQuantity,
      checkedAt,
    );

    const verifiedPersonalizations: VerifiedKitPersonalization[] = [];
    for (const requestedLine of lines) {
      if (!requestedLine.personalization) continue;
      const verifiedLine = verifiedLines.find((line: VerifiedKitLine) => line.line_id === requestedLine.lineId);
      if (!verifiedLine) throw new Error('A personalização não corresponde a um item do kit.');

      const [options, price] = await Promise.all([
        invokeExternalRpc('fn_get_product_customization_options', {
          p_product_id: verifiedLine.product_id,
        }),
        invokeExternalRpc('fn_get_customization_price', {
          p_area_id: requestedLine.personalization.techniqueId,
          p_quantidade: verifiedLine.quantity,
          p_num_cores: requestedLine.personalization.colors ?? 1,
          ...(requestedLine.personalization.width ? { p_largura_cm: requestedLine.personalization.width } : {}),
          ...(requestedLine.personalization.height ? { p_altura_cm: requestedLine.personalization.height } : {}),
        }),
      ]);
      verifiedPersonalizations.push(buildVerifiedPersonalization(
        requestedLine.personalization,
        verifiedLine,
        options,
        price,
        checkedAt,
      ));
    }

    const { data, error } = await adminClient.rpc('create_sicoob_kit_quote', {
      p_kit: {
        name: kitName,
        type: kitType,
        quantity: kitQuantity,
        identity_tag: identityTag || null,
      },
      p_items: verifiedLines,
      p_personalizations: verifiedPersonalizations,
      p_idempotency_key: idempotencyKey,
      p_actor_id: authData.user.id,
      p_request_hash: requestHash,
    });
    if (error) throw error;
    const result = data && typeof data === 'object' ? data as Record<string, unknown> : {};
    if (typeof result.quote_id !== 'string') throw new Error('O banco não confirmou a criação do orçamento.');

    return json(req, {
      quoteId: result.quote_id,
      quoteNumber: result.quote_number,
      total: result.total,
      catalogCheckedAt: checkedAt,
      stockReserved: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível criar o orçamento do kit.';
    return json(req, { error: message }, 400);
  }
}));
