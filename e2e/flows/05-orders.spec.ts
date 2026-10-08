/**
 * Fluxo: Pedidos — lista e abre primeiro item se houver.
 * Seletores: Sel.page (SSOT).
 */
import { test, expect, requireAuth } from '../fixtures/test-base';
import { gotoAndSettle, settleAfterAction } from '../helpers/nav';
import { Sel } from '../fixtures/selectors';

test.describe('Fluxo: Pedidos', () => {
  test.beforeEach(() => requireAuth());

  test('lista de pedidos carrega', async ({ page }) => {
    await gotoAndSettle(page, '/pedidos');
    await expect(page).toHaveURL(/pedidos/);
    await expect(page.locator(Sel.page.title('pedidos')).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('abre primeiro pedido se existir', async ({ page }) => {
    await gotoAndSettle(page, '/pedidos');
    const row = page.locator(Sel.order.card).first();
    if ((await row.count()) > 0) {
      await row.click().catch(() => {});
      await settleAfterAction(page, { timeout: 1000 });
      await expect(page).not.toHaveURL(/\/login/);
    }
  });
});
