import { gotoAndSettle, settleAfterAction } from '../../helpers/nav';
/**
 * Rota: /login — autenticação principal.
 */
import { test, expect } from '../../fixtures/test-base';
import { Sel } from '../../fixtures/selectors';
import { basicA11yChecks, mockSessionExpired, setMobileViewport, waitRouteReady } from '../_shared';

const INVALID_EMAIL = 'naoehemail';
const VALID_PASSWORD = 'Senha123!';
const UNKNOWN_EMAIL = 'naoexiste@example.com';
const WRONG_PASSWORD = 'SenhaErrada123';
const SHORT_EMAIL = 'u@x.com';
const SHORT_PASSWORD = 'abc';

test.describe('/login', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('render: form de login renderiza com campos essenciais', async ({ page }) => {
    await gotoAndSettle(page, '/login');
    await waitRouteReady(page);
    await expect(page.locator(Sel.login.email)).toBeVisible();
    await expect(page.locator(Sel.login.password)).toBeVisible();
    await expect(page.locator(Sel.login.submit).first()).toBeVisible();
  });

  test('happy: validação de email triggera mensagem inline', async ({ page }) => {
    await gotoAndSettle(page, '/login');
    await page.locator(Sel.login.email).fill(INVALID_EMAIL);
    await page.locator(Sel.login.password).fill(VALID_PASSWORD);
    await page.locator(Sel.login.submit).first().click();
    await expect(page.locator('text=/inválido|invalid/i').first()).toBeVisible({ timeout: 4000 });
  });

  test('auth fail: credenciais erradas → permanece em /login', async ({ page }) => {
    await page.route(/\/auth\/v1\/token/, (route) =>
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'invalid_grant',
          error_description: 'Invalid login credentials',
        }),
      }),
    );
    await gotoAndSettle(page, '/login');
    await page.locator(Sel.login.email).fill(UNKNOWN_EMAIL);
    await page.locator(Sel.login.password).fill(WRONG_PASSWORD);
    await page.locator(Sel.login.submit).first().click();
    await settleAfterAction(page, { timeout: 1500 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('payload inválido: 422 mostra erro sem quebrar form', async ({ page }) => {
    await page.route(/\/auth\/v1\/token/, (route) =>
      route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'validation', message: 'missing fields' }),
      }),
    );
    await gotoAndSettle(page, '/login');
    await page.locator(Sel.login.email).fill(SHORT_EMAIL);
    await page.locator(Sel.login.password).fill(SHORT_PASSWORD);
    await page.locator(Sel.login.submit).first().click();
    await expect(page.locator(Sel.login.submit).first()).toBeEnabled({ timeout: 5000 });
  });

  test('timeout: chamada lenta de auth não trava o botão para sempre', async ({ page }) => {
    await page.route(/\/auth\/v1\/token/, async (route) => {
      await new Promise((r) => setTimeout(r, 8000));
      await route.fulfill({ status: 504, body: '{}' });
    });
    await gotoAndSettle(page, '/login');
    await page.locator(Sel.login.email).fill(SHORT_EMAIL);
    await page.locator(Sel.login.password).fill(VALID_PASSWORD);
    await page.locator(Sel.login.submit).first().click();
    // Após 10s o botão deve voltar a ficar utilizável (UI tem que se recuperar)
    await expect(page.locator(Sel.login.submit).first()).toBeEnabled({ timeout: 15_000 });
  });

  test('5xx: auth offline mostra erro amigável', async ({ page }) => {
    await mockSessionExpired(page);
    await page.route(/\/auth\/v1\/token/, (route) =>
      route.fulfill({ status: 503, body: JSON.stringify({ error: 'service_unavailable' }) }),
    );
    await gotoAndSettle(page, '/login');
    await page.locator(Sel.login.email).fill(SHORT_EMAIL);
    await page.locator(Sel.login.password).fill(VALID_PASSWORD);
    await page.locator(Sel.login.submit).first().click();
    await expect(page.locator(`${Sel.login.errorMsg}, ${Sel.app.toast}`).first()).toBeVisible({
      timeout: 8000,
    });
  });

  test('@a11y básico', async ({ page }) => {
    await gotoAndSettle(page, '/login');
    await waitRouteReady(page);
    await basicA11yChecks(page);
  });

  test('@mobile layout 390x844 sem overflow horizontal', async ({ page }) => {
    await setMobileViewport(page);
    await gotoAndSettle(page, '/login');
    await waitRouteReady(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(overflow).toBe(false);
    await expect(page.locator(Sel.login.submit).first()).toBeVisible();
  });
});
