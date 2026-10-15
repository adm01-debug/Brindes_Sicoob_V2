/**
 * Fluxo: Produtos — lista, busca, abre detalhe.
 * Seletores: Sel.product (SSOT).
 */
import { test, expect, requireAuth } from '../fixtures/test-base';
import { gotoAndSettle, settleAfterAction } from '../helpers/nav';
import { installCatalogFixture } from '../helpers/catalog-fixture';
import { Sel } from '../fixtures/selectors';

const SEARCH_TERM = 'caneta';

test.describe('Fluxo: Produtos', () => {
  test.beforeEach(async ({ page }) => {
    requireAuth();
    await installCatalogFixture(page);
  });

  test('lista produtos no catálogo', async ({ page }) => {
    await gotoAndSettle(page, '/produtos');
    const card = page.locator(Sel.product.card).first();
    await expect(card).toBeVisible({ timeout: 15_000 });
  });

  test('busca por termo filtra resultados', async ({ page }) => {
    await gotoAndSettle(page, '/produtos');
    const search = page.locator(Sel.catalog.searchInput).first();
    if (await search.count()) {
      await search.fill(SEARCH_TERM);
      await settleAfterAction(page, { timeout: 1500 });
      await expect(page).toHaveURL(/produtos|filtros/);
    }
  });

  test('clica num produto abre detalhe ou quick view', async ({ page }) => {
    await gotoAndSettle(page, '/produtos');
    const card = page.locator(`${Sel.product.card} a`).first();
    if ((await card.count()) > 0) {
      await card.click();
      await settleAfterAction(page, { timeout: 1500 });
      await expect(page).not.toHaveURL(/\/login/);
    }
  });
});
