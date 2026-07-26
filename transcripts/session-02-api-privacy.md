# Session 02 — API + privacy (reconstructed)

_Source: SDD Tasks 4–8 reports, commit `57bf422`, final-fix follow-ups. Secrets redacted._

## Prompt (JWT /me)

> TDD RS256 access-token verifier (reject HS256/none). Global Bearer guard. GET /me upserts user.
> Audience https://bbl-candidate-test-api. Do not accept ID tokens.

## Messy bits

- Agent almost validated with a symmetric secret “for tests” — blocked by unit tests requiring JWKS/RS256 paths.
- Returning users without `email` claim broke upsert — fixed to match by `sub` only (`fix(api): allow returning users without email claim`).
- Later: first-time login without email claim → Auth0 `/userinfo` fallback; seed users linked by email (`final-fix-report.md`).

## Prompt (collections / bookmarks / shares)

> Collections CRUD with CollectionAccessService. Bookmarks + ?collectionId=. Shares by email.
> Stranger → 404. Grantee read OK, mutate → 403. TDD e2e first.

## Wrong then fixed

1. **Bookmarks grantee mutate = 404** in first green e2e (Task 7). Share semantics needed **403** when read access exists.
   - Caught by re-reading ADR + shares suite expectations.
   - Fix commit: align bookmark privacy status codes (`57bf422`); `getWritableOrThrow` for collection assign; e2e expect 403.

2. **Temptation to return 403 for unknown collection IDs** in early access helpers — contradicts “don’t leak existence.”
   - Caught by privacy-review checklist item 3 + e2e stranger cases.
   - Fix: `None` → `NotFoundError` only.

## Verification snapshot

```
pnpm --filter @bookmark-manager/api test        # unit green
pnpm --filter @bookmark-manager/api test:e2e    # privacy suites green (21→24 after /me cases)
```

## Privacy-review invocation

Manual `/privacy-review` (`.agent/commands/privacy-review.md`) on `apps/api/src/domains/**` during Task 14 — no new code gaps; Nest `import type` DI breakage fixed separately (see session 03 / AI_WORKFLOW).
