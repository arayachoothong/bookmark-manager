# Architecture Decision Records

## Index

| Topic | Status |
|-------|--------|
| Auth0 access token vs ID token for API Bearer | Accepted |
| Collection delete semantics (`collectionId` null, share cascade) | Accepted |
| CollectionShare read-only share model | Accepted |
| 404 vs 403 for non-member get-by-id | Accepted |
| PostgreSQL as primary datastore | Accepted |
| Thin pages + config-driven web structure | Accepted |
| Enum-driven collection access policy | Accepted |

## ADR: Auth0 access token for API Bearer

**Status:** Accepted

**Context:** The SPA obtains tokens from Auth0; the API must authenticate API callers, not only prove a browser session to Auth0. The assignment deliberately leaves the Bearer choice open.

**Tenant verification (before design):** Inspected live discovery and JWKS — not assumed from Auth0 docs alone:

| Source | What we looked for | What we found |
|--------|--------------------|---------------|
| `…/.well-known/openid-configuration` | PKCE, grants, ID-token algs, public client | `code_challenge_methods_supported`: **S256** (+ `plain`); `grant_types_supported` includes `authorization_code`, `refresh_token`, and still **`implicit`**; `token_endpoint_auth_methods_supported` includes **`none`** (SPA OK); `id_token_signing_alg_values_supported` includes **HS256**, RS256, PS256 |
| `…/.well-known/jwks.json` | Signing keys for API JWT verification | Published keys advertise **RS256** only |

**Decision:**

1. SPA: **Authorization Code + PKCE (S256)** via `@auth0/auth0-react`. Do **not** use implicit (`response_type=token`), even though the tenant still advertises it.
2. API Bearer: Auth0 **access token** with audience `https://bbl-candidate-test-api`.
3. Validate via JWKS with strict `iss` / `aud` / `exp` and an algorithms allowlist of **RS256 only** (reject HS256 / `none`). Reject ID tokens as Bearer.

**Trade-offs (on-site defense):**

| Choice | Gain | Cost / risk |
|--------|------|-------------|
| Access token (not ID token) | `aud` binds the JWT to *this* API; Auth0 API permissions / future scopes fit here | Opaque-vs-JWT: ours is JWT so claims are inspectable; must still enforce allowlisted `alg` |
| Reject ID token as Bearer | Avoids treating an SPA login receipt as an API credential; avoids **alg confusion** if someone verifies with discovery’s ID-token algs (HS256 listed) | Email often lives on ID token / userinfo — we may need Action custom claims or `/userinfo` for first `/me` upsert |
| RS256-only allowlist | Matches JWKS; blocks HS256/`none` confusion attacks | Breaks if Auth0 rotated to another asym alg without updating our allowlist |
| Auth Code + PKCE, not implicit | No access token in the URL fragment; S256 is supported by this tenant | Slightly more moving parts (code exchange); refresh tokens + `localStorage` cache in the SPA are XSS-sensitive — acceptable for this takehome, tighten in production |

**Consequences:** Web requests `authorizationParams.audience` and sends the access token through `@bookmark-manager/api-client`. First `/me` upsert may require an `email` claim (or userinfo fallback). JWT unit tests cover wrong `aud` / non-RS256.

**Agent steer:** Default SPA tutorials send the **ID token** as `Authorization: Bearer`. We wrote “access token + audience `https://bbl-candidate-test-api`, reject ID token/HS256” into `AGENTS.md` before auth tasks and verified with JWT unit tests.

## ADR: PostgreSQL as primary datastore

**Status:** Accepted

**Context:** Relational data (users, collections, bookmarks, shares) with referential integrity.

**Decision:** Postgres 16 in Docker (host port 5432), Prisma ORM, migrations + seed (≥2 users).

**Consequences:** API owns schema; web never imports Prisma types.

**Agent steer:** Agents often default to SQLite “for the takehome.” We locked Docker Postgres 16 + host **5432** in compose/README early so seed/e2e matched the brief’s relational DB expectation.

