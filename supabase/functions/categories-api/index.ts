import { createExternalCatalogClient } from "../_shared/catalog-client.ts";
import { getCorsHeaders } from '../_shared/cors.ts';
import { z } from '../_shared/zod-validate.ts';
import { runBotProtection } from '../_shared/bot-protection.ts';

const CategoriesRequestSchema = z.object({
  action: z.enum(['tree', 'all', 'descendants', 'products_by_categories']),
  categoryIds: z.array(z.string().uuid()).max(200).optional(),
  includeDescendants: z.boolean().optional(),
});

interface CategoryRelation {
  id: string;
  parent_id: string | null;
}

function collectCategoryDescendants(parentIds: string[], categories: CategoryRelation[]): string[] {
  const descendants = new Set<string>();
  const queue = [...parentIds];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (descendants.has(currentId)) continue;
    descendants.add(currentId);
    queue.push(...categories
      .filter((category) => category.parent_id === currentId)
      .map((category) => category.id));
  }

  return [...descendants];
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Anti-scraping: bot UA check + rate limit por IP — mesma politica de
    // external-db-inspect, ja que esta function tambem le o catalogo externo
    // com credencial de service role.
    const protection = await runBotProtection(req, {
      endpoint: 'categories-api',
      maxRequests: 60,
      windowSeconds: 60,
      blockSeconds: 1800,
    }, corsHeaders);
    if (!protection.allowed) return protection.blockResponse!;

    const externalClient = await createExternalCatalogClient();
    if (!externalClient) {
      return new Response(JSON.stringify({ error: 'CATALOG_NOT_CONFIGURED', message: 'Catálogo indisponível' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rawBody = await req.json().catch(() => ({}));
    const parsed = CategoriesRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { action, categoryIds, includeDescendants } = parsed.data;

    switch (action) {
      case 'tree': {
        // Buscar árvore de categorias
        const { data, error } = await externalClient
          .from('categories_tree_visual')
          .select('*')
          .order('sort_path', { ascending: true });

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'all': {
        // Buscar todas categorias
        const { data, error } = await externalClient
          .from('categories')
          .select('*')
          .order('name', { ascending: true });

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'descendants': {
        // Buscar categoria e todos os seus descendentes
        if (!categoryIds || categoryIds.length === 0) {
          return new Response(
            JSON.stringify({ success: true, data: [] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Buscar categorias e seus filhos recursivamente
        const { data: allCategories, error: catError } = await externalClient
          .from('categories')
          .select('id, parent_id, name, level');

        if (catError) throw catError;

        const allCategoryIds = collectCategoryDescendants(categoryIds, allCategories);

        return new Response(
          JSON.stringify({ success: true, data: allCategoryIds }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'products_by_categories': {
        // Buscar produtos vinculados às categorias
        if (!categoryIds || categoryIds.length === 0) {
          return new Response(
            JSON.stringify({ success: true, productIds: [] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        let targetCategoryIds = [...categoryIds];

        // Se includeDescendants = true, buscar também subcategorias
        if (includeDescendants) {
          const { data: allCategories, error: catError } = await externalClient
            .from('categories')
            .select('id, parent_id');

          if (catError) throw catError;

          targetCategoryIds = collectCategoryDescendants(categoryIds, allCategories);
        }

        console.log('Querying products for categories:', targetCategoryIds.length, 'categories');

        // Coletar IDs de todas as estratégias em paralelo
        const allProductIds = new Set<string>();
        let primarySource = 'none';

        // ESTRATÉGIA 1: Usar products.category_id diretamente
        console.log('Strategy 1: Using products.category_id directly...');
        const { data: directProducts, error: directError } = await externalClient
          .from('products')
          .select('id')
          .in('category_id', targetCategoryIds)
          .eq('is_active', true);

        if (!directError && directProducts && directProducts.length > 0) {
          directProducts.forEach((p: any) => allProductIds.add(p.id));
          primarySource = 'products.category_id';
          console.log(`Strategy 1: Found ${directProducts.length} products`);
        } else {
          console.log('Strategy 1: No results', directError?.message || '');
        }

        // ESTRATÉGIA 2: product_category_assignments (tabela N:N)
        console.log('Strategy 2: Trying product_category_assignments...');
        const { data: assignments, error: assignError } = await externalClient
          .from('product_category_assignments')
          .select('product_id')
          .in('category_id', targetCategoryIds);

        if (!assignError && assignments && assignments.length > 0) {
          assignments.forEach((a: any) => allProductIds.add(a.product_id));
          if (primarySource === 'none') primarySource = 'product_category_assignments';
          else primarySource += '+product_category_assignments';
          console.log(`Strategy 2: Found ${assignments.length} assignments`);
        } else {
          console.log('Strategy 2: No results', assignError?.message || '');
        }

        // ESTRATÉGIA 3: product_categories (fallback legacy)
        console.log('Strategy 3: Trying product_categories table...');
        const { data: fallbackData, error: fallbackError } = await externalClient
          .from('product_categories')
          .select('product_id')
          .in('category_id', targetCategoryIds);

        if (!fallbackError && fallbackData && fallbackData.length > 0) {
          fallbackData.forEach((a: any) => allProductIds.add(a.product_id));
          if (primarySource === 'none') primarySource = 'product_categories';
          else primarySource += '+product_categories';
          console.log(`Strategy 3: Found ${fallbackData.length} entries`);
        } else {
          console.log('Strategy 3: No results', fallbackError?.message || '');
        }

        const productIds = [...allProductIds];
        console.log(`Total unique products: ${productIds.length} from: ${primarySource}`);

        return new Response(
          JSON.stringify({ 
            success: true, 
            productIds,
            source: primarySource,
            categoriesUsed: targetCategoryIds.length
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid action. Valid: tree, all, descendants, products_by_categories' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('Error in categories-api:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
