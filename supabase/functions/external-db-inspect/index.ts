import { authorize } from "../_shared/authorize.ts";
import { createReadOnlyCatalogFetch } from "../_shared/external-read-only.ts";
import { getCorsHeaders } from '../_shared/cors.ts';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "https://esm.sh/zod@3.23.8";
import { runBotProtection } from '../_shared/bot-protection.ts';

const BodySchema = z.object({
  mode: z.enum(['tables', 'columns']).default('tables'),
  tableName: z.string().trim().min(1).max(100).regex(/^[a-z_][a-z0-9_]*$/i, 'Invalid table name').optional(),
});

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // A edge é exclusiva para dev. Rejeitar primeiro evita que chamadas sem
    // identidade dependam do rate limiter persistido no banco para obter 401.
    const actor = await authorize(req, { requireRole: "dev" });
    if (!actor.ok) return actor.response;

    // Anti-scraping: bot UA check + rate limit por IP para atores autenticados.
    const protection = await runBotProtection(req, {
      endpoint: 'external-db-inspect',
      maxRequests: 30,
      windowSeconds: 60,
      blockSeconds: 1800,
    }, corsHeaders);
    if (!protection.allowed) return protection.blockResponse!;

    // Validate body
    let rawBody: unknown = {};
    try { rawBody = await req.json(); } catch { /* empty body ok */ }

    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonResponse({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, 400);
    }

    const { mode, tableName } = parsed.data;
    console.log(`[INSPECT] Mode: ${mode}, Table: ${tableName || 'all'}`);

    // External DB connection
    const externalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL');
    const externalKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_KEY');
    if (!externalUrl || !externalKey) {
      console.warn('[external-db-inspect] EXTERNAL_SUPABASE_URL/KEY not configured — returning empty payload');
      return jsonResponse({ error: 'CATALOG_NOT_CONFIGURED', message: 'Catálogo indisponível' }, 503);
    }

    const externalSupabase = createClient(externalUrl, externalKey, { global: { fetch: createReadOnlyCatalogFetch() } });

    // Inspect specific table columns
    if (mode === 'columns' && tableName) {
      try {
        const { data, error } = await externalSupabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (error) {
          return jsonResponse({ success: false, table: tableName, error: error.message });
        }

        const columns = data?.length ? Object.keys(data[0]) : [];
        return jsonResponse({
          success: true,
          table: tableName,
          columns,
          columnTypes: columns.map(col => ({
            name: col,
            type: data?.[0] ? typeof data[0][col] : 'unknown',
          })),
        });
      } catch (err) {
        return jsonResponse({
          success: false,
          table: tableName,
          error: err instanceof Error ? err.message : 'Erro desconhecido',
        });
      }
    }

    // Default: list all tables
    const tablesToTest = [
      'products', 'categories', 'suppliers', 'tags',
      'personalization_techniques', 'customization_price_tables',
      'product_images', 'product_videos', 'product_variants',
      'product_materials', 'product_tags', 'product_categories',
      'product_suppliers', 'product_print_areas', 'product_kit_components',
      'color_groups', 'color_nuances', 'color_equivalences', 'color_variations',
      'material_groups', 'material_types', 'material_variations',
      'supplier_colors', 'supplier_materials',
      'supplier_attribute_definitions', 'supplier_product_attributes',
      'product_attributes', 'category_attributes',
      'price_lists', 'variant_stocks', 'variant_cost_tiers', 'variant_sale_prices',
      'variation_types', 'variation_values', 'stock_movements',
      'collections', 'collection_products',
      'ramo_atividade', 'ramo_atividade_filho', 'produto_ramo_atividade',
      'bitrix_clients', 'organizations', 'client_contacts', 'business_sectors',
      'mockup_drafts', 'generated_mockups',
    ];

    const results: Array<{ name: string; exists: boolean; columns: string[]; rowCount: number; error?: string }> = [];

    const batchSize = 10;
    for (let i = 0; i < tablesToTest.length; i += batchSize) {
      const batch = tablesToTest.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (tbl) => {
          try {
            const { data, error, count } = await externalSupabase
              .from(tbl)
              .select('*', { count: 'exact', head: false })
              .limit(1);

            if (error) {
              return { name: tbl, exists: false, columns: [], rowCount: 0, error: error.message };
            }
            return {
              name: tbl,
              exists: true,
              columns: data?.length ? Object.keys(data[0]) : [],
              rowCount: count || 0,
            };
          } catch (err) {
            return { name: tbl, exists: false, columns: [], rowCount: 0, error: err instanceof Error ? err.message : 'Erro' };
          }
        })
      );
      results.push(...batchResults);
    }

    const existingTables = results.filter(r => r.exists);
    const missingTables = results.filter(r => !r.exists);

    return jsonResponse({
      success: true,
      summary: {
        total_tested: results.length,
        existing: existingTables.length,
        missing: missingTables.length,
      },
      existingTables: existingTables.map(t => ({ name: t.name, columns: t.columns, rowCount: t.rowCount })),
      missingTables: missingTables.map(t => ({ name: t.name, error: t.error })),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[INSPECT] Error:', errorMessage);
    return jsonResponse({ error: errorMessage }, 500);
  }
});
