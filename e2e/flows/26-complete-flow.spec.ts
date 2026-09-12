import { test, expect, requireAuth } from "../fixtures/test-base";
import { loginAs } from "../helpers/auth";
import { gotoAndSettle } from "../helpers/nav";

test.describe("E2E — catálogo até novo orçamento", () => {
  test.beforeEach(() => requireAuth());

  test("usuário autenticado sai do catálogo e alcança o criador de orçamento", async ({ page }) => {
    await loginAs(page);
    await gotoAndSettle(page, "/produtos");
    await expect(page).not.toHaveURL(/\/login/);

    await gotoAndSettle(page, "/orcamentos/novo");
    await expect(page).toHaveURL(/\/orcamentos\/novo/);
    await expect(page.locator("body")).toBeVisible();
  });
});
