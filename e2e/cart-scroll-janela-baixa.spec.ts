/**
 * Fluxo: o painel do carrinho precisa continuar utilizável em janelas baixas.
 *
 * O popover acumula cabeçalho, lista de orçamentos e rodapé (saldo da verba,
 * subtotal e "Gerar Orçamento"). Antes do ajuste o `ScrollArea` limitava a
 * altura só no Root, que tem `overflow-hidden`: a lista era cortada em vez de
 * rolar e o rodapé saía da tela.
 *
 * jsdom não calcula layout, então `tests/components/cart/cart-header-scroll.test.tsx`
 * só prova a estrutura. Aqui, em Chromium, medimos o que importa:
 *  - a lista rola de fato (`scrollHeight > clientHeight`);
 *  - o saldo da verba e o CTA ficam inteiros dentro da janela;
 *  - rolar até o último orçamento não empurra o CTA para fora.
 *
 * Roda no project `chromium-public`: a sessão é sintética (JWT local expirado
 * nunca, REST todo mockado), então o cenário não depende das contas E2E nem
 * das secrets do projeto de QA.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { test, expect } from '@playwright/test';
import { Sel } from './fixtures/selectors';
import { gotoAndSettle } from './helpers/nav';
import type { Page, Route } from '@playwright/test';

/**
 * Mesma precedência do `webServer` (`playwright.config.ts`): o `.env.production`
 * local (quando existe) vence o env do processo, que no CI é
 * `https://e2e-public.invalid`. O `supabase-js` guarda a sessão em
 * `sb-<ref>-auth-token`, então o ref precisa acompanhar o servidor em uso —
 * fixá-lo em `fake-project` deixava a jornada sem sessão no pipeline.
 */
