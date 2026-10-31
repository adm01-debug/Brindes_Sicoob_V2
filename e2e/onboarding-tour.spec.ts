import { test, expect, type Page } from '@playwright/test';

async function mockPendingOnboarding(page: Page): Promise<void> {
  await page.route('**/rest/v1/user_onboarding*', async (route) => {
    const method = route.request().method();

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '00000000-0000-4000-8000-000000000001',
          has_completed_tour: false,
          current_step: 0,
          completed_steps: [],
        }),
      });
      return;
    }

    if (method === 'PATCH') {
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    await route.fallback();
  });
}

test.describe('Onboarding Tour', () => {
  test.beforeEach(async ({ page }) => {
    // Mantém o usuário canônico concluído para os demais testes e cria um
    // estado pendente isolado somente nesta página.
    await mockPendingOnboarding(page);
    // Este spec valida o próprio tour. O helper global `gotoAndSettle`
    // dispensa overlays de onboarding para não bloquear as demais jornadas.
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('#root').waitFor({ state: 'visible' });
  });

  test('should complete the tour successfully', async ({ page }) => {
    // Verificar se o tour abriu (pelo menos o primeiro passo)
    const tourOverlay = page.getByTestId('onboarding-tour');
    await expect(tourOverlay).toBeVisible({ timeout: 10000 });

    // Verificar título do primeiro passo
    await expect(
      tourOverlay.getByRole('heading', { name: 'Bem-vindo ao Brindes Sicoob!' }),
    ).toBeVisible();

    // Clicar em Próximo
    await tourOverlay.getByRole('button', { name: 'Próximo' }).click();

    // Verificar se avançou (título deve mudar)
    await expect(
      tourOverlay.getByRole('heading', { name: 'Catálogo de Produtos' }),
    ).toBeVisible();

    // Clicar em Anterior
    await tourOverlay.getByRole('button', { name: 'Anterior' }).click();
    await expect(
      tourOverlay.getByRole('heading', { name: 'Bem-vindo ao Brindes Sicoob!' }),
    ).toBeVisible();

    // Pular tour pelo botão X
    await tourOverlay.getByLabel('Fechar').click();

    // Tour deve desaparecer
    await expect(tourOverlay).not.toBeVisible();
  });

  test('should handle missing target elements gracefully', async ({ page }) => {
    // Simular um passo onde o target não existe (ou apenas observar o comportamento padrão)
    // O tour deve mostrar o tooltip centralizado se o target não for encontrado

    const tourOverlay = page.getByTestId('onboarding-tour');
    await expect(tourOverlay).toBeVisible({ timeout: 10_000 });

    // Avançar até o passo 3 (Busca Inteligente)
    await tourOverlay.getByRole('button', { name: 'Próximo' }).click();
    await tourOverlay.getByRole('button', { name: 'Próximo' }).click();

    await expect(tourOverlay.getByRole('heading', { name: 'Busca Inteligente' })).toBeVisible();

    // O tooltip deve estar visível mesmo se o seletor falhar (fallback implementado)
    const tooltip = tourOverlay.locator('div.bg-card.border.border-border');
    await expect(tooltip).toBeVisible();
  });
});
