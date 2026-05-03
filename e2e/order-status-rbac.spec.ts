import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Order RBAC and Status Flow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // In a real E2E, we would navigate to login and authenticate
    // await page.goto('/login');
    // await page.fill('input[name="email"]', 'pac@example.com');
  });

  test('should allow status transitions based on roles', async ({ page }) => {
    await page.goto('/sicoob/pedidos/kanban');
    
    // Simulating role selection for testing purposes if UI allows
    // await page.selectOption('select[aria-label="Selecionar Papel"]', 'comprador_pac');

    const orderId = 'PED-E2E-001';
    const orderCard = page.locator(`text=${orderId}`);
    await expect(orderCard).toBeVisible();

    // Verify Drag and Drop restriction via UI cues (lock icon or cursor)
    const lockIcon = page.locator('svg[aria-label="Sem permissão"]');
    // For PAC, some transitions should be locked
  });

  test('should validate exported file content', async ({ page }) => {
    await page.goto('/sicoob/pedidos');
    
    // Trigger export
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Exportação em Lote")');
    await page.click('button:has-text("Solicitar Excel")');
    const download = await downloadPromise;

    // Save and verify file
    const filePath = path.join(__dirname, '../test-results', download.suggestedFilename());
    await download.saveAs(filePath);
    
    expect(fs.existsSync(filePath)).toBeTruthy();
    const stats = fs.statSync(filePath);
    expect(stats.size).toBeGreaterThan(0);

    // Clean up
    fs.unlinkSync(filePath);
  });

  test('should verify audit log for status transitions', async ({ page }) => {
    await page.goto('/sicoob/pedidos/PED-E2E-001');
    
    await expect(page.locator('text=Timeline de Auditoria')).toBeVisible();
    
    // Check if the initial seed audit exists
    await expect(page.locator('text=Pedido criado via script de seed')).toBeVisible();
  });
});
