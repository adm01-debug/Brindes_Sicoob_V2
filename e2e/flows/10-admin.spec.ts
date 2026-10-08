/**
 * Fluxo: Admin — guards de role.
 * Para usuário comum: deve negar acesso. Para admin: deve carregar.
 * Seletores: Sel.login (SSOT).
 */
import { test, expect, requireAuth, requireAdmin } from '../fixtures/test-base';
import { loginViaUI, logout } from '../helpers/auth';
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
    // O project já carrega a sessão do usuário comum. Encerre-a antes de
    // autenticar o administrador para evitar o guard redirecionar /login.
    await logout(page);
    await loginViaUI(page, {
      email: process.env.E2E_ADMIN_EMAIL!,
      password: process.env.E2E_ADMIN_PASSWORD!,
    });
    await gotoAndSettle(page, '/admin/usuarios');
    await expect(page).toHaveURL(/admin\/usuarios/);
  });
});
