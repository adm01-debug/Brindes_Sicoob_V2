/**
 * Helpers SSOT de autenticação para a suíte E2E.
 *
 * Política:
 *  - **Todo login UI** deve passar por `loginViaUI` ou `loginAs` — nunca usar
 *    `page.fill('#login-…')` ou `input[type=email]` em specs.
 *  - `loginAs` reaproveita `storageState` global gerado pelo `auth.setup`,
 *    apenas refazendo UI se a sessão não estiver presente.
 *  - Seletores vêm exclusivamente do SSOT `e2e/fixtures/selectors.ts`.
 *  - Asserts via `expect(page).toHaveURL(...)` (auto-retry do Playwright) —
 *    evita `waitForTimeout`.
 *
 * Uso típico:
 *   import { loginAs, loginViaUI, expectAuthenticated } from "../helpers/auth";
 *   await loginAs(page);                          // user comum
 *   await loginAs(page, "admin");                 // admin
 *   await loginViaUI(page, { email, password, expectFail: true });
 */
import { expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as OTPAuth from 'otpauth';

import { Sel } from '../fixtures/selectors';
import { test } from '../fixtures/test-base';
import { gotoAndSettle, waitForRouteIdle } from './nav';
import { clickTestId } from './waits';

export interface LoginCreds {
  email: string;
  password: string;
  /** Quando true, espera permanecer em /login (validação/erro). */
  expectFail?: boolean;
  /** Timeout customizado para o redirect pós-login. */
  timeoutMs?: number;
  /** Aguarda a resolução de permissões; desative até concluir um desafio MFA. */
  waitForPermissions?: boolean;
}

export type Role = 'user' | 'admin' | 'dev' | 'editor';

const LOGIN_URL_RE = /\/login(\?|#|$)/;
const AUTH_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.auth');
const TOTP_PERIOD_MS = 30_000;
const lastTotpCodeByRole = new Map<'admin' | 'dev', string>();

async function generateFreshTotp(role: 'admin' | 'dev', totp: OTPAuth.TOTP): Promise<string> {
  let code = totp.generate();
  if (lastTotpCodeByRole.get(role) === code) {
    const waitMs = TOTP_PERIOD_MS - (Date.now() % TOTP_PERIOD_MS) + 750;
    await new Promise<void>((resolve) => globalThis.setTimeout(resolve, waitMs));
    code = totp.generate();
  }
  lastTotpCodeByRole.set(role, code);
  return code;
}

async function ensurePrivilegedAal2(page: Page, role: 'admin' | 'dev'): Promise<void> {
  await gotoAndSettle(page, role === 'dev' ? '/admin/telemetria' : '/admin/usuarios', {
    waitForPermissions: false,
  });
  const enrollment = page.getByRole('dialog', { name: 'Autenticação em duas etapas' });
  const challenge = page.getByRole('dialog', { name: 'Verificação em duas etapas' });
  let outcome = 'waiting';
  await expect
    .poll(
      async () => {
        if (await enrollment.isVisible().catch(() => false)) outcome = 'enrollment';
        else if (await challenge.isVisible().catch(() => false)) outcome = 'challenge';
        else if ((await page.locator('main h1, main h2').count()) > 0) outcome = 'ready';
        return outcome;
      },
      { timeout: 10_000, message: 'aguardando gate MFA ou conteúdo administrativo' },
    )
    .not.toBe('waiting');

  if (outcome === 'ready') return;
  if (outcome === 'enrollment') {
    throw new Error('A conta E2E administrativa não possui um fator TOTP verificado.');
  }

  const secret =
    role === 'dev' ? process.env.E2E_DEV_TOTP_SECRET : process.env.E2E_ADMIN_TOTP_SECRET;
  if (!secret) {
    throw new Error(`E2E_${role.toUpperCase()}_TOTP_SECRET ausente para elevar a sessão a AAL2.`);
  }
  const totp = new OTPAuth.TOTP({
    issuer: 'Supabase',
    label:
      (role === 'dev' ? process.env.E2E_DEV_EMAIL : process.env.E2E_ADMIN_EMAIL) ?? `${role}-e2e`,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
  const input = challenge.getByLabel('Código de autenticação em duas etapas');
  const submit = challenge.getByRole('button', { name: 'Verificar', exact: true });
  let verified = false;
  for (let attempt = 0; attempt < 2 && !verified; attempt += 1) {
    await input.fill(await generateFreshTotp(role, totp));
    await expect(submit).toBeEnabled({ timeout: 10_000 });
    // O diálogo recria o botão ao validar os seis dígitos. Um click com
    // actionability pode se prender ao nó antigo e tentar novamente no botão
    // novo já desabilitado; o click DOM resolve o locator atual uma única vez.
    await submit.evaluate((button: HTMLButtonElement) => button.click());
    verified = await challenge
      .waitFor({ state: 'hidden', timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
  }
  expect(verified, 'esperado elevar a sessão administrativa para AAL2').toBe(true);
  await expect(page.locator('main h1, main h2').first()).toBeVisible({ timeout: 10_000 });
}

async function getStoredSessionEmail(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    for (const key of Object.keys(localStorage)) {
      if (!/sb-.*-auth-token/.test(key)) continue;
      try {
        const session = JSON.parse(localStorage.getItem(key) ?? '{}');
        const email = session?.user?.email ?? session?.currentSession?.user?.email;
        if (typeof email === 'string') return email;
      } catch {
        // Ignora entradas de storage que não representam uma sessão Supabase.
      }
    }
    return null;
  });
}

interface StoredBrowserState {
  origins?: Array<{
    origin: string;
    localStorage: Array<{ name: string; value: string }>;
  }>;
}

function roleStoragePath(role: Role): string {
  const filenames: Record<Role, string> = {
    user: 'storageState.json',
    admin: 'adminStorageState.json',
    dev: 'devStorageState.json',
    editor: 'managerStorageState.json',
  };
  return path.join(AUTH_DIR, filenames[role]);
}

async function restoreRoleStorage(page: Page, role: Role, email: string): Promise<boolean> {
  const storagePath = roleStoragePath(role);
  if (!fs.existsSync(storagePath)) return false;

  let state: StoredBrowserState;
  try {
    state = JSON.parse(fs.readFileSync(storagePath, 'utf-8')) as StoredBrowserState;
  } catch {
    return false;
  }

  const currentOrigin = new URL(page.url()).origin;
  const originState = state.origins?.find(({ origin }) => origin === currentOrigin);
  if (!originState?.localStorage.length) return false;

  await page.context().clearCookies();
  await page.evaluate((entries) => {
    localStorage.clear();
    sessionStorage.clear();
    for (const { name, value } of entries) localStorage.setItem(name, value);
  }, originState.localStorage);
  await page.reload({ waitUntil: 'domcontentloaded' });
  let restoredEmail: string | null = null;
  await expect
    .poll(
      async () => {
        restoredEmail = await getStoredSessionEmail(page).catch(() => null);
        return restoredEmail?.toLowerCase();
      },
      { timeout: 10_000, message: `aguardando restauração da sessão ${role}` },
    )
    .toBe(email.toLowerCase());
  // A sessão já está no storage, mas o guard público ainda precisa concluir
  // o redirecionamento de /login. Sem esta barreira, a próxima page.goto pode
  // ser abortada pela navegação concorrente do React Router.
  await expect(page, `esperado ativar a sessão ${role}`).not.toHaveURL(LOGIN_URL_RE, {
    timeout: 10_000,
  });
  await waitForRouteIdle(page, {
    waitForPermissions: role !== 'admin' && role !== 'dev',
  });
  return true;
}

/**
 * Executa o fluxo de login via UI usando seletores SSOT.
 * Retorna `true` se autenticado, `false` se ficou na tela de login (esperado em
 * `expectFail: true`).
 */
export async function loginViaUI(page: Page, creds: LoginCreds): Promise<boolean> {
  const timeout = creds.timeoutMs ?? 20_000;
  // Se o guard já enviou a SPA para /login, preserve o location.state.from.
  // Navegar novamente para a mesma URL apagaria o destino do deep link.
  if (!LOGIN_URL_RE.test(page.url())) await gotoAndSettle(page, '/login');

  const emailLoc = page.locator(Sel.login.email).first();
  const passLoc = page.locator(Sel.login.password).first();
  await emailLoc.waitFor({ state: 'visible', timeout: 10_000 });
  await emailLoc.fill(creds.email);
  await passLoc.fill(creds.password);

  await clickTestId(page, 'login-submit');

  if (creds.expectFail) {
    // Continua em /login OU mostra mensagem de erro — auto-retry expect.
    await expect(page, 'esperado falhar e permanecer em /login').toHaveURL(LOGIN_URL_RE, {
      timeout: 8_000,
    });
    return false;
  }

  await expect(page, 'esperado redirect para fora de /login').not.toHaveURL(LOGIN_URL_RE, {
    timeout,
  });
  // O carregamento de permissões pode consumir a maior parte da janela do
  // redirect em runners frios. Preserve o mesmo orçamento do login para não
  // transformar uma sessão válida em flake de 10 segundos.
  await waitForRouteIdle(page, {
    timeout,
    waitForPermissions: creds.waitForPermissions,
  });
  return true;
}

/**
 * Faz login com a credencial do papel solicitado, reaproveitando o
 * `storageState` quando já existe sessão. Marca o teste como `skip` se as
 * variáveis de ambiente não estiverem configuradas.
 */
export async function loginAs(page: Page, role: Role = 'user'): Promise<void> {
  const email =
    role === 'dev'
      ? process.env.E2E_DEV_EMAIL
      : role === 'admin'
        ? process.env.E2E_ADMIN_EMAIL
        : role === 'editor'
          ? process.env.E2E_MANAGER_EMAIL || process.env.E2E_ADMIN_EMAIL
          : process.env.E2E_VIEWER_EMAIL || process.env.E2E_USER_EMAIL;
  const password =
    role === 'dev'
      ? process.env.E2E_DEV_PASSWORD
      : role === 'admin'
        ? process.env.E2E_ADMIN_PASSWORD
        : role === 'editor'
          ? process.env.E2E_MANAGER_PASSWORD || process.env.E2E_ADMIN_PASSWORD
          : process.env.E2E_VIEWER_PASSWORD || process.env.E2E_USER_PASSWORD;

  if (!email || !password) {
    test.skip(true, `Credenciais E2E_${role.toUpperCase()}_EMAIL/PASSWORD ausentes`);
  }

  // Reaproveita a sessão somente quando ela pertence exatamente à conta
  // solicitada. Isso impede que uma matriz multi-papel valide todos os casos
  // com o usuário carregado pelo storageState global.
  // Esta navegação serve apenas para disponibilizar o localStorage da origin.
  // Aguardar o conteúdo completo aqui duplicava o settle feito pelo próprio
  // cenário e transformava componentes secundários lentos em falha de login.
  if (!/^https?:/i.test(page.url())) {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 20_000 });
  }
  const currentEmail = await getStoredSessionEmail(page);
  if (currentEmail?.toLowerCase() === email!.toLowerCase() && !LOGIN_URL_RE.test(page.url())) {
    if (role === 'admin' || role === 'dev') await ensurePrivilegedAal2(page, role);
    return;
  }

  if (currentEmail || !LOGIN_URL_RE.test(page.url())) await logout(page);

  if (await restoreRoleStorage(page, role, email!)) {
    if (role === 'admin' || role === 'dev') await ensurePrivilegedAal2(page, role);
    return;
  }

  await loginViaUI(page, {
    email: email!,
    password: password!,
    waitForPermissions: role !== 'admin' && role !== 'dev',
  });
  if (role === 'admin' || role === 'dev') await ensurePrivilegedAal2(page, role);
}

/**
 * Encerra a sessão atual via UI (best-effort). Se não houver controle de
 * usuário visível, faz fallback removendo o storage manualmente.
 */
export async function logout(page: Page): Promise<void> {
  if (!/^https?:/i.test(page.url())) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
  }
  await page
    .context()
    .clearCookies()
    .catch(() => {});
  await page
    .evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {
        /* noop */
      }
    })
    .catch(() => {});
  await gotoAndSettle(page, '/login');
  await expect(page).toHaveURL(LOGIN_URL_RE, { timeout: 8_000 });
}

/** Asserts reutilizáveis. */
export async function expectAuthenticated(page: Page): Promise<void> {
  await expect(page, 'deveria estar autenticado').not.toHaveURL(LOGIN_URL_RE, {
    timeout: 5_000,
  });
}

export async function expectUnauthenticated(page: Page): Promise<void> {
  await expect(page, 'deveria estar deslogado / em /login').toHaveURL(LOGIN_URL_RE, {
    timeout: 5_000,
  });
}
