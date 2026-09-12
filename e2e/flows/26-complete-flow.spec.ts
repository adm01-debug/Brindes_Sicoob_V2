import { test, expect, requireAuth } from "../fixtures/test-base";
import { loginAs } from "../helpers/auth";
import { gotoAndSettle } from "../helpers/nav";

test.describe("E2E — catálogo até novo orçamento", () => {
  test.beforeEach(() => requireAuth());

  test("usuário autenticado valida o catálogo e abre os controles reais do orçamento", async ({ page }) => {
    await loginAs(page);
    await gotoAndSettle(page, "/produtos");
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByTestId("page-title-produtos")).toBeVisible();

    const catalogState = page
      .getByTestId("product-card")
      .first()
      .or(page.getByText(/nenhum produto|catálogo vazio|não encontramos/i).first());
    await expect(catalogState).toBeVisible();

    await gotoAndSettle(page, "/orcamentos/novo");
    await expect(page).toHaveURL(/\/orcamentos\/novo/);
    await expect(page.getByTestId("page-title-orcamento-novo")).toHaveText(/Novo Orçamento/);
    await expect(page.getByText("Itens do Orçamento", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Produto/ }).first()).toBeEnabled();
    await expect(page.getByText("Resumo", { exact: true }).first()).toBeVisible();
  });
});
