/**
 * Fluxo: Admin — guards de role.
 * Para usuário comum: deve negar acesso. Para admin: deve carregar.
 * Seletores: Sel.login (SSOT).
 */
import { test, expect, requireAuth, requireAdmin } from '../fixtures/test-base';
import { loginAs } from '../helpers/auth';
import { gotoAndSettle, settleAfterAction } from '../helpers/nav';
import { Sel } from '../fixtures/selectors';

test.describe('Fluxo: Admin guards', () => {
  test('usuário sem role admin não acessa /admin/usuarios', async ({ page }) => {
    requireAuth();
    test.skip(
      !!process.env.E2E_USER_IS_ADMIN,
      'Usuário de teste é admin — verificação de bloqueio não aplicável',
    );
    await gotoAndSettle(page, '/admin/usuarios');
    await settleAfterAction(page, { timeout: 1500 });
    const ok =
      !/\/admin\/usuarios/.test(page.url()) ||
      (await page.locator(Sel.app.accessDenied).count()) > 0;
    expect(ok).toBeTruthy();
  });

  test('admin acessa /admin/usuarios', async ({ page }) => {
    requireAdmin();
    // Restaura a sessão canônica e conclui o step-up TOTP quando necessário.
    await loginAs(page, 'admin');
    await gotoAndSettle(page, '/admin/usuarios');
    await expect(page).toHaveURL(/admin\/usuarios/);
  });
});
