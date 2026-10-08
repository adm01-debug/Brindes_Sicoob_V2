import { gotoAndSettle } from '../helpers/nav';
import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { Sel } from '../fixtures/selectors';

const COMPANY_SEARCH_TERM = 'QA';

/**
 * Fluxo de ciclo de vida do carrinho de vendedor (Seller Cart).
 * 1. Autentica
 * 2. Vai ao catálogo
 * 3. Cria um carrinho vinculado a uma empresa
 * 4. Adiciona item
 * 5. Atualiza quantidade
 * 6. Remove item e valida persistência
 */
test.describe('Seller Cart Flow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Autentica via helper SSOT
    await loginAs(page);
    // Garantir que estamos no catálogo (Index page)
    await gotoAndSettle(page, '/');
  });

  test('complete seller cart lifecycle: create, add, update, remove', async ({ page }) => {
    test.setTimeout(90_000);
    // 1. Abrir gaveta do carrinho e criar novo se necessário
    const cartTrigger = page.locator(Sel.cart.trigger);
    await cartTrigger.click();

    const cartDrawer = page.locator(Sel.cart.drawer);
    await expect(cartDrawer).toBeVisible();

    // Se não houver carrinho ativo ou quiser garantir um novo
    const newCartBtn = page.locator(Sel.cart.tabNew);
    if (await newCartBtn.isVisible()) {
      await newCartBtn.click();

      // Buscar empresa no seletor (CartCompanyPicker usa input genérico sem testid, mas Sel.cart.companyPickerSelect está definido para o botão de seleção se houver)
      const searchInput = page.getByPlaceholder('Buscar cooperativa ou unidade…');
      await searchInput.fill(COMPANY_SEARCH_TERM);

      // Selecionar a primeira empresa retornada pelo CRM.
      const companyItem = page.locator(Sel.cart.companyPickerSelect).first();
      await expect(companyItem).toBeVisible();
      await companyItem.click();

      // Esperar fechar seletor e mostrar o tab ativo
      await expect(page.locator(Sel.cart.tab).first()).toBeVisible();
    }

    // Fechar popover para interagir com o catálogo
    await page.keyboard.press('Escape');

    // 2. Adicionar item do catálogo
    // Esperar pelos cards de produto
    const firstProduct = page.locator(Sel.product.card).first();
    await firstProduct.scrollIntoViewIfNeeded();

    const productName = await firstProduct.locator(Sel.product.cardName).textContent();

    // Abrir o CTA principal e persistente do card.
    const addToCartBtn = firstProduct.locator(Sel.product.cardQuoteTrigger);
    await expect(addToCartBtn).toBeVisible();
    await addToCartBtn.click();

    // O QuickAddToQuote sempre inicia no seletor de variante. Usar o contrato
    // estável evita clicar em botões de outros painéis do catálogo.
    const noVariant = page.locator(Sel.variant.noVariant).first();
    await expect(noVariant).toBeVisible({ timeout: 10_000 });
    await noVariant.click();

    // Confirmar adição no botão de ação final do popover
    const confirmAddBtn = page.locator(Sel.product.cardAddToCart);
    await expect(confirmAddBtn).toBeVisible();
    await confirmAddBtn.click();

    // Validar toast de sucesso (usando seletor estável da lib sonner via Sel.ext)
    await expect(
      page.locator(Sel.ext.sonnerToast).filter({ hasText: 'adicionado ao orçamento' }),
    ).toBeVisible();

    // 3. Validar no carrinho e atualizar quantidade
    await cartTrigger.click();

    // Verificar se o item aparece na lista do cabeçalho
    await expect(
      page
        .locator(Sel.cart.itemName)
        .filter({ hasText: productName || '' })
        .first(),
    ).toBeVisible();

    // Incrementar quantidade
    const incrementBtn = page.locator(Sel.cart.increment).first();
    const qtyBadge = page.locator(Sel.cart.qtyBadge).first();

    const initialQty = await qtyBadge.textContent();
    await incrementBtn.click();

    // Validar atualização reativa
    await expect(qtyBadge).not.toHaveText(initialQty || '1');

    // 4. Remover item
    await page.locator(Sel.cart.itemActionRemove).first().click({ force: true });

    // 5. Validar persistência pós-reload
    await page.reload();
    await cartTrigger.click();
    await expect(
      page.locator(Sel.cart.itemName).filter({ hasText: productName || '' }),
    ).not.toBeVisible();
  });
});
