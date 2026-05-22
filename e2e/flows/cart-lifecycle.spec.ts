import { test, expect } from '@playwright/test';

test.describe('Cart Flow E2E', () => {
  // Use a unique session for each test to avoid conflicts
  test.beforeEach(async ({ page }) => {
    // Navigation to catalog
    await page.goto('/catalog');
  });

  test('complete cart lifecycle: add, update, remove', async ({ page }) => {
    // 1. Add item to cart
    // Wait for product cards to load
    await page.waitForSelector('[data-testid^="product-card-"]');
    
    const firstProduct = page.locator('[data-testid^="product-card-"]').first();
    const productName = await firstProduct.locator('h3').textContent();
    const addButton = firstProduct.locator('button:has-text("Adicionar")');
    
    await addButton.click();
    
    // Verify toast notification
    await expect(page.locator('text=Produto adicionado ao carrinho')).toBeVisible();
    
    // 2. Open cart and verify item
    await page.locator('[data-testid="cart-button"]').click();
    await expect(page.locator(`text=${productName}`)).toBeVisible();
    
    // 3. Update quantity
    const quantityInput = page.locator('[data-testid="cart-item-quantity"]').first();
    await quantityInput.fill('3');
    await quantityInput.press('Enter');
    
    // Wait for debounce and verification
    await page.waitForTimeout(1500); // useCart has 1s debounce
    await expect(quantityInput).toHaveValue('3');
    
    // 4. Remove item
    await page.locator('[data-testid="remove-cart-item"]').first().click();
    await expect(page.locator('text=Item removido do carrinho')).toBeVisible();
    
    // 5. Verify empty cart
    await expect(page.locator('text=Seu carrinho está vazio')).toBeVisible();
  });
});
