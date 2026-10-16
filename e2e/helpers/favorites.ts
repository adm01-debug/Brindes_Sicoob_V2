/**
 * Helpers para favoritos em testes E2E.
 *
 * `installFavoritesCleanup(test)` registra um `beforeEach` que captura o
 * snapshot inicial do `localStorage["product-favorites"]` e um `afterEach`
 * que restaura esse snapshot — mesmo se o teste falhar no meio do fluxo.
 *
 * Equivalente a um `try/finally` por teste, sem precisar envolver cada
 * assertion em try/catch.
 */
import type { Locator, Page, TestType } from '@playwright/test';
import { expect } from '@playwright/test';
import { Sel } from '../fixtures/selectors';

const STORAGE_KEY = 'product-favorites';

export interface FavoriteItem {
  productId: string;
  addedAt: string;
}

export async function readFavoritesStorage(page: Page): Promise<FavoriteItem[]> {
  return page.evaluate((key) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as FavoriteItem[]) : [];
    } catch {
      return [];
    }
  }, STORAGE_KEY);
}

export async function writeFavoritesStorage(page: Page, items: FavoriteItem[]): Promise<void> {
  await page.evaluate(
    ({ key, value }) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* noop */
      }
    },
    { key: STORAGE_KEY, value: items },
  );
}

async function storageContainsFavorite(page: Page, productId: string): Promise<boolean> {
  return (await readFavoritesStorage(page)).some((item) => item.productId === productId);
}

/**
 * Conclui a etapa opcional de variante ao favoritar.
 *
 * Produtos sem variantes são confirmados automaticamente pelo componente no
 * próximo frame. Produtos com variantes mantêm o botão "Sem cor específica"
 * visível. Aguarde um dos dois resultados para não disputar com o fechamento
 * automático do diálogo.
 */
export async function completeFavoriteVariantStep(page: Page, productId: string): Promise<void> {
  const noVariant = page.locator(Sel.variant.noVariant).first();

  await expect
    .poll(async () => {
      if (await storageContainsFavorite(page, productId)) return 'stored';
      if (await noVariant.isVisible().catch(() => false)) return 'picker';
      return 'pending';
    }, {
      message: 'favorito deveria ser concluído automaticamente ou pelo seletor de variante',
      timeout: 10_000,
    })
    .not.toBe('pending');

  if (
    !(await storageContainsFavorite(page, productId))
    && (await noVariant.isVisible().catch(() => false))
  ) {
    // Se o estoque vazio for resolvido entre isVisible e click, o diálogo pode
    // desmontar neste intervalo; o poll final diferencia esse caso de falha real.
    await noVariant.click().catch(() => {});
  }

  await expect
    .poll(() => storageContainsFavorite(page, productId), {
      message: 'localStorage deveria refletir a conclusão da etapa de variante',
      timeout: 10_000,
    })
    .toBe(true);
}

/**
 * Abre as ações rápidas do card e devolve o toggle de favorito acionável.
 * No desktop os botões expandidos existem no DOM, mas ficam sem eventos até
 * o usuário abrir o menu; clicar neles diretamente não representa a jornada.
 */
export async function openCatalogFavoriteAction(card: Locator): Promise<Locator> {
  await card.hover();
  const toggle = card.locator(Sel.product.actionsToggle).first();
  await expect(toggle).toBeVisible({ timeout: 10_000 });
  if ((await toggle.getAttribute('data-actions-open')) !== 'true') {
    await toggle.click();
  }
  await expect(toggle).toHaveAttribute('data-actions-open', 'true');

  const favorite = card.locator(Sel.product.favorite).first();
  await expect(favorite).toBeVisible({ timeout: 10_000 });
  return favorite;
}

/** Define o estado do favorito percorrendo também o seletor de variante. */
export async function setCatalogFavorite(
  page: Page,
  card: Locator,
  desired: boolean,
): Promise<Locator> {
  const favorite = await openCatalogFavoriteAction(card);
  const current = (await favorite.getAttribute('aria-pressed')) === 'true';
  if (current === desired) return favorite;

  const productId = await card.getAttribute('data-product-id');
  if (!productId) throw new Error('Card do catálogo sem data-product-id');

  await favorite.click();
  if (desired) await completeFavoriteVariantStep(page, productId);

  await expect
    .poll(
      () =>
        page.evaluate(
          ({ key, id }) => {
            try {
              const parsed = JSON.parse(localStorage.getItem(key) ?? '[]') as FavoriteItem[];
              return parsed.some((item) => item.productId === id);
            } catch {
              return false;
            }
          },
          { key: STORAGE_KEY, id: productId },
        ),
      { message: 'localStorage não refletiu o favorito', timeout: 10_000 },
    )
    .toBe(desired);

  await expect
    .poll(() => card.locator(Sel.product.favorite).first().getAttribute('aria-pressed'), {
      timeout: 10_000,
    })
    .toBe(String(desired));
  return card.locator(Sel.product.favorite).first();
}

