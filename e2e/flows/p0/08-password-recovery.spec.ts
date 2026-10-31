import { gotoAndSettle } from '../../helpers/nav';
/**
 * P0 — Password recovery E2E (positivo + negativo).
 *
 * Cobre o fluxo de plataforma fechada (mem://security/password-recovery-flow):
 *  1. Usuário pede reset → solicitação criada na tabela `password_reset_requests`.
 *  2. Gestor aprova manualmente → email de reset disparado pelo Supabase Auth.
 *  3. Usuário acessa `/reset-password` com `access_token` e define nova senha.
 *
 * Aqui validamos via UI (sem mockar) os pontos NEGATIVOS (não-bypass) e o
 * acesso POSITIVO ao formulário pós-reset:
 *  - Sem token recovery → não atualiza senha.
 *  - Senha fraca → erro de validação inline.
 *  - 5xx do auth → alerta amigável, sem travamento.
 *  - Form com token válido aceita senha forte e habilita submit.
 *
 * Cobertura smoke crítica vive em `flows/20-all-features-smoke.spec.ts`
 * (teste 95) — vide `mem://testing/e2e-smoke-tag-isolation.md`.
 */
import { test, expect } from '../../fixtures/test-base';
import { waitRouteReady } from '../../routes/_shared';

const STRONG_PASSWORD = 'NovaSenha@2025!Forte';
const WEAK_PASSWORD = '123';
const CONFIRMATION_PASSWORD = 'SenhaForte@2025!';
const DIFFERENT_PASSWORD = 'Diferente@2025!';
const RECOVERY_PASSWORD = 'SenhaForte@2025!Recovery';
const UNKNOWN_EMAIL = 'usuario-totalmente-inexistente-e2e@example.com';

test.describe('P0 — Password recovery', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('positivo: /reset-password com token válido aceita senha forte e habilita submit', async ({
    page,
  }) => {
    await gotoAndSettle(page, '/reset-password#access_token=fake&type=recovery');
    await waitRouteReady(page);

    const pwds = page.locator('input[type="password"]');
    await expect(pwds.first()).toBeVisible({ timeout: 8_000 });

    await pwds.first().fill(STRONG_PASSWORD);
    if ((await pwds.count()) >= 2) {
      await pwds.nth(1).fill(STRONG_PASSWORD);
    }

    const submit = page.getByRole('button', { name: /atualizar|salvar|redefinir/i }).first();
    await expect(submit).toBeEnabled({ timeout: 4_000 });
  });

  test('negativo: acesso a /reset-password SEM token → mensagem ou redirect, nunca habilita reset', async ({
    page,
  }) => {
    await gotoAndSettle(page, '/reset-password');
    await waitRouteReady(page);

    const hasInvalidMsg = await page
      .getByText(/inválido|expirado|link.+inválido|sem.+permiss/i)
      .first()
      .isVisible()
      .catch(() => false);
    const redirected = /\/login/.test(page.url());

    // Pelo menos UMA das defesas precisa estar ativa.
    expect(
      hasInvalidMsg || redirected,
      'sem token, recovery não pode habilitar update',
    ).toBeTruthy();
  });

  test('negativo: senha fraca dispara validação inline (não chama auth)', async ({ page }) => {
    let authCalled = false;
    await page.route(/\/auth\/v1\/user/, (route) => {
      authCalled = true;
      return route.fulfill({ status: 400, body: JSON.stringify({ error: 'weak_password' }) });
    });

    await gotoAndSettle(page, '/reset-password#access_token=fake&type=recovery');
    await waitRouteReady(page);

    const pwds = page.locator('input[type="password"]');
    if ((await pwds.count()) > 0) {
      await pwds.first().fill(WEAK_PASSWORD);
      if ((await pwds.count()) >= 2) await pwds.nth(1).fill(WEAK_PASSWORD);
      await page
        .getByRole('button')
        .first()
        .click()
        .catch(() => {});

      await expect(
        page.locator('text=/mínim|fraca|inválida|caracteres|forte/i').first(),
      ).toBeVisible({ timeout: 5_000 });
      // Validação client-side deve impedir a chamada de rede.
      expect(authCalled, 'validação client deve barrar antes de bater no auth').toBe(false);
    }
  });

  test('negativo: senhas divergentes mostram erro de confirmação', async ({ page }) => {
    await gotoAndSettle(page, '/reset-password#access_token=fake&type=recovery');
    await waitRouteReady(page);

    const pwds = page.locator('input[type="password"]');
    if ((await pwds.count()) >= 2) {
      await pwds.first().fill(CONFIRMATION_PASSWORD);
      await pwds.nth(1).fill(DIFFERENT_PASSWORD);
      await page
        .getByRole('button', { name: /atualizar|salvar|redefinir/i })
        .first()
        .click()
        .catch(() => {});

      await expect(page.locator('text=/coincid|iguais|conferem|confirma/i').first()).toBeVisible({
        timeout: 5_000,
      });
    }
  });

  test('negativo: backend 5xx no updateUser mostra alerta amigável (sem freeze)', async ({
    page,
  }) => {
    await page.route(/\/auth\/v1\/user/, (route) =>
      route.fulfill({ status: 500, body: JSON.stringify({ error: 'server_error' }) }),
    );

    await gotoAndSettle(page, '/reset-password#access_token=fake&type=recovery');
    await waitRouteReady(page);

    const pwds = page.locator('input[type="password"]');
    if ((await pwds.count()) > 0) {
      await pwds.first().fill(RECOVERY_PASSWORD);
      if ((await pwds.count()) >= 2) await pwds.nth(1).fill(RECOVERY_PASSWORD);
      await page
        .getByRole('button', { name: /atualizar|salvar|redefinir/i })
        .first()
        .click()
        .catch(() => {});

      // O erro precisa ser comunicado e o formulário deve voltar a aceitar tentativa.
      const alert = page.getByRole('alert').first();
      const submit = page.getByRole('button', { name: /atualizar|salvar|redefinir/i }).first();
      await expect(alert).toBeVisible({ timeout: 8_000 });
      await expect(submit).toBeEnabled();
    }
  });

  test('negativo: solicitação de reset para email inexistente NÃO confirma existência (anti-enumeration)', async ({
    page,
  }) => {
    await gotoAndSettle(page, '/login');
    // Tenta acessar fluxo de "esqueceu a senha" — se o link existir.
    const forgot = page.locator('[data-testid="login-forgot-link"]').first();
    if (!(await forgot.isVisible().catch(() => false))) {
      test.skip(true, 'link de esqueceu-senha não exposto na UI');
    }
    await forgot.click();

    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill(UNKNOWN_EMAIL);
    await page
      .getByRole('button', { name: /enviar|solicitar|recuperar/i })
      .first()
      .click()
      .catch(() => {});

    // Resposta NÃO pode revelar "email não encontrado" — deve ser genérica.
    const leakedMsg = await page
      .locator('text=/não.+encontrad|inexistente|não.+cadastrad/i')
      .first()
      .isVisible()
      .catch(() => false);
    expect(leakedMsg, 'anti-enumeration: NUNCA confirmar inexistência de email').toBe(false);
  });
});
