// apps/web/e2e/helpers/auth.helper.ts
import type { Page } from "@playwright/test";

import { requireE2eCredentials } from "./credentials.helper";

export async function loginAsE2eUser(page: Page): Promise<void> {
  const { username, password } = requireE2eCredentials();

  await page.goto("/collections");

  // Auth0 Universal Login (Classic / New): wait for identifier field
  const userField = page
    .locator(
      'input#username, input[name="username"], input[name="email"], input#email',
    )
    .first();
  await userField.waitFor({ state: "visible", timeout: 60_000 });
  await userField.fill(username);

  const passwordField = page
    .locator('input#password, input[name="password"], input[type="password"]')
    .first();

  // Some tenants use identifier-first: submit email, then password on next screen
  if (!(await passwordField.isVisible().catch(() => false))) {
    await page
      .locator('button[type="submit"], button[name="action"]')
      .first()
      .click();
    await passwordField.waitFor({ state: "visible", timeout: 30_000 });
  }

  await passwordField.fill(password);
  await page
    .locator('button[type="submit"], button[name="action"]')
    .first()
    .click();

  // Back in SPA app shell
  await page.getByRole("button", { name: "Create" }).waitFor({
    state: "visible",
    timeout: 60_000,
  });
  await page.getByRole("heading", { name: "Collections" }).waitFor({
    state: "visible",
    timeout: 30_000,
  });
}
