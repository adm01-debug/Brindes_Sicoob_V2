import type { Page, Route } from '@playwright/test';

import { test, expect } from '../../fixtures/test-base';
import { gotoAndSettle } from '../../helpers/nav';
import {
  basicA11yChecks,
  mockAuthenticatedBootstrap,
  setMobileViewport,
  waitRouteReady,
} from '../_shared';

const PATH = '/tendencias';

function json(route: Route, status: number, body: unknown) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function mockTrendsApi(page: Page, options: { productViewsStatus?: number } = {}) {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  await page.route(/\/rest\/v1\/rpc\/has_role(?:\?|$)/, (route) => json(route, 200, false));
  await page.route(/\/rest\/v1\/product_views(?:\?|$)/, (route) => {
    if (options.productViewsStatus) {
      return json(route, options.productViewsStatus, {
        code: 'PGRST002',
        message: 'product_views indisponível',
      });
    }
    return json(route, 200, [
      {
        id: '00000000-0000-4000-8000-000000000001',
        product_id: 'produto-caneca',
        product_name: 'Caneca Sicoob',
        product_sku: 'CAN-001',
        seller_id: 'e2e-user',
        view_type: 'detail',
        created_at: now.toISOString(),
      },
      {
        id: '00000000-0000-4000-8000-000000000002',
        product_id: 'produto-caneca',
        product_name: 'Caneca Sicoob',
        product_sku: 'CAN-001',
        seller_id: 'e2e-user',
        view_type: 'compare',
        created_at: yesterday.toISOString(),
      },
    ]);
  });
  await page.route(/\/rest\/v1\/search_analytics(?:\?|$)/, (route) =>
    json(route, 200, [
      {
        id: '00000000-0000-4000-8000-000000000011',
        search_term: 'caneca',
        results_count: 12,
        user_id: 'e2e-user',
        created_at: now.toISOString(),
      },
    ]),
  );
}

test.describe('/tendencias', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    if (testInfo.title.startsWith('auth guard:')) return;
    await mockAuthenticatedBootstrap(page);
  });

  test('happy: consolida as fontes realmente usadas sem consultar o catálogo externo', async ({ page }) => {
    const externalBridgeRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/functions/v1/external-db-bridge')) {
        externalBridgeRequests.push(request.url());
      }
    });
    await mockTrendsApi(page);

    await gotoAndSettle(page, PATH);
    await waitRouteReady(page);

    await expect(page.getByTestId('page-title-tendencias')).toBeVisible();
    await expect(page.getByText('Caneca Sicoob').first()).toBeVisible();
    expect(externalBridgeRequests).toEqual([]);
  });

  test('falha real: não apresenta ausência de atividade quando uma fonte retorna 503', async ({ page }) => {
    await mockTrendsApi(page, { productViewsStatus: 503 });

    await gotoAndSettle(page, PATH);
    await waitRouteReady(page);

    await expect(page.getByRole('alert').filter({ hasText: /Não foi possível carregar/ }).first()).toBeVisible();
    await expect(page.getByText('Nenhum produto visualizado ainda')).toHaveCount(0);
    await page.getByRole('tab', { name: 'Termos mais buscados' }).click();
    await expect(page.getByText('Nenhuma busca registrada ainda')).toHaveCount(0);
  });

  test('falha de capacidade: bloqueia os indicadores e oferece nova tentativa', async ({ page }) => {
    await page.route(/\/rest\/v1\/rpc\/has_role(?:\?|$)/, (route) =>
      json(route, 503, { message: 'RPC indisponível' }),
    );
    await gotoAndSettle(page, PATH);
    await waitRouteReady(page);

    await expect(page.getByRole('alert')).toContainText('Não foi possível validar seu acesso');
    await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeVisible();
    await expect(page.getByText('Nenhum produto visualizado ainda')).toHaveCount(0);
  });

  test.describe('sessão ausente', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('auth guard: sessão ausente redireciona para /login', async ({ page }) => {
      await gotoAndSettle(page, PATH);
      await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
    });
  });

  test('@a11y básico', async ({ page }) => {
    await mockTrendsApi(page);
    await gotoAndSettle(page, PATH);
    await waitRouteReady(page);
    await basicA11yChecks(page);
  });

  test('@mobile layout sem overflow horizontal', async ({ page }) => {
    await mockTrendsApi(page);
    await setMobileViewport(page);
    await gotoAndSettle(page, PATH);
    await waitRouteReady(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(overflow).toBe(false);
  });
});
