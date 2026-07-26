# Architecture Decision Records

## Index

| Topic | Status |
|-------|--------|
| Auth0 access token vs ID token for API Bearer | Accepted |
| Collection delete semantics (`collectionId` null, share cascade) | Accepted |
| CollectionShare read-only share model | Accepted |
| 404 vs 403 for non-member get-by-id | Accepted |
| PostgreSQL as primary datastore | Accepted |

## ADR: Auth0 access token for API Bearer

**Status:** Accepted

**Context:** The SPA obtains tokens from Auth0; the API must authenticate machine callers, not just prove a browser session.

**Decision:** Require `Authorization: Bearer <access_token>` with audience `https://bbl-candidate-test-api`. Validate with JWKS, RS256 only, strict `iss` / `aud` / `exp`. Reject ID tokens and HS256.

**Consequences:** Web app uses `@auth0/auth0-react` with `authorizationParams.audience` and sends the access token via `@bookmark-manager/api-client`. First `/me` upsert may require an `email` claim on the token.

## ADR: PostgreSQL as primary datastore

**Status:** Accepted

**Context:** Relational data (users, collections, bookmarks, shares) with referential integrity.

**Decision:** Postgres 16 in Docker (host port 5433), Prisma ORM, migrations + seed (≥2 users).

**Consequences:** API owns schema; web never imports Prisma types.

## ADR: Collection delete semantics

**Status:** Accepted

**Context:** Deleting a collection should not delete bookmarks owned by the user.

**Decision:** Prisma `onDelete: Cascade` on `CollectionShare`; bookmarks use `onDelete: SetNull` on `collectionId`.

**Consequences:** Orphaned bookmarks remain owned by the user; shares disappear with the collection.

### ADR: CollectionShare read-only share model

**Status:** Accepted

**Context:** Collections and bookmarks are private to the owner unless explicitly shared.

**Decision:** `CollectionShare` links a collection to an existing user (`granteeUserId`). Shares are created by the owner via `POST /collections/:id/shares` with an invitee email; only users already in the database are eligible (no placeholder accounts). Grantees receive read access to the collection and its bookmarks; share management (list/create/revoke) is owner-only.

**Consequences:** Share invite returns 404 when the email does not match a user. Grantees see shared collections in `GET /collections` and can read detail and nested bookmarks.

### ADR: 404 vs 403 for collection and bookmark access

**Status:** Accepted

**Context:** Callers should not learn whether a resource exists when they have no relationship to it.

**Decision:**

- **404 Not Found** — Collection or bookmark id unknown to the caller: strangers (no ownership, no share), unknown invitee email on share create, missing share on revoke, missing collection id.
- **403 Forbidden** — Caller proved read access (owner or grantee) but attempted a write or share-management action reserved for the owner (PATCH/PUT/DELETE collection, bookmark mutations, share CRUD).

**Consequences:** Grantees who attempt mutations get 403; non-members get 404. Same rules apply to bookmark assignment and mutations inside shared collections.

## ADR: Thin pages + config-driven web structure (2026-07-26)

- **Decision:** Move route entrypoints to `apps/web/src/pages/`; keep domain logic in screens/hooks/services; drive router and feature flags from `src/config/`. Keep UI copy colocated with components (no labels config).
- **Why:** Clear Next-like mental model and tighter domain boundaries without over-abstracting copy for a small app.
- **Consequences:** Page files are shells; Auth0 callback file path may use `pages/auth/callback` while URL remains `/callback`.

### ADR: Enum-driven collection access policy (2026-07-26)

**Status:** Accepted

**Context:** Access control branched on `ownerId ===` and `hasShare` booleans, and the same mental model was re-derived in bookmark helpers. Magic strings (`"RS256"`, raw 404/403) were scattered.

**Decision:** `CollectionAccessService` resolves a `CollectionAccessRole` (`Owner` | `Viewer` | `None`) once, then branches read/write on the role. JWT allowed algorithm and the two domain HTTP statuses live in `*.constant.ts` enums. No Prisma DB enums; no shared package with web.

**Consequences:** HTTP semantics unchanged (non-member 404, grantee-write 403). API domains may now carry a `constants/` folder mirroring the web naming convention.
