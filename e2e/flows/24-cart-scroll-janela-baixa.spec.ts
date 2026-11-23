/**
 * Fluxo: o painel do carrinho precisa continuar utilizável em janelas baixas.
 *
 * O popover acumula cabeçalho, lista de orçamentos e rodapé (saldo da verba,
 * subtotal e "Gerar Orçamento"). Antes do ajuste o `ScrollArea` limitava a
 * altura só no Root, que tem `overflow-hidden`: em janela baixa a lista era
 * cortada e o botão de gerar orçamento saía da tela.
 *
 * jsdom não calcula layout, então o teste unitário
 * (`tests/components/cart/cart-header-scroll.test.tsx`) só consegue provar a
 * estrutura. Aqui, em navegador real, medimos o que importa:
 *  - a lista rola de verdade (`scrollHeight > clientHeight` no viewport);
 *  - o saldo da verba do PA e o CTA continuam inteiros dentro da tela;
 *  - rolar até o último orçamento não empurra o CTA para fora.
 */
import { test, expect } from '../fixtures/test-base';
import { gotoAndSettle } from '../helpers/nav';
import { loginAs } from '../helpers/auth';
import { Sel } from '../fixtures/selectors';
import type { Page } from '@playwright/test';

const CART_QUERY = '**/rest/v1/seller_carts**';
const ITEMS_QUERY = '**/rest/v1/seller_cart_items**';
const BUDGET_QUERY = '**/rest/v1/pa_budgets**';
const PROFILE_QUERY = '**/rest/v1/profiles**';
const E2E_PA_ID = 'e2e-pa-24-scroll';

const LONG_LIST_LENGTH = 8;

function makeCart(index: number) {
  return {
    id: `e2e-cart-${index}`,
    seller_id: 'e2e-seller',
    company_id: `e2e-company-${index}`,
    company_name: `Cooperativa Scroll ${index}`,
    company_location: 'Cuiabá/MT',
    company_logo_url: null,
    notes: null,
    status: 'novo',
    created_at: '2026-11-23T10:00:00Z',
    updated_at: '2026-11-23T10:00:00Z',
  };
}

function makeItem(cartIndex: number, itemIndex: number) {
  return {
    id: `e2e-item-${cartIndex}-${itemIndex}`,
    cart_id: `e2e-cart-${cartIndex}`,
    product_id: `e2e-product-${cartIndex}-${itemIndex}`,
    product_name: `Produto ${cartIndex}.${itemIndex}`,
    product_sku: `SKU-${cartIndex}-${itemIndex}`,
    product_image_url: null,
    product_price: 10 + itemIndex,
    quantity: 1,
    color_name: null,
    color_hex: null,
    notes: null,
    sort_order: itemIndex,
  };
}

/**
 * Garante um `pa_id` no perfil para que o bloco de verba do PA renderize.
 * A resposta real do perfil é preservada; apenas o vínculo com o posto é
 * injetado, porque a conta E2E pode não ter PA associado.
 */
async function mockProfilePaId(page: Page) {
  await page.route(PROFILE_QUERY, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const body = (await response.json()) as Record<string, unknown> | Record<string, unknown>[];
    const withPa = (profile: Record<string, unknown>) => ({ ...profile, pa_id: E2E_PA_ID });
    const payload = Array.isArray(body) ? body.map(withPa) : withPa(body);
    await route.fulfill({ response, body: JSON.stringify(payload) });
  });
}

/** Serve uma lista de orçamentos realista, sem depender de dados de produção. */
async function mockCarts(page: Page) {
  const carts = Array.from({ length: LONG_LIST_LENGTH }, (_, index) => makeCart(index));
  const items = Array.from({ length: LONG_LIST_LENGTH }, (_, cartIndex) =>
    Array.from({ length: 4 }, (_, itemIndex) => makeItem(cartIndex, itemIndex)),
  ).flat();

  await page.route(CART_QUERY, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'content-range': `0-${carts.length - 1}/${carts.length}` },
      body: JSON.stringify(carts),
    });
  });

  await page.route(ITEMS_QUERY, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'content-range': `0-${items.length - 1}/${items.length}` },
      body: JSON.stringify(items),
    });
  });

  await page.route(BUDGET_QUERY, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'e2e-budget',
        pa_id: E2E_PA_ID,
        ano: new Date().getFullYear(),
        mes: new Date().getMonth() + 1,
        verba_total: 5000,
        verba_consumida: 1000,
        verba_planejada: 5000,
        verba_reservada: 0,
        verba_comprometida: 0,
      }),
    });
  });
}

test.describe('Carrinho em janela baixa', () => {
  test('mantém o CTA visível e permite rolar até o último orçamento', async ({ page }) => {
    test.setTimeout(90_000);
    // 520px = janela baixa de notebook. O teto do painel é
    // `min(440px, calc(100dvh - 17rem))`, então a lista cede altura ao rodapé.
    await page.setViewportSize({ width: 1024, height: 520 });
    await mockProfilePaId(page);
    await mockCarts(page);
    await loginAs(page);
    await gotoAndSettle(page, '/');

    await page.locator(Sel.cart.trigger).click();
    const drawer = page.locator(Sel.cart.drawer);
    await expect(drawer).toBeVisible();

    // O rodapé traz o saldo da verba e o CTA; ambos precisam caber na tela.
    const budget = drawer.getByRole('region', { name: /saldo de verba do pa/i });
    await expect(budget).toBeInViewport({ ratio: 1 });
    const cta = drawer.getByRole('button', { name: /gerar orçamento/i });
    // `toBeInViewport` já reexecuta até o painel terminar a animação de entrada
    // (o conteúdo começa com `opacity: 0`), então não há corrida com o framer.
    await expect(cta).toBeInViewport({ ratio: 1 });

    // A lista completa foi renderizada…
    const tabs = drawer.locator(Sel.cart.tab);
    await expect(tabs).toHaveCount(LONG_LIST_LENGTH);

    // …e rola de verdade dentro do painel, em vez de ser cortada pelo Root.
    const viewport = drawer.locator('[data-radix-scroll-area-viewport]').first();
    await expect(viewport).toBeVisible();
    const metrics = await viewport.evaluate((el) => ({
      clientHeight: el.clientHeight,
      scrollHeight: el.scrollHeight,
      overflowY: getComputedStyle(el).overflowY,
    }));
    expect(metrics.overflowY).toMatch(/auto|scroll/);
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);

    // O CTA vive fora da área rolável: rolar até o fim não o move nem o esconde.
    const lastTab = tabs.last();
    await viewport.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await expect(lastTab).toBeInViewport();
    await expect(drawer.getByText(`Cooperativa Scroll ${LONG_LIST_LENGTH - 1}`)).toBeVisible();
    await expect(cta).toBeInViewport({ ratio: 1 });

    const ctaBox = await cta.boundingBox();
    const viewportHeight = page.viewportSize()!.height;
    expect(ctaBox).not.toBeNull();
    expect(ctaBox!.y).toBeGreaterThan(0);
    expect(ctaBox!.y + ctaBox!.height).toBeLessThanOrEqual(viewportHeight);
  });
});
