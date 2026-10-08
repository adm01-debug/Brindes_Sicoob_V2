/**
 * E2E: acesso aos pedidos por papel canônico.
 *
 * Usa somente as contas QA vigentes. A antiga versão dependia de usuários e
 * pedidos fictícios que nunca existiram no banco canônico.
 */
import { test, expect } from './fixtures/test-base';
import { Sel } from './fixtures/selectors';
import { loginAs, logout } from './helpers/auth';
import { gotoAndSettle } from './helpers/nav';

test.describe('Pedidos Sicoob — RBAC canônico', () => {
  test('vendedor consulta a lista de pedidos', async ({ page }) => {
    await loginAs(page, 'user');
    await gotoAndSettle(page, '/sicoob/pedidos');

    await expect(page).toHaveURL(/\/sicoob\/pedidos$/);
    await expect(page.getByTestId('page-title-sicoob-pedidos')).toBeVisible();
    await expect(page.locator(`${Sel.app.forbidden}, ${Sel.app.accessDenied}`)).not.toBeVisible();
  });

  test('vendedor acompanha pedidos pelo kanban', async ({ page }) => {
    await loginAs(page, 'user');
    await gotoAndSettle(page, '/sicoob/pedidos/kanban');

    await expect(page).toHaveURL(/\/sicoob\/pedidos\/kanban$/);
    await expect(page.getByTestId('page-title-sicoob-pedidos-kanban')).toBeVisible();
  });

  test('gestor acessa pedidos e o módulo de gestão de compras', async ({ page }) => {
    await loginAs(page, 'editor');

    await gotoAndSettle(page, '/sicoob/pedidos');
    await expect(page.getByTestId('page-title-sicoob-pedidos')).toBeVisible();

    await gotoAndSettle(page, '/gestor/compras');
    await expect(page).toHaveURL(/\/gestor\/compras$/);
    await expect(page.getByTestId('page-title-gestor-compras')).toBeVisible();
  });

  test('vendedor não acessa a gestão consolidada da Singular', async ({ page }) => {
    await loginAs(page, 'user');
    await gotoAndSettle(page, '/gestor/compras');

    await expect(page).toHaveURL(/\/403/);
    await expect(page.locator(Sel.app.forbidden)).toBeVisible();
  });

  test('sessão ausente bloqueia lista, kanban e detalhes de pedidos', async ({ page }) => {
    await logout(page);

    for (const route of [
      '/sicoob/pedidos',
      '/sicoob/pedidos/kanban',
      '/sicoob/pedidos/00000000-0000-0000-0000-000000000010',
    ]) {
      await gotoAndSettle(page, route);
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test('troca de vendedor para gestor não reutiliza a sessão anterior', async ({ page }) => {
    await loginAs(page, 'user');
    await loginAs(page, 'editor');
    await gotoAndSettle(page, '/gestor');

    await expect(page).toHaveURL(/\/gestor$/);
    await expect(page.getByTestId('page-title-gestor')).toBeVisible();
  });
});
