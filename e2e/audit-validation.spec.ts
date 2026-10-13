import { test, expect } from './fixtures/test-base';
import { loginAs } from './helpers/auth';
import { gotoAndSettle } from './helpers/nav';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

async function getAccessToken(page: import('@playwright/test').Page): Promise<string | null> {
  return page.evaluate(() => {
    for (const key of Object.keys(localStorage)) {
      if (!/sb-.*-auth-token/.test(key)) continue;
      try {
        const session = JSON.parse(localStorage.getItem(key) ?? '{}');
        const token = session?.access_token ?? session?.currentSession?.access_token;
        if (typeof token === 'string') return token;
      } catch {
        // A chave não contém uma sessão Supabase válida.
      }
    }
    return null;
  });
}

test.describe('Enterprise Audit Validation Suite', () => {
  test('Acessibilidade WCAG no AdminVerbasPage', async ({ page }) => {
    await loginAs(page, 'admin');
    await gotoAndSettle(page, '/admin/verbas');

    await expect(page.getByRole('heading', { name: 'Gestão de Verbas (Orçamentos)' })).toBeVisible();
    const panel = page.getByRole('tabpanel', { name: 'Limites por PA' });
    await expect(panel).toBeVisible();
    await expect(panel.getByRole('table')).toBeVisible();
    const progressBars = panel.getByRole('progressbar', { name: /Consumo de verba/ });
    if ((await progressBars.count()) > 0) {
      await expect(progressBars.first()).toBeVisible();
      await expect(panel.locator('button[aria-label^="Editar verba"]').first()).toBeVisible();
    } else {
      await expect(panel.getByRole('cell', { name: 'Nenhuma verba encontrada' })).toBeVisible();
    }
  });

  test('Performance e contrato do cadastro administrativo de produtos', async ({ page }) => {
    await loginAs(page, 'admin');
    const startTime = Date.now();
    await gotoAndSettle(page, '/admin/cadastros');

    await expect(page.getByRole('heading', { name: 'Cadastro de Produtos' })).toBeVisible();

    const loadTime = Date.now() - startTime;
    console.log(`Tempo de carregamento do cadastro: ${loadTime}ms`);

    // Limite de regressão inclui rede e carregamento lazy do módulo administrativo.
    expect(loadTime).toBeLessThan(10_000);

    // O formulário principal precisa estar integralmente operável após o carregamento.
    await expect(page.getByRole('textbox', { name: 'Nome do Produto *' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'SKU *' })).toBeVisible();
    await expect(page.getByRole('spinbutton', { name: 'Preço (R$) *' })).toBeVisible();
  });

  test('Endpoint de recomendações de IA responde com fallback ou cota explícita', async ({
    page,
  }) => {
    test.skip(
      !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY,
      'VITE_SUPABASE_* ausentes para validar a Edge Function canônica.',
    );
    await loginAs(page, 'user');
    await gotoAndSettle(page, '/produtos');
    const accessToken = await getAccessToken(page);
    expect(accessToken, 'access_token deve existir após o setup autenticado').toBeTruthy();

    const response = await page.request.post(`${SUPABASE_URL}/functions/v1/ai-recommendations`, {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
      data: {
        client: { name: 'Audit Test' },
        products: [{ id: '1', name: 'Caneta', category: 'Escritório' }],
      },
    });

    expect([200, 402, 429]).toContain(response.status());
  });
});
