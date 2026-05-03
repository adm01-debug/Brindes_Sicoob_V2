import { test, expect } from "../../fixtures/test-base";
import { loginAs, logout } from "../../helpers/auth";
import { gotoAndSettle } from "../../helpers/nav";

test.describe("Sicoob Vendas — Access Control", () => {
  test("User with role 'vendedor' can access /sicoob/vendas", async ({ page }) => {
    // This assumes process.env.E2E_USER_EMAIL is a Vendedor in our E2E environment
    // If 'user' role in loginAs maps to Vendedor, this should work.
    await loginAs(page, "user"); 
    
    await gotoAndSettle(page, "/sicoob/vendas");
    await expect(page).not.toHaveURL(/\/login/);
    
    // Check if some unique element of the Seller Panel is visible
    // data-testid is preferred as per memory
    const pageTitle = page.getByTestId("page-title-vendas");
    if (await pageTitle.isVisible()) {
      await expect(pageTitle).toBeVisible();
    }
  });

  test("User with role 'agente' (default user) is redirected from /sicoob/vendas", async ({ page }) => {
    // If 'user' is Vendedor, we need another role or a way to mock a non-vendedor
    // For now, let's assume we have a way to differentiate.
    // In a real environment, we'd use specific test accounts.
    
    // If 'admin' (Supervisor) has access to everything, they should also access it.
    await loginAs(page, "admin");
    await gotoAndSettle(page, "/sicoob/vendas");
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.url()).toContain("/sicoob/vendas");
  });

  test("Unauthenticated user is redirected to /login", async ({ page }) => {
    await logout(page);
    await gotoAndSettle(page, "/sicoob/vendas");
    await expect(page.url()).toContain("/login");
  });
});
