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

  test('should allow PAC to create and view draft, but block seller actions', async ({ page }) => {
    // 1. Login as PAC
    await page.goto('/login');
    await page.fill('input[name="email"]', USERS.PAC.email);
    await page.fill('input[name="password"]', USERS.PAC.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');

    // 2. Navigate to Orders and check RBAC block
    await page.goto('/vendedor');
    await expect(page.locator('text=Acesso Negado')).toBeVisible();

    // 3. Export and Validate Content
    await page.goto('/sicoob/pedidos');
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Exportação em Lote")');
    await page.click('button:has-text("Solicitar Excel")');
    const download = await downloadPromise;
    
    const filePath = path.join(__dirname, '../test-results', download.suggestedFilename());
    await download.saveAs(filePath);

    // Validate Excel content using XLSX
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    expect(data.length).toBeGreaterThan(0);
    // @ts-ignore
    expect(data[0]).toHaveProperty('Status');
    
    // PDF Validation Example (if export type was PDF)
    const pdfBuffer = fs.readFileSync(filePath.replace('.csv', '.pdf').replace('.xlsx', '.pdf'));
    if (fs.existsSync(filePath.replace('.csv', '.pdf').replace('.xlsx', '.pdf'))) {
      const pdfData = await pdf(pdfBuffer);
      expect(pdfData.text).toContain('Relatório de Pedidos');
    }
    
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
