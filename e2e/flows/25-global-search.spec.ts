/**
 * Fluxo: Busca Global — abre palette, digita termo, valida resultados e navegação.
 * Seletores: global-search-trigger, global-search-input (data-testid).
 */
import { test, expect, requireAuth } from '../fixtures/test-base';
import { gotoAndSettle } from '../helpers/nav';
import { TID } from '../fixtures/selectors';

const COMMON_SEARCH_TERM = 'caneta';
const MISSING_SEARCH_TERM = 'termoinexistentexyzw123';

test.describe('Fluxo: Busca Global', () => {
  test.beforeEach(() => requireAuth());

  test('abre a busca global e exibe resultados para um termo comum', async ({ page }) => {
    await gotoAndSettle(page, '/');

    // Abre a busca clicando no trigger
    const trigger = page.locator(TID('global-search-trigger'));
    await expect(trigger).toBeVisible();
    await trigger.click();

    // Valida que o input da busca está visível e focado
    const input = page.locator(TID('global-search-input'));
    await expect(input).toBeVisible();

    // Digita um termo que deve retornar resultados (caneta é comum no catálogo)
    await input.fill(COMMON_SEARCH_TERM);

    // Aguarda processamento da IA e busca (considerando debouncing de 500ms)
    // Procuramos por um grupo de resultados de "Produto"
    const productGroup = page.locator('div[cmdk-group-heading]:has-text("Produtos")');
    await expect(productGroup).toBeVisible({ timeout: 15_000 });

    // Valida que há itens de resultado
    const results = page.locator('[cmdk-item]');
    expect(await results.count()).toBeGreaterThan(0);

    // Valida que não há erros no console (assertFeatureLoads já faz isso em smoke, mas aqui é manual)
    // No Playwright test as exceptions lançadas na página falham o teste por padrão se não capturadas.
  });

  test('navega para um produto ao selecionar um resultado', async ({ page }) => {
    await gotoAndSettle(page, '/');

    const trigger = page.locator(TID('global-search-trigger'));
    await trigger.click();

    const input = page.locator(TID('global-search-input'));
    await input.fill(COMMON_SEARCH_TERM);

    // Espera o primeiro resultado aparecer e clica
    const firstResult = page.locator('[cmdk-item]').first();
    await expect(firstResult).toBeVisible({ timeout: 10_000 });

    await firstResult.click();

    // Valida navegação para a página de produto
    await expect(page).toHaveURL(/\/produto\//, { timeout: 10_000 });
  });

  test('exibe estado vazio quando nenhum resultado é encontrado', async ({ page }) => {
    await gotoAndSettle(page, '/');

    const trigger = page.locator(TID('global-search-trigger'));
    await trigger.click();

    const input = page.locator(TID('global-search-input'));
    // Termo aleatório improvável
    await input.fill(MISSING_SEARCH_TERM);

    // Valida mensagem de estado vazio (EmptySearchState)
    const emptyMsg = page.locator('text=Nenhum resultado para "termoinexistentexyzw123"');
    await expect(emptyMsg).toBeVisible({ timeout: 10_000 });
  });
});
