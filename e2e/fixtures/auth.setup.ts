/**
 * Auth setup — roda UMA vez antes dos projects autenticados.
 * Usa o helper SSOT `loginViaUI` (e2e/helpers/auth.ts) — sem seletores duplicados.
 */
import { test as setup } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loginViaUI } from "../helpers/auth";

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const STORAGE = path.resolve(CURRENT_DIR, "../.auth/storageState.json");

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
  await page.context().storageState({ path: STORAGE });
});
