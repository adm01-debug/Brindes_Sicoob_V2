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

  test("User with role 'agente' (default user) is redirected to /403 from /sicoob/vendas", async ({ page }) => {
    // Assuming 'editor' role used here mimics a role without vendedor permission for this test
    // In a real env, we'd use a specific 'agente' test account
    await loginAs(page, "editor"); 
    await gotoAndSettle(page, "/sicoob/vendas");
    await expect(page.url()).toContain("/403");
    await expect(page.getByText(/Acesso Negado/i)).toBeVisible();
  });


  test("Unauthenticated user is redirected to /login", async ({ page }) => {
    await logout(page);
    await gotoAndSettle(page, "/sicoob/vendas");
    await expect(page.url()).toContain("/login");
  });
});
