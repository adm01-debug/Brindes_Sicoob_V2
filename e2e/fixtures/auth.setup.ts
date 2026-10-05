/**
 * Auth setup — roda UMA vez antes dos projects autenticados.
 * Usa o helper SSOT `loginViaUI` (e2e/helpers/auth.ts) — sem seletores duplicados.
 */
import { test as setup, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loginViaUI } from "../helpers/auth";

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const STORAGE = path.resolve(CURRENT_DIR, "../.auth/storageState.json");

async function dismissOnboardingTour(page: Page): Promise<void> {
  const tour = page.getByTestId("onboarding-tour");
  const isVisible = await tour
    .waitFor({ state: "visible", timeout: 5_000 })
    .then(() => true)
    .catch(() => false);

  if (!isVisible) return;

  const persisted = page.waitForResponse(
    (response) =>
      response.request().method() === "PATCH" &&
      response.url().includes("/rest/v1/user_onboarding"),
    { timeout: 10_000 },
  );

  await tour.getByRole("button", { name: "Pular", exact: true }).click();
  await tour.waitFor({ state: "hidden", timeout: 5_000 });

  const response = await persisted;
  if (!response.ok()) {
    throw new Error(
      `Não foi possível persistir a conclusão do onboarding E2E (HTTP ${response.status()}).`,
    );
  }
}

setup("authenticate", async ({ page }) => {
  fs.mkdirSync(path.dirname(STORAGE), { recursive: true });

  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  if (!email || !password) {
    fs.writeFileSync(
      STORAGE,
      JSON.stringify({ cookies: [], origins: [] }, null, 2),
      "utf-8",
    );
    setup.info().annotations.push({
      type: "skip-reason",
      description:
        "E2E_USER_EMAIL/E2E_USER_PASSWORD ausentes — specs autenticados serão pulados.",
    });
    return;
  }

  await loginViaUI(page, { email, password });
  await dismissOnboardingTour(page);
  await page.context().storageState({ path: STORAGE });
});
