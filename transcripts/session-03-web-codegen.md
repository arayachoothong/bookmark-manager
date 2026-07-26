# Session 03 — contract + web (reconstructed)

_Source: SDD Tasks 9–13 reports + Task 14 ESLint/Swagger fixes. Secrets redacted._

## Prompt (Task 9)

> Wire Nest Swagger, export OpenAPI offline, Orval → packages/api-client. Web must not hand-copy DTOs.

## Messy bits

- Live-server export idea died without DB/Auth0 → offline `apps/api/src/shared/openapi/export-openapi.ts` builds a Nest **TestingModule**, writes `openapi/openapi.json`, no listen.
- `consistent-type-imports` autofix turned Nest injectables/DTOs into `import type` → runtime Nest bootstrap errors and useless Swagger shapes.
  - Runtime (reconstructed): `Nest can't resolve dependencies of the X (?, …). Please make sure that the argument Function at index [0] is available in the Y module context.`
  - OpenAPI export: request/response component schemas named `"Function"` instead of DTO class names when `@Body()`/`@Query()` types were type-only imports.
  - Fix: value imports for DI providers and controller DTO parameters; disable `@typescript-eslint/consistent-type-imports` under `apps/api/src` in root `eslint.config.mjs` (web/packages keep the rule).
- Orval hook names (`useCollectionsControllerList`, `useBookmarksControllerFindAll`, …) ≠ human guesses → web imports adjusted after first `pnpm codegen:api` from root `package.json` script.

## OpenAPI / codegen loop

```bash
pnpm --filter @bookmark-manager/api export:openapi
pnpm codegen:api   # Orval → packages/api-client/src/generated/**
pnpm --filter @bookmark-manager/web build
```

Regenerate after any controller DTO or route change — hand-editing generated files is forbidden by agent rules.

## Prompt (Tasks 11–13)

> Auth0 PKCE on port 3000. Collections + bookmarks UI via generated hooks only. Owner-only mutations in UI.

## Wrong then fixed

1. **API queries fired before access-token getter ready** → 401 spam (`fix(web): gate API queries until auth token getter is ready`).
2. **Owner actions visible while `/me` loading** → Shared/Delete flash (`fix(web): gate collection owner UI on /me`).
3. **Bookmark create allowed shared collectionId in UI** → restricted to owned collections (`fix(web): restrict bookmark create to owned collections only`).

## Deferred (honest)

- No Playwright Auth0 smoke — manual browser login not automated; API privacy e2e is the trust signal.
- Bonuses (import/tags/search) skipped.

## Token handling

SPA uses Auth0 session; `setAccessTokenGetter` sends **access token** with API audience — never ID token. Client id / domain: `[REDACTED]` in env examples only.