/**
 * Registra cleanup automático do storage de favoritos por teste.
 *
 * Uso:
 *   import { test } from "../fixtures/test-base";
 *   import { installFavoritesCleanup } from "../helpers/favorites";
 *
 *   test.describe("...", () => {
 *     installFavoritesCleanup(test);
 *     test("...", async ({ page }) => { ... });
 *   });
 *
 * Estratégia:
 *   - beforeEach: navega para a origin do app (necessário para acessar
 *     localStorage) e tira snapshot do estado atual.
 *   - afterEach: restaura o snapshot, garantindo que mesmo falhas em
 *     asserções deixem o storage idêntico ao estado inicial. Falhas no
 *     próprio cleanup são engolidas (best-effort) para não mascarar a
 *     causa real do erro do teste.
 */
export function installFavoritesCleanup(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  testInstance: TestType<any, any>,
  opts: { warmupPath?: string } = {},
): void {
  const warmupPath = opts.warmupPath ?? '/produtos';
  const snapshots = new WeakMap<Page, FavoriteItem[]>();

  testInstance.beforeEach(async ({ page }) => {
    try {
      // Precisa estar na origin para localStorage estar acessível
      if (!/^https?:/.test(page.url())) {
        await page.goto(warmupPath, { waitUntil: 'domcontentloaded' }).catch(() => {});
      }
      const snap = await readFavoritesStorage(page).catch(() => [] as FavoriteItem[]);
      snapshots.set(page, snap);
    } catch {
      snapshots.set(page, []);
    }
  });

  testInstance.afterEach(async ({ page }) => {
    const snap = snapshots.get(page);
    if (!snap) return;
    try {
      // Garante que estamos na origin para conseguir escrever no storage
      if (!/^https?:/.test(page.url())) {
        await page.goto(warmupPath, { waitUntil: 'domcontentloaded' }).catch(() => {});
      }
      await writeFavoritesStorage(page, snap).catch(() => {});
    } catch {
      /* failsafe: nunca lança no cleanup para não mascarar a falha do teste */
    }
  });
}

/**
 * Reload + espera SSOT baseada em SELETOR (sem `networkidle`, sem sleeps).
 *
 * Sinais aguardados (todos via locator/expect):
 *   1. `Sel.favorites.title` visível         → página /favoritos hidratada
 *   2. `Sel.favorites.list` OU `Sel.favorites.emptyState` visível
 *      → árvore renderizada (lista populada ou empty-state explícito)
 *   3. `Sel.favorites.countItems` exibe `expectedCount`
 *      → estado reidratado (storage/remote sincronizado com a UI)
 *
 * Vantagens vs. `waitForLoadState("networkidle")`:
 *   - Imune a polling/keepalive/realtime que mantêm a rede "ativa"
 *   - Falha rápido com mensagem útil quando a UI não reidrata
 */
export async function reloadAndAwaitFavoritesPage(
  page: Page,
  expectedCount: number,
): Promise<void> {
  await page.reload({ waitUntil: 'load' });

  await page.locator(Sel.favorites.title).first().waitFor({ state: 'visible', timeout: 10_000 });

  const list = page.locator(Sel.favorites.list).first();
  const empty = page.locator(Sel.favorites.emptyState).first();
  await expect
    .poll(
      async () =>
        ((await list.count()) > 0 && (await list.isVisible())) ||
        ((await empty.count()) > 0 && (await empty.isVisible())),
      {
        message: 'favorites-list ou favorites-empty-state deveriam estar visíveis pós-reload',
        timeout: 10_000,
      },
    )
    .toBe(true);

  const countLoc = page.locator(Sel.favorites.countItems).first();
  await countLoc.waitFor({ state: 'visible', timeout: 10_000 });
  await expect
    .poll(async () => Number.parseInt((await countLoc.innerText()).trim(), 10) || 0, {
      message: `header favorites-count-items deveria reidratar para ${expectedCount}`,
      timeout: 10_000,
    })
    .toBe(expectedCount);
}
