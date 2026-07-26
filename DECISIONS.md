# Architecture Decision Records

Living document — ADRs are added as decisions are made during Steps 2–3.

## Planned ADRs

| Topic | Status |
|-------|--------|
| Auth0 access token vs ID token for API Bearer | Planned |
| Collection delete semantics (`collectionId` null, share cascade) | Planned |
| CollectionShare read-only share model | Accepted |
| 404 vs 403 for non-member get-by-id | Accepted |
| PostgreSQL as primary datastore | Planned |

## Records

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

<!-- ADR entries below as they are accepted. -->
