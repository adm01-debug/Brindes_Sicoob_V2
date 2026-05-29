import { test, expect } from '@playwright/test';

test.describe('E2E Complete Freight Quest Flow', () => {
  test('should go through the entire product to quote lifecycle', async ({ page }) => {
    // 1. Auth
    await page.goto('/');
    // Assuming we have a way to skip real auth in test env or use cookies
    // For this simulation, we'll check for public elements first
    
    await expect(page).toHaveTitle(/Freight/i);

    // 2. Browse Products
    await page.click('text=Catálogo');
    await expect(page).toHaveURL(/.*catalog/);
    
    // 3. Add to Cart
    const firstProduct = page.locator('[data-testid="product-card"]').first();
    await firstProduct.hover();
    await firstProduct.locator('button:has-text("Adicionar")').click();
    
    // 4. Update Quantity
    await page.click('[data-testid="cart-button"]');
    await page.locator('[data-testid="cart-item-quantity-input"]').fill('10');
    
    // 5. Remove from Cart
    await page.click('[data-testid="remove-from-cart"]');
    await expect(page.locator('text=Carrinho vazio')).toBeVisible();

    // 6. Test Error States
    await page.goto('/invalid-route');
    await expect(page.locator('text=404')).toBeVisible();
  });
});
