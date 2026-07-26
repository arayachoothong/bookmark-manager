# Bookmark Manager — Agent Rules

## Product
Private read-later app. Default: data visible only to owner.
Exception: CollectionShare grants read-only access to a collection + its bookmarks.
Non-members: 404 on get-by-id (never 403 for unknown resources).
Mutations + share management: owner only.
Collection delete: set bookmarks.collectionId = null; cascade-delete shares.

## Stack
- Monorepo: apps/api (NestJS+Prisma+Postgres), apps/web (React+Vite+MUI+Tailwind), packages/ui, packages/api-client
- No Next.js. Web port 3000.
- Auth: Authorization Code + PKCE. API Bearer = Auth0 **access token** (audience https://bbl-candidate-test-api). Validate JWKS RS256 only (reject HS256/none). Strict iss/aud/exp.
- Contract: Nest Swagger → OpenAPI → Orval → packages/api-client. Never hand-copy DTOs in apps/web. Never share Prisma types to web.

## Engineering
- TDD for features and all security claims.
- strict TypeScript; no any; one responsibility per file; DRY; compose small units.
- Domain-driven folders: api `src/domains/<domain>/{interface,application,infrastructure,domain,constants}` + `src/shared` (constants = TypeScript `enum` in `*.constant.ts`, same naming as web); web `src/pages/<route>/` + `src/domains/<domain>/{components,hooks,interfaces,constants,services,helpers?}` + `src/config/` + `app` + `lib` (helpers = `*.helper.ts`; domains never contain `pages/`; UI copy stays inline; layout chrome is `app/App.tsx`). Reuse across domains only via shared.
- Fix ESLint before claiming done. No blanket eslint-disable.
- Public docs: no employer/bank brand names.
- **Commits & PR titles:** Conventional Commits only — `<type>(<scope>): <description>` (see `.cursor/rules/commit-convention.mdc`). Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.

## When stuck
Decide, document in DECISIONS.md, steer the agent — do not silently accept agent defaults that violate privacy.
