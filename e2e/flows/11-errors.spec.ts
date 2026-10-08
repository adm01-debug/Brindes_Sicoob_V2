/**
 * Fluxo: Tratamento de erro — 503 do bridge, offline, RLS denial.
 * Usa page.route para forçar respostas e validar a UI de erro.
 * Seletores: Sel.app.toast (SSOT).
 */
import { test, expect, requireAuth } from '../fixtures/test-base';
import { gotoAndSettle, settleAfterAction } from '../helpers/nav';
import { Sel } from '../fixtures/selectors';

test.describe('Fluxo: Tratamento de erro', () => {
  test.beforeEach(() => requireAuth());

  test('UI continua usável quando external-db-bridge retorna 503', async ({ page }) => {
    await page.route('**/functions/v1/external-db-bridge**', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'SUPABASE_EDGE_RUNTIME_ERROR',
          message: 'Service is temporarily unavailable',
        }),
      }),
    );

    await gotoAndSettle(page, '/produtos');
    // Não deve quebrar a app — pode mostrar empty/erro, mas não tela branca
    await expect(page.locator('body')).toBeVisible();
    // O bridge faz retentativas com backoff antes de declarar indisponibilidade.
    // Aguarda a UI observável, sem inspecionar um instante intermediário da consulta.
    await expect
      .poll(
        async () => {
          const toastVisible = await page.locator(Sel.app.toast).first().isVisible().catch(() => false);
          const bannerVisible = await page
            .locator(Sel.app.errorBanner)
            .first()
            .isVisible()
            .catch(() => false);
          return toastVisible || bannerVisible;
        },
        {
          message: 'Esperava toast ou alerta ao receber 503 do bridge',
          timeout: 20_000,
        },
      )
      .toBe(true);
  });

  test('UI lida com offline simulado', async ({ page, context }) => {
    await gotoAndSettle(page, '/dashboard');
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    // Não exigimos comportamento específico, só que não trave
    await settleAfterAction(page, { timeout: 2000 });
    await context.setOffline(false);
  });
});
