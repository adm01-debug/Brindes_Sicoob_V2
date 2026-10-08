import { test, expect } from './fixtures/test-base';
import { loginAs } from './helpers/auth';
import { gotoAndSettle } from './helpers/nav';

const CATALOG_SEARCH_TERM = 'Teste';
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

    // Check for critical accessibility markers
    const progressBars = page.locator('[role="progressbar"]');
    await expect(progressBars.first()).toBeVisible();
    await expect(progressBars.first()).toHaveAttribute('aria-label', /Consumo de verba/);

    // Check buttons have labels
    const editButtons = page.locator('button[aria-label^="Editar verba"]');
    await expect(editButtons.first()).toBeVisible();
  });

  test('Performance do ProductsManager com catálogo simulado', async ({ page }) => {
    await loginAs(page, 'admin');
    const startTime = Date.now();
    await gotoAndSettle(page, '/admin/cadastros');

    // Wait for the table to load
    await page.waitForSelector('table');

    const loadTime = Date.now() - startTime;
    console.log(`Tempo de carregamento do catálogo: ${loadTime}ms`);

    // Threshold de 3s para conformidade enterprise
    expect(loadTime).toBeLessThan(3000);

    // Verificar se os filtros estão funcionais
    await page.locator('input[placeholder*="Buscar"]').fill(CATALOG_SEARCH_TERM);
    await expect(page.locator('table')).toBeVisible();
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
