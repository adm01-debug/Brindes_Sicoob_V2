/**
 * Fluxo: Favoritar em /produtos reflete em /favoritos via NAVEGAÇÃO (sem reload completo)
 *
 * Diferente do spec 08 (que valida persistência via page.reload()), aqui validamos
 * a propagação REATIVA do estado entre rotas:
 *
 *  1. Snapshot inicial em /favoritos (header + storage)
 *  2. Vai para /produtos, favorita o 1º card
 *  3. Navega para /favoritos via LINK do app (sidebar/header) — SEM page.reload()
 *  4. Header reflete countBefore + 1 imediatamente
 *  5. O card do produto recém-favoritado aparece (data-product-id e nome)
 *  6. Cleanup: desfavorita pela lista e restaura snapshot do storage
 *
 * Importante: o teste FALHA se a única forma de o item aparecer for via reload —
 * ele garante hidratação reativa do hook `useFavorites`.
 */
import { test, expect, requireAuth } from "../fixtures/test-base";
import { gotoAndSettle, settleAfterAction } from "../helpers/nav";
import { installFavoritesCleanup, setCatalogFavorite } from "../helpers/favorites";
import { Sel } from "../fixtures/selectors";
import type { Page } from "@playwright/test";

const STORAGE_KEY = "product-favorites";

interface FavoriteItem {
  productId: string;
  addedAt: string;
}

async function readStorage(page: Page): Promise<FavoriteItem[]> {
  return page.evaluate((key) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as FavoriteItem[]) : [];
    } catch {
      return [];
    }
  }, STORAGE_KEY);
}

async function writeStorage(page: Page, items: FavoriteItem[]): Promise<void> {
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: STORAGE_KEY, value: items },
  );
}

async function readFavoritesCount(page: Page): Promise<number> {
  const loc = page.locator(Sel.favorites.countItems);
  await loc.first().waitFor({ state: "visible", timeout: 10_000 });
  const txt = (await loc.first().innerText()).trim();
  return Number.parseInt(txt, 10) || 0;
}

/**
 * Navega via LINK in-app (sem reload). Tenta sidebar primeiro, depois qualquer
 * <a href="/favoritos"> visível, e por fim history.pushState como último recurso.
 * Falha o teste se nenhuma navegação SPA acontecer.
 */
async function navigateToFavoritesInApp(page: Page): Promise<void> {
  // O link vive em um grupo recolhível; expande o grupo quando necessário.
  const sidebar = page.locator(Sel.sidebar.link("favoritos")).first();
  if (!(await sidebar.isVisible().catch(() => false))) {
    const catalogGroup = page.getByRole("button", { name: /grupo Catálogo/ }).first();
    await expect(catalogGroup).toBeVisible();
    await catalogGroup.click();
  }
  await expect(sidebar).toBeVisible();
  await sidebar.click();

  await page.waitForURL(/\/favoritos(\?|#|$)/, { timeout: 10_000 });
  await settleAfterAction(page);
}

test.describe("Fluxo: favoritar reflete via navegação (sem reload)", () => {
  test.beforeEach(() => requireAuth());
  installFavoritesCleanup(test);

  test("favoritar em /produtos aparece imediatamente em /favoritos via link (sem reload)", async ({
    page,
  }) => {
    // 0. Snapshot inicial em /favoritos
    await gotoAndSettle(page, "/favoritos");
    await expect(page.locator(Sel.favorites.title)).toHaveText("Meus Produtos Favoritos");
    const original = await readStorage(page);
    const countBefore = await readFavoritesCount(page);

    // 1. Catálogo + 1º card
    await gotoAndSettle(page, "/produtos");
    const card = page.locator(Sel.product.card).first();
    await card.waitFor({ state: "visible", timeout: 15_000 });

    // Captura o productId do card (data-product-id presente em ProductCard)
    const productId = await card
      .evaluate((el) => {
        const node = (el as HTMLElement).matches("[data-product-id]")
          ? (el as HTMLElement)
          : (el.querySelector("[data-product-id]") as HTMLElement | null);
        return node?.getAttribute("data-product-id") ?? "";
      })
      .catch(() => "");
    expect(productId, "data-product-id do 1º card não pôde ser lido").toBeTruthy();

    // Garante estado inicial = NÃO favoritado
    await setCatalogFavorite(page, card, false);

    // 2. Marcador de "no-reload": injeta sentinel no window. Se a página recarregar,
    //    o sentinel some e o teste falha — assim provamos navegação SPA.
    await page.evaluate(() => {
      (window as unknown as { __noReloadSentinel?: number }).__noReloadSentinel = Date.now();
    });

    // 3. Favorita
    await setCatalogFavorite(page, card, true);

    // Storage refletiu
    await expect
      .poll(async () => (await readStorage(page)).length, { timeout: 8_000 })
      .toBe(original.length + 1);

    // 4. Navega para /favoritos via LINK (SPA). Sem page.goto / page.reload.
    await navigateToFavoritesInApp(page);

    // Sentinel deve continuar vivo — provando que NÃO houve reload completo
    const sentinelAlive = await page.evaluate(() => {
      return typeof (window as unknown as { __noReloadSentinel?: number })
        .__noReloadSentinel === "number";
    });
    expect(
      sentinelAlive,
      "sentinel sumiu — a navegação para /favoritos causou reload completo (esperado: SPA)",
    ).toBe(true);

    // 5. Header reflete +1 imediatamente
    await expect
      .poll(() => readFavoritesCount(page), {
        message: "contagem do header não reagiu à navegação SPA",
        timeout: 10_000,
      })
      .toBe(countBefore + 1);

    // 6. Card do produto recém-favoritado aparece na lista
    const targetCard = page.locator(`[data-product-id="${productId}"]`).first();
    await expect(
      targetCard,
      `card do produto ${productId} deveria estar visível em /favoritos`,
    ).toBeVisible({ timeout: 10_000 });

    // E pelo menos um botão de remover favorito está renderizado
    await expect(page.locator(Sel.favorites.remove).first()).toBeVisible({
      timeout: 10_000,
    });

    // 7. Cleanup — desfavorita pela lista (sem reload), restaura storage
    const removeBtn = targetCard.locator(Sel.favorites.remove).first();
    if (await removeBtn.isVisible().catch(() => false)) {
      await removeBtn.click().catch(() => {});
      const confirm = page.locator(Sel.dialog.confirmYes).first();
      if (await confirm.isVisible().catch(() => false)) {
        await confirm.click().catch(() => {});
      }
      await settleAfterAction(page);
    }

    // Restauração defensiva
    await writeStorage(page, original);
    await expect
      .poll(async () => (await readStorage(page)).length, { timeout: 8_000 })
      .toBe(original.length);
  });
});
