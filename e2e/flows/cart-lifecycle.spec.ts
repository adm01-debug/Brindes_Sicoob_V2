import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';

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
    await page.goto('/');
  });

  test('complete seller cart lifecycle: create, add, update, remove', async ({ page }) => {
    // 1. Abrir gaveta do carrinho e criar novo se necessário
    const cartTrigger = page.getByTestId('cart-trigger');
    await cartTrigger.click();
    
    const cartDrawer = page.getByTestId('cart-drawer');
    await expect(cartDrawer).toBeVisible();

    // Se não houver carrinho ativo ou quiser garantir um novo
    const newCartBtn = page.getByTestId('cart-tab-new');
    if (await newCartBtn.isVisible()) {
      await newCartBtn.click();
      
      // Buscar empresa no seletor
      const searchInput = page.locator('input[placeholder="Buscar empresa..."]');
      await searchInput.fill('Sicoob');
      
      // Selecionar a primeira empresa da lista
      const companyItem = page.locator('button:has-text("Sicoob")').first();
      await companyItem.click();
      
      // Esperar fechar seletor e mostrar o tab ativo
      await expect(page.getByTestId('cart-tab').first()).toBeVisible();
    }

    // Fechar popover para interagir com o catálogo
    await page.keyboard.press('Escape');

    // 2. Adicionar item do catálogo
    // Esperar pelos cards de produto
    const firstProduct = page.getByTestId('product-card').first();
    await firstProduct.scrollIntoViewIfNeeded();
    
    const productName = await firstProduct.getByTestId('product-card-name').textContent();
    
    // Abrir ações rápidas
    await firstProduct.getByTestId('product-card-actions-toggle').click();
    
    // Clicar em "Orçar" (QuickAddToQuote)
    const addToCartBtn = firstProduct.locator('button[aria-label="ShoppingCart"]');
    await addToCartBtn.click();

    // No Popover do QuickAddToQuote: Escolher cor (SingleVariantPicker) se existir
    const variantItem = page.locator('.flex.flex-wrap.gap-2 button').first();
    if (await variantItem.isVisible()) {
      await variantItem.click();
    }

    // Confirmar adição no botão de ação final do popover
    const confirmAddBtn = page.getByTestId('product-card-add-to-cart');
    await expect(confirmAddBtn).toBeVisible();
    await confirmAddBtn.click();
    
    // Validar toast de sucesso
    await expect(page.locator('text=adicionado ao carrinho')).toBeVisible();

    // 3. Validar no carrinho e atualizar quantidade
    await cartTrigger.click();
    
    // Verificar se o item aparece na lista do cabeçalho
    await expect(page.locator(`text=${productName}`).first()).toBeVisible();
    
    // Incrementar quantidade
    const incrementBtn = page.locator('button[aria-label="Aumentar quantidade"]').first();
    const qtyBadge = page.locator('[data-testid="cart-qty-badge"]').first();
    
    const initialQty = await qtyBadge.textContent();
    await incrementBtn.click();
    
    // Validar atualização reativa (Zustand -> Context -> UI)
    await expect(qtyBadge).not.toHaveText(initialQty || '1');

    // 4. Remover item
    const removeBtn = page.locator('button[aria-label="Diminuir quantidade"]').first();
    // Clicar até remover (ou se o ícone for lixo, remove direto)
    while (await removeBtn.isVisible()) {
      await removeBtn.click();
      // Se aparecer o ícone de lixo, o próximo clique remove
      if (await page.getByTestId('cart-qty-remove-icon').isVisible()) {
         await removeBtn.click();
         break;
      }
    }

    // 5. Validar persistência pós-reload
    await page.reload();
    await cartTrigger.click();
    await expect(page.locator(`text=${productName}`)).not.toBeVisible();
  });
});
