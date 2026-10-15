import type { Page, Request, Route } from '@playwright/test';

const PRODUCT_ID = '00000000-0000-4000-8000-000000000001';

const CATALOG_PRODUCT = {
  id: PRODUCT_ID,
  organization_id: '00000000-0000-4000-8000-000000000002',
  name: 'Caneta Sicoob E2E',
  sku: 'E2E-CANETA-001',
  supplier_reference: 'E2E-001',
  description: 'Produto determinístico para jornadas E2E do catálogo.',
  short_description: 'Caneta institucional Sicoob',
  sale_price: 4.9,
  cost_price: 2.5,
  primary_image_url: '/placeholder.svg',
  supplier_id: '00000000-0000-4000-8000-000000000003',
  category_id: null,
  main_category_id: null,
  brand: 'Sicoob',
  is_active: true,
  stock_quantity: 1000,
  min_quantity: 50,
  lead_time_days: 7,
  is_featured: true,
  is_bestseller: false,
  is_new: false,
  is_on_sale: false,
  is_kit: false,
  has_commercial_packaging: false,
  allows_personalization: true,
  gender: null,
  price_updated_at: '2026-10-15T00:00:00.000Z',
  created_at: '2026-10-15T00:00:00.000Z',
  updated_at: '2026-10-15T00:00:00.000Z',
};

interface BridgeQuery {
  table?: string;
  operation?: string;
  offset?: number;
}

interface BridgeBody extends BridgeQuery {
  queries?: BridgeQuery[];
}

function requestBody(request: Request): BridgeBody | null {
  try {
    return request.postDataJSON() as BridgeBody;
  } catch {
    return null;
  }
}

function selectResult(query: BridgeQuery) {
  const records = query.table === 'products' && (query.offset ?? 0) === 0
    ? [CATALOG_PRODUCT]
    : [];
  return {
    success: true,
    data: {
      records,
      count: records.length,
      meta: { offset: query.offset ?? 0 },
    },
  };
}

async function handleCatalogRequest(route: Route, request: Request) {
  const body = requestBody(request);
  if (!body) return route.fallback();

  if (
    body.operation === 'batch'
    && Array.isArray(body.queries)
    && body.queries.length > 0
    && body.queries.every((query) => query.operation === undefined || query.operation === 'select')
  ) {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { results: body.queries.map(selectResult) },
      }),
    });
  }

  if (body.table && body.operation === 'select') {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: selectResult(body).data }),
    });
  }

  return route.fallback();
}

/**
 * Isola as jornadas de interface da disponibilidade do catálogo Promobrind.
 * As APIs do portal, como favoritos e autenticação, continuam reais.
 */
export async function installCatalogFixture(page: Page): Promise<void> {
  await page.route('**/functions/v1/external-db-bridge**', handleCatalogRequest);
}
