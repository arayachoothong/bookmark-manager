import { expect, test } from "@playwright/test";

import { loginAsE2eUser } from "./helpers/auth.helper";

test.describe.configure({ mode: "serial" });

test("Auth0 login, create collection and bookmark, then log out", async ({
  page,
}) => {
  const stamp = Date.now();
  const collectionName = `E2E Collection ${stamp}`;
  const bookmarkTitle = `E2E Bookmark ${stamp}`;
  const bookmarkUrl = `https://example.com/e2e-${stamp}`;

  await loginAsE2eUser(page);
  await expect(page).toHaveURL(/\/collections\/?$/);

  // Create collection
  await page.getByRole("button", { name: "Create" }).click();
  await page.getByRole("menuitem", { name: "New collection" }).click();
  await expect(page).toHaveURL(/\/collections\/new/);
  await page.getByLabel("Name").fill(collectionName);
  await page.getByRole("button", { name: "Create collection" }).click();
  await expect(page).toHaveURL(/\/collections\/[^/]+$/);
  await expect(
    page.getByLabel("Collection name", { exact: true }),
  ).toHaveValue(collectionName);

  // Create bookmark (unassigned → lands on /bookmarks)
  await page.getByRole("button", { name: "Create" }).click();
  await page.getByRole("menuitem", { name: "New bookmark" }).click();
  await expect(page).toHaveURL(/\/bookmarks\/new/);
  await page.getByLabel("Title").fill(bookmarkTitle);
  await page.getByLabel("URL").fill(bookmarkUrl);
  await page.getByRole("button", { name: "Create bookmark" }).click();
  await expect(page).toHaveURL(/\/bookmarks\/?$/);
  await expect(page.getByText(bookmarkTitle)).toBeVisible();

  // Log out — returnTo origin → RequireAuth redirects to Auth0 again
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(
    page
      .locator(
        'input#username, input[name="username"], input[name="email"], input#email',
      )
      .first(),
  ).toBeVisible({ timeout: 60_000 });
});
