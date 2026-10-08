/**
 * E2E: permissões do Gestor de Compras.
 *
 * O papel `editor` do helper representa a conta QA `gestor_compras`: pode
 * operar a Singular, mas não administra usuários nem infraestrutura técnica.
 */
import { test, expect } from './fixtures/test-base';
import { Sel } from './fixtures/selectors';
import { loginAs, logout } from './helpers/auth';
import { gotoAndSettle } from './helpers/nav';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

test.describe('Gestor de Compras — permissões e navegação', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'editor');
  });

  test('acessa catálogo, orçamentos e painéis próprios da Singular', async ({ page }) => {
    const allowedRoutes = ['/', '/produtos', '/orcamentos', '/gestor', '/gestor/compras'];

    for (const route of allowedRoutes) {
      await gotoAndSettle(page, route);
      await expect(page).not.toHaveURL(/\/login|\/403/);
      await expect(page.locator(`${Sel.app.forbidden}, ${Sel.app.accessDenied}`)).not.toBeVisible();
      if (route !== '/') await expect(page).toHaveURL(new RegExp(route));
    }
  });

  test('carrega os módulos de governança e gestão de compras', async ({ page }) => {
    await gotoAndSettle(page, '/gestor');
    await expect(page.getByTestId('page-title-gestor')).toBeVisible();

    await gotoAndSettle(page, '/gestor/compras');
    await expect(page.getByTestId('page-title-gestor-compras')).toBeVisible();
  });

  test('bloqueia painéis administrativos reservados ao supervisor', async ({ page }) => {
    await gotoAndSettle(page, '/admin/usuarios');
    await expect(page).toHaveURL(/\/403/);
    await expect(page.locator(Sel.app.forbidden)).toBeVisible();
  });

  test('bloqueia rotas técnicas e preserva evidência contextual', async ({ page }) => {
    for (const route of ['/admin/telemetria', '/admin/seguranca', '/admin/external-db']) {
      await gotoAndSettle(page, route);

      const denied = page.locator(Sel.app.accessDenied);
      await expect(denied).toBeVisible();
      await expect(denied).toHaveAttribute('data-http-status', '403');
      await expect(denied).toHaveAttribute('data-user-role', 'gestor_compras');
      await expect(denied).toHaveAttribute('data-blocked-path', route);
      await expect(page.locator(Sel.app.devAccessRequestId)).toContainText(
        `REQ-${route.split('/').filter(Boolean).pop()?.toUpperCase()}`,
      );
    }
  });

  test('mantém as permissões depois de recarregar a rota do gestor', async ({ page }) => {
    await gotoAndSettle(page, '/gestor');
    await page.reload({ waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/gestor$/);
    await expect(page.getByTestId('page-title-gestor')).toBeVisible();
    await expect(page.locator(`${Sel.app.forbidden}, ${Sel.app.accessDenied}`)).not.toBeVisible();
  });

  test('mantém o bloqueio técnico depois de logout e novo login', async ({ page }) => {
    await logout(page);
    await loginAs(page, 'editor');
    await gotoAndSettle(page, '/admin/telemetria');

    await expect(page.locator(Sel.app.accessDenied)).toBeVisible();
  });

  test('oferece retorno contextual ao painel do gestor', async ({ page }) => {
    await gotoAndSettle(page, '/admin/telemetria');

    const contextualCta = page.locator(Sel.app.devAccessContextualCta);
    await expect(contextualCta).toBeVisible();
    await expect(contextualCta).toContainText('Voltar ao Painel Gestor');
    await contextualCta.click();
    await expect(page).toHaveURL(/\/gestor$/);
  });

  test('deep link protegido volta ao destino após autenticação', async ({ page }) => {
    await logout(page);
    await gotoAndSettle(page, '/gestor');
    await expect(page).toHaveURL(/\/login/);

    await loginAs(page, 'editor');
    await expect(page).toHaveURL(/\/gestor$/);
    await expect(page.getByTestId('page-title-gestor')).toBeVisible();
  });

  test('funções técnicas rejeitam chamadas anônimas', async ({ page, request }) => {
    test.skip(
      !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY,
      'Configuração pública do Supabase ausente',
    );
    await logout(page);

    for (const functionName of ['mcp-keys-issue', 'sicoob-seed-qa']) {
      const response = await request.post(
        `${SUPABASE_URL}/functions/v1/${functionName}`,
        {
          headers: {
            apikey: SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json',
          },
          data: { test: true },
        },
      );
      expect([401, 403]).toContain(response.status());
    }
  });
});
