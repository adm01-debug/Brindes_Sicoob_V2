/**
 * E2E: integridade de navegação por papel.
 */
import { test, expect } from './fixtures/test-base';
import { Sel } from './fixtures/selectors';
import { loginAs, logout } from './helpers/auth';
import { gotoAndSettle } from './helpers/nav';

test.describe('RBAC e navegação', () => {
  test.describe('Perfil vendedor', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'user');
    });

    test('acessa as áreas comerciais', async ({ page }) => {
      for (const route of ['/produtos', '/orcamentos', '/favoritos']) {
        await gotoAndSettle(page, route);
        await expect(page).toHaveURL(new RegExp(route));
        await expect(page.locator(`${Sel.app.forbidden}, ${Sel.app.accessDenied}`)).not.toBeVisible();
      }
    });

    test('recebe 403 nas áreas administrativas', async ({ page }) => {
      for (const route of ['/admin/usuarios', '/admin/cadastros', '/admin/permissoes']) {
        await gotoAndSettle(page, route);
        await expect(page).toHaveURL(/\/403/);
        await expect(page.locator(Sel.app.forbidden)).toBeVisible();
      }
    });

    test('vê negação contextual nas áreas técnicas', async ({ page }) => {
      for (const route of ['/admin/telemetria', '/admin/seguranca', '/admin/workflows']) {
        await gotoAndSettle(page, route);
        await expect(page).toHaveURL(new RegExp(route));
        await expect(page.locator(Sel.app.accessDenied)).toHaveAttribute(
          'data-user-role',
          'vendedor',
        );
      }
    });
  });

  test.describe('Perfil supervisor', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'admin');
    });

    test('acessa a administração de negócio', async ({ page }) => {
      for (const route of ['/admin/usuarios', '/admin/cadastros']) {
        await gotoAndSettle(page, route);
        await expect(page).toHaveURL(new RegExp(route));
        await expect(page.locator(Sel.app.accessDenied)).not.toBeVisible();
      }
    });

    test('permanece bloqueado nas ferramentas de desenvolvimento', async ({ page }) => {
      for (const route of ['/admin/telemetria', '/admin/seguranca']) {
        await gotoAndSettle(page, route);
        await expect(page).toHaveURL(new RegExp(route));
        await expect(page.locator(Sel.app.accessDenied)).toHaveAttribute(
          'data-user-role',
          'supervisor',
        );
      }
    });
  });

  test.describe('Perfil desenvolvedor', () => {
    test('acessa os painéis técnicos quando a credencial AAL2 está disponível', async ({ page }) => {
      await loginAs(page, 'dev');
      for (const route of ['/admin/telemetria', '/admin/seguranca', '/admin/workflows']) {
        await gotoAndSettle(page, route);
        await expect(page).toHaveURL(new RegExp(route));
        await expect(page.locator(Sel.app.accessDenied)).not.toBeVisible();
      }
    });
  });

  test.describe('Login e deep link', () => {
    test('retorna à página pretendida depois do login', async ({ page }) => {
      await logout(page);
      await gotoAndSettle(page, '/orcamentos/novo');
      await expect(page).toHaveURL(/\/login/);

      await loginAs(page, 'user');
      await expect(page).toHaveURL(/\/orcamentos\/novo/);
      await expect(page.locator(Sel.page.title('orcamento-novo'))).toBeVisible();
    });

    test('bloqueia rota administrativa para sessão ausente', async ({ page }) => {
      await logout(page);
      await gotoAndSettle(page, '/admin/usuarios');
      await expect(page).toHaveURL(/\/login/);
    });
  });
});
