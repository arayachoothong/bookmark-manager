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
  await expect(page.getByLabel("Name")).toHaveValue(collectionName);

  // Create bookmark (unassigned → lands on /bookmarks)
  await page.getByRole("button", { name: "Create" }).click();
  await page.getByRole("menuitem", { name: "New bookmark" }).click();
  await expect(page).toHaveURL(/\/bookmarks\/new/);
  await page.getByLabel("Title").fill(bookmarkTitle);
  await page.getByLabel("URL").fill(bookmarkUrl);
  await page.getByRole("button", { name: "Create bookmark" }).click();
  await expect(page).toHaveURL(/\/bookmarks\/?$/);
  await expect(page.getByText(bookmarkTitle)).toBeVisible();

  // Log out
  await page.getByRole("button", { name: "Log out" }).click();
  // After Auth0 logout returnTo origin — guest home redirects toward collections then Auth0 again, or landing
  await expect(page.getByRole("button", { name: "Create" })).toHaveCount(0, {
    timeout: 60_000,
  });
});
