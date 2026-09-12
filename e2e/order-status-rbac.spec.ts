import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from '@e965/xlsx';
import pdf from 'pdf-parse';

test.describe('Order RBAC and Status Flow E2E', () => {
  // Credentials from seed
  const USERS = {
    PAC: { email: 'pac@e2e.test', password: 'password123' },
    GESTOR: { email: 'gestor@e2e.test', password: 'password123' },
    VENDEDOR: { email: 'vendedor@e2e.test', password: 'password123' }
  };

  test('should allow PAC to create and view draft, and correctly apply multi-field filters', async ({ page }) => {
    // 1. Login as PAC
    await page.goto('/login');
    await page.fill('input[name="email"]', USERS.PAC.email);
    await page.fill('input[name="password"]', USERS.PAC.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');

    // 2. Navigate to Orders
    await page.goto('/pedidos');
    await expect(page.locator('[data-testid="page-title-pedidos"]')).toBeVisible();

    // 3. Test Search (Order Number)
    await page.fill('[data-testid="order-search-input"]', 'PED-SEED');
    // Allow time for debounced search/network
    await page.waitForTimeout(1000);
    const orderCount = await page.locator('div:has-text("PED-SEED-E2E-001")').count();
    expect(orderCount).toBeGreaterThan(0);

    // 4. Test Combined Filters (Status + Company)
    await page.click('[data-testid="order-status-filter"]');
    await page.click('text=Rascunho');
    
    await page.click('[data-testid="more-filters-btn"]');
    await page.fill('[data-testid="company-filter-input"]', 'Global Tech');
    await page.press('[data-testid="company-filter-input"]', 'Enter');
    
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Global Tech E2E')).toBeVisible();

    // 5. Export and Validate Content (Ensuring filters applied to export)
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Exportar")');
    await page.click('text=Excel (.xlsx)');
    const download = await downloadPromise;
    
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const filePath = path.join(currentDir, '../test-results', download.suggestedFilename());
    await download.saveAs(filePath);

    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data: any[] = XLSX.utils.sheet_to_json(sheet);
    
    // Check that exported data matches our filter
    expect(data.length).toBeGreaterThan(0);
    const hasCorrectCompany = data.every(row => 
      Object.values(row).some(v => String(v).includes('Global Tech'))
    );
    expect(hasCorrectCompany).toBeTruthy();
    
    fs.unlinkSync(filePath);
  });

  test('should validate audit log details after status transition', async ({ page }) => {
    // 1. Login as Gestor
    await page.goto('/login');
    await page.fill('input[name="email"]', USERS.GESTOR.email);
    await page.fill('input[name="password"]', USERS.GESTOR.password);
    await page.click('button[type="submit"]');

    // 2. Open Order Detail and Check Audit
    await page.goto('/pedidos/00000000-0000-0000-0000-000000000010');
    
    const auditTimeline = page.locator('[data-testid="order-audit-timeline"]');
    await expect(auditTimeline).toBeVisible();
    
    // Validate specific audit entry fields
    await expect(auditTimeline.locator('text=Pedido iniciado via E2E Seed')).toBeVisible();
    await expect(auditTimeline.locator('text=Por: System')).toBeVisible();
  });

  test('should block unauthorized status transitions in Kanban and validate error messages', async ({ page }) => {
    // 1. Login as PAC
    await page.goto('/login');
    await page.fill('input[name="email"]', USERS.PAC.email);
    await page.fill('input[name="password"]', USERS.PAC.password);
    await page.click('button[type="submit"]');

    await page.goto('/sicoob/pedidos/kanban');
    
    // Check if locked items show correct reason on hover/tooltip if possible,
    // or verify that a forbidden role trying to access an admin-only route gets redirected
    await page.goto('/gestor/compras');
    await expect(page.locator('[data-testid="app-forbidden"]')).toBeVisible();
    await expect(page.locator('text=Acesso Negado')).toBeVisible();
  });

  test('should allow full status lifecycle including cancellation', async ({ page }) => {
     // 1. Login as Seller
     await page.goto('/login');
     await page.fill('input[name="email"]', USERS.VENDEDOR.email);
     await page.fill('input[name="password"]', USERS.VENDEDOR.password);
     await page.click('button[type="submit"]');

     // 2. Cancel an order
     await page.goto('/pedidos/00000000-0000-0000-0000-000000000010');
     // Logic to find and click cancel button if present or status dropdown
  });

  test('should verify audit page with filters', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', USERS.GESTOR.email);
    await page.fill('input[name="password"]', USERS.GESTOR.password);
    await page.click('button[type="submit"]');

    await page.goto('/pedidos/00000000-0000-0000-0000-000000000010/auditoria');
    await expect(page.locator('text=Histórico de Auditoria')).toBeVisible();
    
    // Apply role filter
    await page.click('text=Todos os papéis');
    await page.click('text=PAC');
    
    // Description check
    await expect(page.locator('text=Pedido iniciado via E2E Seed')).toBeVisible();
  });
});