## ADR: Collection delete semantics

**Status:** Accepted

**Context:** Deleting a collection should not delete bookmarks owned by the user.

**Decision:** Prisma `onDelete: Cascade` on `CollectionShare`; bookmarks use `onDelete: SetNull` on `collectionId`.

**Consequences:** Orphaned bookmarks remain owned by the user; shares disappear with the collection.

**Agent steer:** Cascade-delete of bookmarks is the ORM default temptation. Spec required `collectionId` **SetNull** + share **Cascade**; we put that in agent rules and the Prisma schema review before implementing DELETE.

### ADR: CollectionShare read-only share model

**Status:** Accepted

**Context:** Collections and bookmarks are private to the owner unless explicitly shared.

**Decision:** `CollectionShare` links a collection to an existing user (`granteeUserId`). Shares are created by the owner via `POST /collections/:id/shares` with an invitee email; only users already in the database are eligible (no placeholder accounts). Grantees receive read access to the collection and its bookmarks; share management (list/create/revoke) is owner-only.

**Consequences:** Share invite returns 404 when the email does not match a user. Grantees see shared collections in `GET /collections` and can read detail and nested bookmarks.

**Agent steer:** Agents default to “share link anyone” or create placeholder users. We forced invite-by-**existing email** → **404** if missing, and encoded owner-only share CRUD in the Task 8 brief + e2e before coding.

### ADR: 404 vs 403 for collection and bookmark access

**Status:** Accepted

**Context:** Callers should not learn whether a resource exists when they have no relationship to it.

**Decision:**

- **404 Not Found** — Collection or bookmark id unknown to the caller: strangers (no ownership, no share), unknown invitee email on share create, missing share on revoke, missing collection id.
- **403 Forbidden** — Caller proved read access (owner or grantee) but attempted a write or share-management action reserved for the owner (PATCH/PUT/DELETE collection, bookmark mutations, share CRUD).

**Consequences:** Grantees who attempt mutations get 403; non-members get 404. Same rules apply to bookmark assignment and mutations inside shared collections.

**Agent steer:** Framework default is **403 Forbidden** for authenticated-but-unauthorized. We overrode that for strangers (404) in `AGENTS.md` and failed e2e until `CollectionAccessService` matched; Task 7 initially shipped grantee mutate as 404 and was corrected to 403 when read access existed (`57bf422`).

## ADR: Thin pages + config-driven web structure (2026-07-26)

- **Decision:** Move route entrypoints to `apps/web/src/pages/`; keep domain logic in screens/hooks/services; drive router and feature flags from `src/config/`. Keep UI copy colocated with components (no labels config).
- **Why:** Clear Next-like mental model and tighter domain boundaries without over-abstracting copy for a small app.
- **Consequences:** Page files are shells; Auth0 callback file path may use `pages/auth/callback` while URL remains `/callback`.

**Agent steer:** Agents dump routes under `domains/*/pages` or grow fat page files. We wrote the structure design/plan first, then Cursor rule `web-frontend-structure.mdc`, and verified with the Task 6 structure checklist (`test ! -d …/domains/.../pages`).

## ADR: Enum-driven collection access policy (2026-07-26)

**Status:** Accepted

**Context:** Access control branched on `ownerId ===` and `hasShare` booleans, and the same mental model was re-derived in bookmark helpers. Magic strings (`"RS256"`, raw 404/403) were scattered.

**Decision:** `CollectionAccessService` resolves a `CollectionAccessRole` (`Owner` | `Viewer` | `None`) once, then branches read/write on the role. JWT allowed algorithm and the two domain HTTP statuses live in `*.constant.ts` enums. No Prisma DB enums; no shared package with web.

**Consequences:** HTTP semantics unchanged (non-member 404, grantee-write 403). API domains may now carry a `constants/` folder mirroring the web naming convention.
