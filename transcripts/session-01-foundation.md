# Session 01 — foundation (reconstructed)

_Source: SDD Tasks 1–3 briefs/reports + early commits. Not a verbatim Cursor export. Secrets redacted._

## Prompt (Task 1)

> Create agent rules so a fresh session can build this takehome without re-explaining.
> Include privacy: non-member get-by-id → 404; mutations owner-only; CollectionShare read-only;
> collection delete SetNull bookmarks + cascade shares. Stack: Nest+Prisma+Postgres, React+Vite,
> Auth0 PKCE, access token Bearer. Add `.agent/commands/privacy-review.md`. Stub API_DESIGN / DECISIONS / AI_WORKFLOW / transcripts / README.

## What happened

- Wrote `CLAUDE.md` + `AGENTS.md` (mirrored). Agent first draft mentioned employer branding in a comment — stripped per “public docs” rule.
- Added `.agent/commands/privacy-review.md` checklist (reads / mutations / 404 vs 403 / no hand DTOs).
- Stubbed living docs; empty transcripts placeholders.

## Prompt (Tasks 2–3)

> Scaffold pnpm monorepo apps/api apps/web packages/ui packages/api-client. Docker Postgres.
> ESLint flat. Prisma schema users/collections/bookmarks/shares. Migrate + seed ≥2 users.

## Messy bits

- First compose mapped Postgres to **5432**; collided with local Postgres → remapped host **5433** (`fix(infra): map local Postgres to host port 5433`).
- Seed used fake `auth0Sub` values — fine for e2e; later critical-fix had to **link by email** on real Auth0 login (see session 02 / final-fix).

## Outcome

Monorepo + DB + agent rules committed; living docs still thin (filled in Task 14 / this polish pass).
