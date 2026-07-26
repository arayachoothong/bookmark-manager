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
- Typical failure before the fix (reconstructed from `docker compose up` on a machine with Homebrew Postgres already bound to 5432):

  ```
  Error response from daemon: failed to set up container networking:
  driver failed programming external connectivity on endpoint bookmark-manager-db-1:
  Bind for 0.0.0.0:5432 failed: port is already allocated
  ```

  Follow-up: change `docker-compose.yml` to `ports: ["5433:5432"]`, then align root `.env.example`, `apps/api/.env.example`, and README “host **5433**” so `pnpm prisma migrate dev` and e2e did not silently hit the wrong instance.
- Seed used fake `auth0Sub` values (`auth0|seed-candidate`, `auth0|seed-alice` in `prisma/seed.ts`) — fine for e2e with mocked JWTs.
- **Seed email-link follow-up (not fixed in Task 3):** real Auth0 login sends a different `sub` than seed placeholders. Manual browser test showed empty collections until `UsersService.findOrCreateFromClaims` learned to match by **email** and rewrite `auth0Sub` (documented in session 02 + `final-fix-report.md`; e2e `links seeded user by email when Auth0 sub differs`).

## Commands that stuck

```bash
docker compose up -d
pnpm --filter @bookmark-manager/api exec prisma migrate dev
pnpm --filter @bookmark-manager/api exec prisma db seed
pnpm lint   # flat eslint.config.mjs at repo root
```

## Outcome

Monorepo + DB + agent rules committed; living docs still thin (filled in Task 14 / this polish pass).
