# API Backend Enum + Structure Review — Design Spec

**Date:** 2026-07-26  
**Scope:** Assessment of `apps/api` against the takehome design + a light enum-driven improvement (no Prisma migrations, no product features).  
**Approach:** A+B — gap assessment and small enum/structure pass; access policy rewritten around `CollectionAccessRole`; JWT alg + domain HTTP status as tiny constants; agent rules updated.

## 1. Goal

Answer whether the NestJS API meets the takehome structure and privacy expectations, then improve clarity by driving collection access (and a few magic strings) with TypeScript `enum`s named like the web (`*.constant.ts`), without a broad rewrite.

## 2. Locked decisions

| Topic | Choice |
| --- | --- |
| Deliverable | Assessment + light enum/structure code changes |
| Enum placement | Per-domain `constants/*.constant.ts` with TypeScript `enum`; no Prisma DB enums |
| Access policy | Resolve `CollectionAccessRole` (`Owner` \| `Viewer` \| `None`) once, then branch read/write |
| Extra constants | JWT allowed alg + domain HTTP status (404/403) |
| Agent rules | Update `CLAUDE.md` / `AGENTS.md` / `.cursor/rules/bookmark-manager.mdc` |
| Out of scope | Shared package with web, fuller `domain/` under bookmarks/sharing, Prisma enums, OpenAPI/URL/product changes |

## 3. Gap assessment — did we meet the brief?

**Verdict: yes.** The API meets the takehome design for domain-driven layout and privacy enforcement.

### 3.1 Met

| Requirement | Evidence |
| --- | --- |
| Domains: auth, users, collections, bookmarks, sharing + `shared/` | Present under `apps/api/src` |
| Layers: `interface` / `application` / `infrastructure`; collections also `domain/` | Controllers/DTOs, services, repos; access policy in `collections/domain` |
| Collection access is shared invariant for bookmarks + sharing | Both inject `CollectionAccessService` |
| Non-member get → 404; grantee mutate → 403 | Access service + e2e privacy suites |
| OpenAPI → Orval; no Prisma types in web | Existing codegen pipeline |
| Privacy tests | 9 unit + 24 e2e green |

### 3.2 Gaps worth fixing (this work)

1. **No access-role enum** — policy branches on `ownerId ===` and `hasShare` booleans; same mental model is re-derived in `bookmarks.service` private helpers.
2. **Magic strings** — JWT `"RS256"`; filter/error path uses Nest `HttpStatus` / string labels rather than a small domain constant for 404/403.

### 3.3 Not gaps (leave alone)

- `domain/` only under collections — bookmarks/sharing correctly reuse the shared policy (YAGNI).
- DTOs under `interface/dto` — matches the takehome convention.
- Error classes with `statusCode` — fine; constants will align the numeric codes without inventing a new error hierarchy.

## 4. Target improvement

### 4.1 `CollectionAccessRole`

**File:** `apps/api/src/domains/collections/constants/collection-access.constant.ts`

```ts
export enum CollectionAccessRole {
  Owner = "owner",
  Viewer = "viewer",
  None = "none",
}
```

**Policy flow (behavior-preserving):**

1. `resolveAccessRole(userId, collectionId)`:
   - missing collection → `None`
   - `ownerId === userId` → `Owner` (no share lookup)
   - active share → `Viewer`
   - else → `None`
2. Read (`assertCanReadCollection` / `getReadableOrThrow`):
   - `None` → `NotFoundError`
   - `Owner` \| `Viewer` → return collection record
3. Write (`assertCanWriteCollection` / `getWritableOrThrow`):
   - `Owner` → return collection record
   - `Viewer` → `ForbiddenError`
   - `None` → `NotFoundError`

Public method names stay the same so `BookmarksService` and `SharesService` need no call-site changes unless a tiny cleanup falls out naturally (optional; not required).

### 4.2 JWT alg constant

**File:** `apps/api/src/domains/auth/constants/jwt-alg.constant.ts`

```ts
export enum AllowedJwtAlg {
  RS256 = "RS256",
}
```

Use in `jwt-verifier.ts` for `algorithms: [AllowedJwtAlg.RS256]` and the header alg check. Reject any other alg (unchanged rule).

### 4.3 Domain HTTP status constant

**File:** `apps/api/src/shared/errors/http-status.constant.ts`

```ts
export enum DomainHttpStatus {
  NotFound = 404,
  Forbidden = 403,
}
```

Wire `NotFoundError` / `ForbiddenError` `statusCode` and `DomainExceptionFilter` to this enum (or keep Nest `HttpStatus` only if it maps to the same numbers — prefer the domain enum for the two privacy statuses so agents see one source of truth).

### 4.4 Agent rules

In `CLAUDE.md`, `AGENTS.md`, and `.cursor/rules/bookmark-manager.mdc`, extend the API folder clause so domains may include `constants/` with TypeScript `enum` in `*.constant.ts` (same naming convention as web). Do not invent a separate always-on Cursor rule unless the Engineering bullet becomes too long; prefer updating the shared bullet.

### 4.5 Empty folders

Create `constants/` only when a real file lands.

## 5. Testing

- **TDD:** Update/extend `collection-access.service.spec.ts` so role resolution and the 404/403 matrix remain proven (owner read/write; grantee read + write forbidden; stranger/missing → not found). Prefer asserting via public assert methods; optional direct tests of `resolveAccessRole` if extracted as a testable method.
- Run `pnpm --filter @bookmark-manager/api test` and `pnpm --filter @bookmark-manager/api test:e2e` (or root `pnpm test`).
- Jwt verifier unit tests must still reject non-RS256 if covered; update expected alg string to use the enum value.

## 6. Out of scope

- Prisma schema enums / migrations
- Shared npm package for roles between api and web
- Adding empty `domain/` folders to bookmarks/sharing
- Rewriting bookmarks into a parallel `BookmarkAccessRole` enum (keep using collection access)
- Product features, OpenAPI contract changes, Auth0/URL changes
- Frontend changes

## 7. Success criteria

- Written assessment in this spec: **backend meets takehome structure/privacy expectations**
- Access policy is enum-driven via `CollectionAccessRole` with unchanged HTTP semantics
- JWT alg and domain 404/403 use `*.constant.ts` enums
- Agent rules document API `constants/*.constant.ts`
- Unit + e2e privacy suites green
