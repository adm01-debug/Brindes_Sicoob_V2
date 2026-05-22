import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { Sel } from '../fixtures/selectors';

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
    const cartTrigger = page.locator(Sel.cart.trigger);
    await cartTrigger.click();
    
    const cartDrawer = page.locator(Sel.cart.drawer);
    await expect(cartDrawer).toBeVisible();

    // Se não houver carrinho ativo ou quiser garantir um novo
    const newCartBtn = page.locator(Sel.cart.tabNew);
    if (await newCartBtn.isVisible()) {
      await newCartBtn.click();
      
      // Buscar empresa no seletor (CartCompanyPicker usa input genérico sem testid, mas Sel.cart.companyPickerSelect está definido para o botão de seleção se houver)
      const searchInput = page.locator('input[placeholder="Buscar empresa..."]');
      await searchInput.fill('Sicoob');
      
      // Selecionar a primeira empresa da lista (CartCompanyPicker usa botões com texto da empresa)
      const companyItem = page.locator('button:has-text("Sicoob")').first();
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
    
    // Abrir ações rápidas
    await firstProduct.locator(Sel.product.actionsToggle).click();
    
    // Clicar em "Orçar" (QuickAddToQuote) que usa o ícone de ShoppingCart
    const addToCartBtn = firstProduct.locator('button[aria-label="ShoppingCart"]');
    await addToCartBtn.click();

    // No Popover do QuickAddToQuote: Escolher cor (SingleVariantPicker) se existir
    const variantItem = page.locator('.flex.flex-wrap.gap-2 button').first();
    if (await variantItem.isVisible()) {
      await variantItem.click();
    }

    // Confirmar adição no botão de ação final do popover
    const confirmAddBtn = page.locator(Sel.product.cardAddToCart);
    await expect(confirmAddBtn).toBeVisible();
    await confirmAddBtn.click();
    
    // Validar toast de sucesso (usando seletor estável da lib sonner via Sel.ext)
    await expect(page.locator(Sel.ext.sonnerToast).filter({ hasText: 'adicionado ao carrinho' })).toBeVisible();

    // 3. Validar no carrinho e atualizar quantidade
    await cartTrigger.click();
    
    // Verificar se o item aparece na lista do cabeçalho
    await expect(page.locator(Sel.cart.itemName).filter({ hasText: productName || '' }).first()).toBeVisible();
    
    // Incrementar quantidade
    const incrementBtn = page.locator(Sel.cart.increment).first();
    const qtyBadge = page.locator(Sel.cart.qtyBadge).first();
    
    const initialQty = await qtyBadge.textContent();
    await incrementBtn.click();
    
    // Validar atualização reativa
    await expect(qtyBadge).not.toHaveText(initialQty || '1');

    // 4. Remover item
    const decrementBtn = page.locator(Sel.cart.decrement).first();
    // Clicar até remover (se o ícone for lixo, remove direto)
    while (await decrementBtn.isVisible()) {
      await decrementBtn.click();
      // Se aparecer o ícone de lixo (Sel.cart.qtyRemoveIcon), o próximo clique remove
      if (await page.locator(Sel.cart.qtyRemoveIcon).isVisible()) {
         await decrementBtn.click();
         break;
      }
    }

    // 5. Validar persistência pós-reload
    await page.reload();
    await cartTrigger.click();
    await expect(page.locator(Sel.cart.itemName).filter({ hasText: productName || '' })).not.toBeVisible();
  });
});

