# Session notes — contract + web (Tasks 9–13)

_Synthesized from SDD reports; not verbatim chat logs._

## Goals

- Swagger + offline OpenAPI export; Orval → `@bookmark-manager/api-client`
- `packages/ui` primitives
- Web: Auth0 PKCE, axios token injection, React Query, Router on port 3000
- Collections and bookmarks pages using generated hooks only

## Outcomes

- `pnpm codegen:api` pipeline documented; web avoids parallel DTO types.
- UI wired for list/create/share and bookmark filter by collection.

## Deferred

- Manual Auth0 login smoke in browser (no Playwright/Cypress in scope).
- Bonus features (import, tags, search) skipped per plan.

## Token handling

- SPA stores Auth0 session; `setAccessTokenGetter` sends **access token** with API audience `[REDACTED client-specific]` — never ID token.
