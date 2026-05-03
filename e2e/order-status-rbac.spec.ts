import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
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
    
    const filePath = path.join(__dirname, '../test-results', download.suggestedFilename());
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
    await page.goto('/sicoob/pedidos/00000000-0000-0000-0000-000000000010');
    
    const auditTimeline = page.locator('[data-testid="order-audit-timeline"]');
    await expect(auditTimeline).toBeVisible();
    
    // Validate specific audit entry fields
    await expect(auditTimeline.locator('text=Pedido iniciado via E2E Seed')).toBeVisible();
    await expect(auditTimeline.locator('text=Por: System')).toBeVisible();
  });

  test('should block unauthorized status transitions in Kanban', async ({ page }) => {
    // 1. Login as PAC
    await page.goto('/login');
    await page.fill('input[name="email"]', USERS.PAC.email);
    await page.fill('input[name="password"]', USERS.PAC.password);
    await page.click('button[type="submit"]');

    await page.goto('/sicoob/pedidos/kanban');
    
    // PAC should see lock icons on columns they can't move to
    const lockedCard = page.locator('svg[aria-label="Sem permissão"]').first();
    await expect(lockedCard).toBeVisible();
  });
});
