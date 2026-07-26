# AI Workflow

How this take-home was built with Cursor agents (subagent-driven development per task briefs in `.superpowers/sdd/`).

## Tools

- **Cursor Agent** with task-scoped subagents (Tasks 1–14), each with a brief + report.
- **Models:** Composer-family agents for implementation; planning from `docs/superpowers/plans/2026-07-26-bookmark-manager-takehome.md`.
- **Stack automation:** pnpm workspaces, Docker Compose, Prisma, NestJS Swagger, Orval, Vite.
- **Verification:** Jest unit + supertest e2e (privacy suites), ESLint 9 flat config.
- **Custom command:** `.agent/commands/privacy-review.md` (checklist for reads/mutations/404 vs 403/codegen).

## Decomposition

1. Agent rules + living doc stubs  
2. Monorepo + ESLint + Postgres  
3. Prisma schema, migrate, seed  
4–5. JWT verifier (TDD) + auth guard + `/me`  
6–8. Collections, bookmarks, shares (TDD e2e)  
9. Swagger, offline OpenAPI export, Orval `packages/api-client`  
10. `packages/ui`  
11–13. Web Auth0 PKCE, collections pages, bookmarks pages  
14. README, ADRs, workflow, transcripts, privacy pass  

Each task ended with a commit on `feat/bookmark-manager-app` and an SDD report.

## Wins

- **TDD on security:** Privacy e2e written before/alongside services; `CollectionAccessService` centralized 404/403 rules.
- **Contract-first web:** No hand-copied DTOs in `apps/web`; hooks from `@bookmark-manager/api-client`.
- **Offline OpenAPI export:** Codegen without live DB (`export-openapi.ts` test module).
- **Subagent reports:** `.superpowers/sdd/task-*-report.md` gave clean handoffs between tasks.

## Failures / lessons

- **ESLint `--fix` vs Nest DI:** `consistent-type-imports` auto-fix converted injectable classes to `import type`, breaking Nest metadata (`Function at index [0]`). Fixed by value imports for DI tokens and disabling that rule under `apps/api/src` (see `eslint.config.mjs`).
- **Orval hook names:** Generated names like `useCollectionsControllerList` differ from naive guesses — web tasks adjusted imports after first `pnpm codegen:api`.
- **Auth0 UI smoke:** Not automated; API privacy e2e covers authorization logic without browser login.

## Prompts

Typical task prompt shape: read `.superpowers/sdd/task-N-brief.md`, implement listed files, run tests named in brief, commit with prescribed message, write `task-N-report.md`. Global invariants from `CLAUDE.md` / `AGENTS.md` (404 for strangers, owner-only writes, access token not ID token).

## Privacy review (Task 14)

**Invocation:** Manual pass using `.agent/commands/privacy-review.md` against `apps/api/src/domains/**` (not a separate subagent run in this session).

| Check | Result |
|-------|--------|
| Reads scoped by owner or share | **OK** — `listReadableForUser` on collections/bookmarks; get-by-id via `CollectionAccessService` / `assertCanReadBookmark`. |
| Mutations owner-only | **OK** — `getWritableOrThrow`, `assertCanMutateBookmark`; shares use `getWritableOrThrow`. |
| Non-members get 404 on get-by-id | **OK** — strangers throw `NotFoundError`; grantees mutating throw `ForbiddenError`. |
| Web duplicates OpenAPI DTOs | **OK** — web imports generated models/hooks only. |

**Findings:** None requiring code changes in this pass.

## Cost note

Roughly 13 implementation tasks via Cursor subagents; no paid API usage logged in-repo. Wall-clock dominated by TDD e2e iterations and Orval/codegen cycles rather than model turns.
