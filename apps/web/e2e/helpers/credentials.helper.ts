// apps/web/e2e/helpers/credentials.helper.ts

export function requireE2eCredentials(): {
  username: string;
  password: string;
} {
  const username = process.env.E2E_AUTH0_USERNAME?.trim() ?? "";
  const password = process.env.E2E_AUTH0_PASSWORD?.trim() ?? "";
  if (!username || !password) {
    throw new Error(
      "Missing E2E_AUTH0_USERNAME / E2E_AUTH0_PASSWORD. Copy apps/web/e2e/.env.example to apps/web/e2e/.env and fill credentials.",
    );
  }
  return { username, password };
}