function supabaseUrl(): string {
  try {
    const file = readFileSync(resolve(process.cwd(), '.env.production'), 'utf8');
    const line = file.split(/\r?\n/).find((candidate) => candidate.trim().startsWith('VITE_SUPABASE_URL='));
    if (line) return line.slice(line.indexOf('=') + 1).trim().replace(/^["']/, '').replace(/["']$/, '');
  } catch {
    // Sem `.env.production` (CI): o servidor usa o env do processo.
  }
  return process.env.VITE_SUPABASE_URL?.trim() || 'https://e2e-public.invalid';
}

const PROJECT_REF = new URL(supabaseUrl()).hostname.split('.')[0];
const USER_ID = 'e2e-cart-scroll-user';
const PA_ID = 'e2e-cart-scroll-pa';

/** Contas de uma sessão Supabase válida do ponto de vista do cliente. */
function fakeSession() {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: USER_ID,
    email: 'e2e-cart-scroll@example.test',
    role: 'authenticated',
    aud: 'authenticated',
    iat: now,
    exp: now + 7200,
    user_metadata: { full_name: 'Vendedor E2E' },
  };
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const accessToken = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.assinatura-e2e`;
  return {
    access_token: accessToken,
    token_type: 'bearer',
    expires_in: 7200,
    expires_at: now + 7200,
    refresh_token: 'refresh-e2e',
    user: {
      id: USER_ID,
      email: payload.email,
      role: 'authenticated',
      aud: 'authenticated',
      user_metadata: payload.user_metadata,
      app_metadata: { provider: 'email' },
      created_at: new Date(now * 1000).toISOString(),
    },
  };
}

/**
 * Injeta a sessão antes do primeiro script da página. `supabase-js` lê
 * `sb-<ref>-auth-token` do localStorage e considera a sessão válida enquanto
 * o `exp` não passa — nenhum token real é necessário porque a rede é mockada.
 */
async function installFakeSession(page: Page) {
  const session = JSON.stringify(fakeSession());
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key, value);
    },
    [`sb-${PROJECT_REF}-auth-token`, session],
  );
}

const LONG_LIST_LENGTH = 3; // limite do banco por vendedor
const ACTIVE_CART_ITEMS = 5; // prévia mostra no máximo 5 itens

function makeCart(index: number) {
  return {
    id: `e2e-cart-${index}`,
    seller_id: USER_ID,
    company_id: `e2e-company-${index}`,
    company_name: `Cooperativa ${index}`,
    company_location: 'Cuiabá/MT',
    company_logo_url: null,
    notes: null,
    status: 'novo',
    created_at: '2026-11-23T10:00:00Z',
    updated_at: '2026-11-23T10:00:00Z',
  };
}

function makeItem(cartIndex: number, itemIndex: number) {
  return {
    id: `e2e-item-${cartIndex}-${itemIndex}`,
    cart_id: `e2e-cart-${cartIndex}`,
    product_id: `e2e-product-${cartIndex}-${itemIndex}`,
    product_name: `Produto ${cartIndex}.${itemIndex}`,
    product_sku: `SKU-${cartIndex}-${itemIndex}`,
    product_image_url: null,
    product_price: 10 + itemIndex,
    quantity: 1,
    color_name: null,
    color_hex: null,
    notes: null,
    sort_order: itemIndex,
  };
}

/**
 * `PostgREST` devolve um objeto (não uma lista) quando o cliente pede
 * `.single()`/`.maybeSingle()` — o pedido vem no header Accept. Entregar lista
 * aí faz o `postgrest-js` não desembrulhar o registro e o perfil fica nulo.
 */
function wantsSingleRow(route: Route) {
  const accept = route.request().headers()['accept'] ?? '';
  return accept.includes('application/vnd.pgrst.object+json');
}

function json(route: Route, body: unknown[]) {
  const single = wantsSingleRow(route);
  const payload = single && body.length === 1 ? body[0] : body;
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'content-range': `0-${body.length - 1}/${body.length}` },
    body: JSON.stringify(payload),
  });
}

/**
 * Um único ponto de mock para REST/Edge/Auth. O catálogo e os widgets do
 * header pedem dezenas de recursos; devolver lista vazia para o que não é
 * relevante mantém o cenário focado no painel do carrinho.
 */
async function mockBackend(page: Page) {
  const carts = Array.from({ length: LONG_LIST_LENGTH }, (_, index) => makeCart(index));
  const items = Array.from({ length: ACTIVE_CART_ITEMS }, (_, index) => makeItem(0, index));

  await page.route('**/auth/v1/**', (route) => {
    const url = route.request().url();
    if (url.includes('/auth/v1/user')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fakeSession().user),
      });
    }
    if (url.includes('/auth/v1/logout')) return route.fulfill({ status: 204, body: '' });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fakeSession()) });
  });

  await page.route('**/functions/v1/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], count: 0 }) }),
  );

  await page.route('**/rest/v1/**', (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    // O RPC que libera o acesso é POST: precisa responder antes do corte de
    // escrita, senão o AuthContext encerra a sessão por "missing_access_state".
    if (path.includes('/rest/v1/rpc/get_sicoob_access_state')) {
      return json(route, [{ active: true, reason: 'active' }]);
    }
    if (route.request().method() !== 'GET') {
      return route.fulfill({ status: 204, body: '' });
    }
    if (path.endsWith('/rest/v1/user_roles')) return json(route, [{ role: 'vendedor' }]);
    if (path.endsWith('/rest/v1/profiles')) {
      return json(route, [{
        id: 'e2e-profile',
        user_id: USER_ID,
        full_name: 'Vendedor E2E',
        email: 'e2e-cart-scroll@example.test',
        role: 'vendedor',
        pa_id: PA_ID,
      }]);
    }
    if (path.endsWith('/rest/v1/pa_budgets')) {
      return json(route, [{
        id: 'e2e-budget',
        pa_id: PA_ID,
        ano: new Date().getFullYear(),
        mes: new Date().getMonth() + 1,
        verba_total: 5000,
        verba_planejada: 5000,
        verba_consumida: 1000,
        verba_reservada: 0,
        verba_comprometida: 0,
      }]);
    }
    if (path.endsWith('/rest/v1/seller_carts')) return json(route, carts);
    if (path.endsWith('/rest/v1/seller_cart_items')) return json(route, items);

    return json(route, []);
  });
}

test.describe('Carrinho em janela baixa', () => {
  test('mantém a verba e o CTA visíveis enquanto a lista rola', async ({ page }) => {
    test.setTimeout(90_000);
    // 520px = janela baixa de notebook, onde o teto de altura do painel morde.
    await page.setViewportSize({ width: 1024, height: 520 });
    await installFakeSession(page);
    await mockBackend(page);

    await gotoAndSettle(page, '/');

    const trigger = page.locator(Sel.cart.trigger);
    await expect(trigger).toBeVisible({ timeout: 30_000 });
    await trigger.click();

    const drawer = page.locator(Sel.cart.drawer);
    await expect(drawer).toBeVisible();

    // O rodapé traz o saldo da verba e o CTA: ambos precisam caber inteiros.
    await expect(page.getByTestId('cart-pa-budget-balance')).toBeVisible();
    const cta = page.locator(Sel.cart.checkoutCta);
    await expect(cta).toBeInViewport({ ratio: 1 });

    // A lista completa foi renderizada…
    await expect(drawer.locator(Sel.cart.tab)).toHaveCount(LONG_LIST_LENGTH);

    // …e rola de verdade dentro do painel, em vez de ser cortada pelo Root.
    const viewport = drawer.locator(Sel.ext.radixScrollViewport).first();
    await expect(viewport).toBeVisible();
    const metrics = await viewport.evaluate((el) => ({
      clientHeight: el.clientHeight,
      scrollHeight: el.scrollHeight,
      overflowY: getComputedStyle(el).overflowY,
    }));
    expect(metrics.overflowY).toMatch(/auto|scroll/);
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);

    // Rolar até o último orçamento não pode empurrar o CTA para fora.
    await viewport.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    // A rolagem de fato chegou ao fim: sem isso, um teto de altura errado
    // deixaria o último orçamento inalcançável.
    const scrolled = await viewport.evaluate((el) => ({
      top: el.scrollTop,
      max: el.scrollHeight - el.clientHeight,
    }));
    expect(scrolled.max).toBeGreaterThan(0);
    expect(scrolled.top).toBeGreaterThan(scrolled.max - 2);

    await expect(drawer.locator(Sel.cart.tab).last()).toBeInViewport();
    await expect(page.getByTestId('cart-pa-budget-balance')).toBeInViewport({ ratio: 1 });
    await expect(cta).toBeInViewport({ ratio: 1 });

    // O painel inteiro cabe na janela — era ele que sumia por baixo da dobra.
    const viewportHeight = page.viewportSize()!.height;
    const drawerBox = await drawer.boundingBox();
    const ctaBox = await cta.boundingBox();
    expect(drawerBox).not.toBeNull();
    expect(ctaBox).not.toBeNull();
    expect(drawerBox!.y).toBeGreaterThanOrEqual(0);
    expect(drawerBox!.y + drawerBox!.height).toBeLessThanOrEqual(viewportHeight + 1);
    expect(ctaBox!.y).toBeGreaterThan(0);
    expect(ctaBox!.y + ctaBox!.height).toBeLessThanOrEqual(viewportHeight);
  });
});
