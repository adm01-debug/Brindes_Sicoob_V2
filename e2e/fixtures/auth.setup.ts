/**
 * Auth setup — roda UMA vez antes dos projects autenticados.
 * Usa o helper SSOT `loginViaUI` (e2e/helpers/auth.ts) — sem seletores duplicados.
 */
import { test as setup, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loginAs, loginViaUI, logout } from '../helpers/auth';

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const STORAGE = path.resolve(CURRENT_DIR, '../.auth/storageState.json');
const ADMIN_STORAGE = path.resolve(CURRENT_DIR, '../.auth/adminStorageState.json');
const DEV_STORAGE = path.resolve(CURRENT_DIR, '../.auth/devStorageState.json');
const MANAGER_STORAGE = path.resolve(CURRENT_DIR, '../.auth/managerStorageState.json');

async function dismissOnboardingTour(page: Page): Promise<void> {
  const tour = page.getByTestId('onboarding-tour');
  const isVisible = await tour
    .waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true)
    .catch(() => false);

  if (!isVisible) return;

  const persisted = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      response.url().includes('/rest/v1/user_onboarding'),
    { timeout: 10_000 },
  );

  await tour.getByRole('button', { name: 'Pular', exact: true }).click();
  await tour.waitFor({ state: 'hidden', timeout: 5_000 });

  const response = await persisted;
  if (!response.ok()) {
    throw new Error(
      `Não foi possível persistir a conclusão do onboarding E2E (HTTP ${response.status()}).`,
    );
  }
}

function writeEmptyState(target: string, description: string): void {
  fs.writeFileSync(target, JSON.stringify({ cookies: [], origins: [] }, null, 2), 'utf-8');
  setup.info().annotations.push({ type: 'skip-reason', description });
}

setup('authenticate canonical role states', async ({ page }) => {
  setup.setTimeout(180_000);
  fs.mkdirSync(path.dirname(STORAGE), { recursive: true });

  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  if (!email || !password) {
    writeEmptyState(
      STORAGE,
      'E2E_USER_EMAIL/E2E_USER_PASSWORD ausentes — specs autenticados serão pulados.',
    );
  } else {
    await loginViaUI(page, { email, password });
    await dismissOnboardingTour(page);
    await page.context().storageState({ path: STORAGE });
  }

  const managerEmail = process.env.E2E_MANAGER_EMAIL;
  const managerPassword = process.env.E2E_MANAGER_PASSWORD;
  if (!managerEmail || !managerPassword) {
    writeEmptyState(
      MANAGER_STORAGE,
      'Credenciais E2E_MANAGER_* ausentes — specs do gestor serão pulados.',
    );
  } else {
    await logout(page);
    await loginViaUI(page, { email: managerEmail, password: managerPassword });
    await page.context().storageState({ path: MANAGER_STORAGE });
  }

  if (
    !process.env.E2E_ADMIN_EMAIL ||
    !process.env.E2E_ADMIN_PASSWORD ||
    !process.env.E2E_ADMIN_TOTP_SECRET
  ) {
    writeEmptyState(
      ADMIN_STORAGE,
      'Credenciais E2E_ADMIN_* ausentes — sessão AAL2 não será gerada.',
    );
  } else {
    fs.rmSync(ADMIN_STORAGE, { force: true });
    await loginAs(page, 'admin');
    await page.context().storageState({ path: ADMIN_STORAGE });
  }

  if (
    !process.env.E2E_DEV_EMAIL ||
    !process.env.E2E_DEV_PASSWORD ||
    !process.env.E2E_DEV_TOTP_SECRET
  ) {
    writeEmptyState(
      DEV_STORAGE,
      'Credenciais E2E_DEV_* ausentes — specs técnicos serão pulados.',
    );
  } else {
    fs.rmSync(DEV_STORAGE, { force: true });
    await loginAs(page, 'dev');
    await page.context().storageState({ path: DEV_STORAGE });
  }
});
