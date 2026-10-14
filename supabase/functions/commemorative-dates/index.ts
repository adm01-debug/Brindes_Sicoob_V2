import { catalogFunctionErrorResponse, createExternalCatalogClient, prepareAuthenticatedCatalogRequest } from "../_shared/catalog-client.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { parseBodyWithSchema } from "../_shared/zod-validate.ts";

const ActionSchema = z.object({
  action: z.enum(['get_active_dates', 'get_upcoming_dates', 'get_products_by_date', 'get_dates_with_colors']),
  params: z.object({
    days_ahead: z.number().int().min(1).max(365).optional(),
    slug: z.string().trim().min(1).max(200).optional(),
    limit: z.number().int().min(1).max(500).optional(),
    include_all_colors: z.boolean().optional(),
  }).optional(),
});

Deno.serve(async (req) => {
  const context = await prepareAuthenticatedCatalogRequest(req);
  if (!context.ok) return context.response;
  const { corsHeaders } = context;

  try {
    // Validate body with Zod
    const parsed = await parseBodyWithSchema(req, ActionSchema, corsHeaders);
    if ('error' in parsed) return parsed.error;

    const { action, params } = parsed.data;

    // External DB client
    const externalSupabase = await createExternalCatalogClient();
    if (!externalSupabase) {
      console.warn('[commemorative-dates] credenciais do catálogo externo indisponíveis');
      return new Response(
        JSON.stringify({ error: 'CATALOG_NOT_CONFIGURED', _unconfigured: true, _message: 'Banco externo não configurado' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;

    switch (action) {
      case 'get_active_dates': {
        const { data, error } = await externalSupabase.rpc('get_active_commemorative_dates', {}, { get: true });
        if (error) {
          return new Response(JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        result = data;
        break;
      }

      case 'get_upcoming_dates': {
        const daysAhead = params?.days_ahead || 60;
        const { data, error } = await externalSupabase.rpc('get_upcoming_commemorative_dates', {
          p_days_ahead: daysAhead
        }, { get: true });
        if (error) {
          return new Response(JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        result = data;
        break;
      }

      case 'get_products_by_date': {
        const slug = params?.slug;
        if (!slug) {
          return new Response(JSON.stringify({ error: 'Slug é obrigatório' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const limit = params?.limit || 100;
        const includeAllColors = params?.include_all_colors || false;

        const { data, error } = await externalSupabase.rpc('get_variants_for_commemorative_date', {
          p_slug: slug,
          p_limit: limit,
          p_include_all_colors: includeAllColors
        }, { get: true });
        if (error) {
          return new Response(JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        result = data;
        break;
      }

      case 'get_dates_with_colors': {
        const { data, error } = await externalSupabase
          .from('v_commemorative_dates_with_colors')
          .select('*')
          .eq('is_active', true)
          .order('date_month')
          .order('date_day');
        if (error) {
          return new Response(JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        result = data;
        break;
      }
    }

    return new Response(
      JSON.stringify({ data: result, success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return catalogFunctionErrorResponse(error, corsHeaders, 'commemorative-dates');
  }
});
