# API Backend Enum + Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drive the collection access policy with a `CollectionAccessRole` enum and replace JWT-alg / domain-HTTP-status magic strings with `*.constant.ts` enums, preserving all HTTP semantics, then encode API `constants/` in agent rules.

**Architecture:** `CollectionAccessService` resolves a role (`Owner` | `Viewer` | `None`) once and branches read/write on it. Small TypeScript enums live in per-domain `constants/` (auth) and `shared/errors/`. No Prisma migrations, no OpenAPI/URL changes, no product features.

**Tech Stack:** NestJS, TypeScript strict, jose, Jest (unit + e2e), Prisma (unchanged)

## Global Constraints

- Workspace (worktree): `/Users/anythingfons/Documents/bookmark-manager/.worktrees/feat-bookmark-manager-app`
- Spec: `docs/superpowers/specs/2026-07-26-api-backend-enum-structure-review-design.md`
- **Scope:** `apps/api` + agent docs only — no Prisma schema/migrations, no OpenAPI contract change, no frontend, no new features
- **Behavior preserved:** non-member get → 404; grantee mutate → 403; owner full; JWKS RS256-only (reject HS256/none); strict iss/aud/exp
- **Enum placement:** TypeScript `enum` in `*.constant.ts`; per-domain `constants/` (auth) and `shared/errors/`
- **No enum duplication:** bookmarks/sharing keep calling `CollectionAccessService`; do not invent a parallel `BookmarkAccessRole`
- **Empty folders:** create `constants/` only when a real file lands
- **TDD:** update `collection-access.service.spec.ts` first for the role-driven policy; keep the same 404/403 matrix green
- **Verification:** `pnpm --filter @bookmark-manager/api test` and `pnpm --filter @bookmark-manager/api test:e2e` (or root `pnpm test`)
- **Commits:** Conventional Commits (`refactor(api): …`, `docs(agent): …`)
- **Public naming:** no employer/bank brand names

## File map

| Path | Responsibility |
|------|----------------|
| `apps/api/src/domains/collections/constants/collection-access.constant.ts` | `CollectionAccessRole` enum |
| `apps/api/src/domains/collections/domain/collection-access.service.ts` | Role resolution + read/write branching |
| `apps/api/src/domains/collections/domain/collection-access.service.spec.ts` | Role-driven policy tests |
| `apps/api/src/domains/auth/constants/jwt-alg.constant.ts` | `AllowedJwtAlg` enum |
| `apps/api/src/domains/auth/infrastructure/jwt-verifier.ts` | Use `AllowedJwtAlg.RS256` |
| `apps/api/src/shared/errors/http-status.constant.ts` | `DomainHttpStatus` enum (404/403) |
| `apps/api/src/shared/errors/not-found.error.ts` | `statusCode` from enum |
| `apps/api/src/shared/errors/forbidden.error.ts` | `statusCode` from enum |
| `apps/api/src/shared/errors/domain-exception.filter.ts` | Status mapping from enum |
| `CLAUDE.md` / `AGENTS.md` / `.cursor/rules/bookmark-manager.mdc` | API `constants/*.constant.ts` convention |
| `DECISIONS.md` | ADR for enum-driven access policy |

---

### Task 1: `CollectionAccessRole` enum-driven access policy (TDD)

**Files:**
- Create: `apps/api/src/domains/collections/constants/collection-access.constant.ts`
- Modify: `apps/api/src/domains/collections/domain/collection-access.service.ts`
- Test: `apps/api/src/domains/collections/domain/collection-access.service.spec.ts`

**Interfaces:**
- Consumes: `CollectionAccessPort` (`findCollectionById`, `hasShare`), `NotFoundError`, `ForbiddenError`
- Produces: `CollectionAccessRole` enum; public methods unchanged — `assertCanReadCollection`, `assertCanWriteCollection`, `getReadableOrThrow`, `getWritableOrThrow` (same signatures/return types), plus `resolveAccessRole(userId, collectionId): Promise<{ role: CollectionAccessRole; collection: CollectionAccessRecord | null }>`

- [ ] **Step 1: Create the enum**

```ts
// apps/api/src/domains/collections/constants/collection-access.constant.ts
export enum CollectionAccessRole {
  Owner = "owner",
  Viewer = "viewer",
  None = "none",
}
```

- [ ] **Step 2: Update the spec test to assert role-driven behavior (RED)**

Add a describe block for `resolveAccessRole` while keeping existing assert-method cases. Append these tests to `collection-access.service.spec.ts`:

```ts
import { CollectionAccessRole } from "../constants/collection-access.constant";

// ...inside describe("CollectionAccessService", () => { ... }) after existing tests:

  describe("resolveAccessRole", () => {
    it("returns Owner for the owner without checking shares", async () => {
      port.findCollectionById.mockResolvedValue(collection);
      const result = await service.resolveAccessRole(ownerId, collectionId);
      expect(result.role).toBe(CollectionAccessRole.Owner);
      expect(result.collection).toEqual(collection);
      expect(port.hasShare).not.toHaveBeenCalled();
    });

    it("returns Viewer for a grantee", async () => {
      port.findCollectionById.mockResolvedValue(collection);
      port.hasShare.mockResolvedValue(true);
      const result = await service.resolveAccessRole(granteeId, collectionId);
      expect(result.role).toBe(CollectionAccessRole.Viewer);
      expect(result.collection).toEqual(collection);
    });

    it("returns None for a stranger", async () => {
      port.findCollectionById.mockResolvedValue(collection);
      port.hasShare.mockResolvedValue(false);
      const result = await service.resolveAccessRole(strangerId, collectionId);
      expect(result.role).toBe(CollectionAccessRole.None);
    });

    it("returns None when the collection is missing", async () => {
      port.findCollectionById.mockResolvedValue(null);
      const result = await service.resolveAccessRole(ownerId, collectionId);
      expect(result.role).toBe(CollectionAccessRole.None);
      expect(result.collection).toBeNull();
    });
  });
```

- [ ] **Step 3: Run the test to confirm it fails**

Run: `pnpm --filter @bookmark-manager/api test -- collection-access.service.spec`
Expected: FAIL — `service.resolveAccessRole is not a function`.

- [ ] **Step 4: Implement role resolution and branch on it (GREEN)**

Rewrite `collection-access.service.ts` keeping all public method names and return types:

```ts
import { Inject, Injectable } from "@nestjs/common";
import { CollectionAccessRole } from "../constants/collection-access.constant";
import { ForbiddenError, NotFoundError } from "./collection.errors";
import {
  COLLECTION_ACCESS_PORT,
  type CollectionAccessPort,
  type CollectionAccessRecord,
} from "./collection-access.port";

@Injectable()
export class CollectionAccessService {
  constructor(
    @Inject(COLLECTION_ACCESS_PORT)
    private readonly collectionAccessPort: CollectionAccessPort,
  ) {}

  async resolveAccessRole(
    userId: string,
    collectionId: string,
  ): Promise<{
    role: CollectionAccessRole;
    collection: CollectionAccessRecord | null;
  }> {
    const collection =
      await this.collectionAccessPort.findCollectionById(collectionId);
    if (!collection) {
      return { role: CollectionAccessRole.None, collection: null };
    }
    if (collection.ownerId === userId) {
      return { role: CollectionAccessRole.Owner, collection };
    }
    const shared = await this.collectionAccessPort.hasShare(
      collectionId,
      userId,
    );
    return {
      role: shared ? CollectionAccessRole.Viewer : CollectionAccessRole.None,
      collection,
    };
  }

  async getReadableOrThrow(
    userId: string,
    collectionId: string,
  ): Promise<CollectionAccessRecord> {
    return this.assertCanReadCollection(userId, collectionId);
  }

  async assertCanReadCollection(
    userId: string,
    collectionId: string,
  ): Promise<CollectionAccessRecord> {
    const { role, collection } = await this.resolveAccessRole(
      userId,
      collectionId,
    );
    if (role === CollectionAccessRole.None || !collection) {
      throw new NotFoundError("Collection not found");
    }
    return collection;
  }

  async getWritableOrThrow(
    userId: string,
    collectionId: string,
  ): Promise<CollectionAccessRecord> {
    return this.assertCanWriteCollection(userId, collectionId);
  }

  async assertCanWriteCollection(
    userId: string,
    collectionId: string,
  ): Promise<CollectionAccessRecord> {
    const { role, collection } = await this.resolveAccessRole(
      userId,
      collectionId,
    );
    if (role === CollectionAccessRole.Owner && collection) {
      return collection;
    }
    if (role === CollectionAccessRole.Viewer) {
      throw new ForbiddenError();
    }
    throw new NotFoundError("Collection not found");
  }
}
```

- [ ] **Step 5: Run unit tests (GREEN)**

Run: `pnpm --filter @bookmark-manager/api test`
Expected: PASS — all unit suites green, including new `resolveAccessRole` cases and the existing owner/grantee/stranger/missing matrix.

- [ ] **Step 6: Run e2e to confirm HTTP semantics unchanged**

Run: `pnpm --filter @bookmark-manager/api test:e2e`
Expected: PASS — 24 e2e (privacy 404/403) still green.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/domains/collections/constants/collection-access.constant.ts apps/api/src/domains/collections/domain/collection-access.service.ts apps/api/src/domains/collections/domain/collection-access.service.spec.ts
git commit -m "$(cat <<'EOF'
refactor(api): drive collection access with CollectionAccessRole enum

Resolve owner/viewer/none once, then branch read/write; behavior unchanged (404 non-member, 403 grantee write).
EOF
)"
```

---

### Task 2: JWT allowed-alg constant

**Files:**
- Create: `apps/api/src/domains/auth/constants/jwt-alg.constant.ts`
- Modify: `apps/api/src/domains/auth/infrastructure/jwt-verifier.ts`
- Test: `apps/api/src/domains/auth/infrastructure/jwt-verifier.spec.ts` (existing; no behavior change expected)

**Interfaces:**
- Consumes: jose `jwtVerify`
- Produces: `AllowedJwtAlg` enum used for `algorithms` and header check

- [ ] **Step 1: Create the enum**

```ts
// apps/api/src/domains/auth/constants/jwt-alg.constant.ts
export enum AllowedJwtAlg {
  RS256 = "RS256",
}
```

- [ ] **Step 2: Use it in the verifier**

In `jwt-verifier.ts`, import and replace both literals:

```ts
import { AllowedJwtAlg } from "../constants/jwt-alg.constant";
// ...
      {
        issuer: options.issuer,
        audience: options.audience,
        algorithms: [AllowedJwtAlg.RS256],
      },
    );

    if (protectedHeader.alg !== AllowedJwtAlg.RS256) {
      throw new Error("Invalid algorithm: only RS256 allowed");
    }
```

- [ ] **Step 3: Run the verifier tests (unchanged behavior)**

Run: `pnpm --filter @bookmark-manager/api test -- jwt-verifier.spec`
Expected: PASS — accepts RS256, rejects HS256/wrong aud/wrong iss/expired (5 cases).

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/domains/auth/constants/jwt-alg.constant.ts apps/api/src/domains/auth/infrastructure/jwt-verifier.ts
git commit -m "$(cat <<'EOF'
refactor(api): use AllowedJwtAlg enum for RS256-only verification

Replace the RS256 magic string in the JWKS verifier with a constant.
EOF
)"
```

---

### Task 3: Domain HTTP status constant

**Files:**
- Create: `apps/api/src/shared/errors/http-status.constant.ts`
- Modify: `apps/api/src/shared/errors/not-found.error.ts`
- Modify: `apps/api/src/shared/errors/forbidden.error.ts`
- Modify: `apps/api/src/shared/errors/domain-exception.filter.ts`

**Interfaces:**
- Consumes: NestJS `ExceptionFilter`
- Produces: `DomainHttpStatus` enum (`NotFound = 404`, `Forbidden = 403`) used by error classes + filter

- [ ] **Step 1: Create the enum**

```ts
// apps/api/src/shared/errors/http-status.constant.ts
export enum DomainHttpStatus {
  NotFound = 404,
  Forbidden = 403,
}
```

- [ ] **Step 2: Use it in the error classes**

```ts
// not-found.error.ts
import { DomainHttpStatus } from "./http-status.constant";

export class NotFoundError extends Error {
  readonly statusCode = DomainHttpStatus.NotFound;

  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}
```

```ts
// forbidden.error.ts
import { DomainHttpStatus } from "./http-status.constant";

export class ForbiddenError extends Error {
  readonly statusCode = DomainHttpStatus.Forbidden;

  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}
```

- [ ] **Step 3: Use it in the exception filter**

Rewrite the status/error mapping in `domain-exception.filter.ts` to use the enum and each error's own `statusCode`:

```ts
import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import { Catch } from "@nestjs/common";
import type { Response } from "express";
import { DomainHttpStatus } from "./http-status.constant";
import { ForbiddenError } from "./forbidden.error";
import { NotFoundError } from "./not-found.error";

@Catch(NotFoundError, ForbiddenError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: NotFoundError | ForbiddenError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.statusCode;

    response.status(status).json({
      statusCode: status,
      message: exception.message,
      error:
        status === DomainHttpStatus.Forbidden ? "Forbidden" : "Not Found",
    });
  }
}
```

- [ ] **Step 4: Run unit + e2e (unchanged HTTP bodies/status)**

Run: `pnpm --filter @bookmark-manager/api test && pnpm --filter @bookmark-manager/api test:e2e`
Expected: PASS — 9 unit + 24 e2e green; 404/403 responses identical.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/shared/errors/http-status.constant.ts apps/api/src/shared/errors/not-found.error.ts apps/api/src/shared/errors/forbidden.error.ts apps/api/src/shared/errors/domain-exception.filter.ts
git commit -m "$(cat <<'EOF'
refactor(api): map domain 404/403 via DomainHttpStatus enum

Single source for the two privacy status codes across error classes and the exception filter.
EOF
)"
```

---

### Task 4: Agent rules + ADR

**Files:**
- Modify: `CLAUDE.md`
- Modify: `AGENTS.md`
- Modify: `.cursor/rules/bookmark-manager.mdc`
- Modify: `DECISIONS.md`

**Interfaces:**
- Consumes: approved conventions
- Produces: dual-agent + Cursor guidance for API `constants/*.constant.ts`

- [ ] **Step 1: Extend the API folder clause in the three mirrors**

In `CLAUDE.md`, `AGENTS.md`, and `.cursor/rules/bookmark-manager.mdc`, update the API portion of the domain-folders bullet:

Old (API portion):

```text
api `src/domains/<domain>/{interface,application,infrastructure,domain}` + `src/shared`
```

New (API portion):

```text
api `src/domains/<domain>/{interface,application,infrastructure,domain,constants}` + `src/shared` (constants = TypeScript `enum` in `*.constant.ts`, same naming as web)
```

Leave the web portion and all other text unchanged.

- [ ] **Step 2: Append ADR to `DECISIONS.md`**

```md
### ADR: Enum-driven collection access policy (2026-07-26)

**Status:** Accepted

**Context:** Access control branched on `ownerId ===` and `hasShare` booleans, and the same mental model was re-derived in bookmark helpers. Magic strings (`"RS256"`, raw 404/403) were scattered.

**Decision:** `CollectionAccessService` resolves a `CollectionAccessRole` (`Owner` | `Viewer` | `None`) once, then branches read/write on the role. JWT allowed algorithm and the two domain HTTP statuses live in `*.constant.ts` enums. No Prisma DB enums; no shared package with web.

**Consequences:** HTTP semantics unchanged (non-member 404, grantee-write 403). API domains may now carry a `constants/` folder mirroring the web naming convention.
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md AGENTS.md .cursor/rules/bookmark-manager.mdc DECISIONS.md
git commit -m "$(cat <<'EOF'
docs(agent): document API constants/*.constant.ts convention

Encode enum-driven access and the API constants folder for Cursor and dual agents; add ADR.
EOF
)"
```

---

### Task 5: Final verification

**Files:** none (verify only; fix only if a suite fails)

**Interfaces:**
- Consumes: Tasks 1–4
- Produces: confirmed green suites + structure checks

- [ ] **Step 1: Structure checks**

```bash
test -f apps/api/src/domains/collections/constants/collection-access.constant.ts
test -f apps/api/src/domains/auth/constants/jwt-alg.constant.ts
test -f apps/api/src/shared/errors/http-status.constant.ts
rg -n "CollectionAccessRole" apps/api/src/domains/collections/domain/collection-access.service.ts
```

Expected: files exist; service references the enum.

- [ ] **Step 2: Full suites**

```bash
pnpm --filter @bookmark-manager/api test && pnpm --filter @bookmark-manager/api test:e2e
```

Expected: 9 (+4 new role cases) unit green; 24 e2e green.

- [ ] **Step 3: Commit only if fixes were needed**

If no changes: skip. If fixes landed:

```bash
git add -A apps/api
git commit -m "$(cat <<'EOF'
fix(api): address enum refactor verification issues

EOF
)"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| `CollectionAccessRole` enum in `constants/*.constant.ts` | 1 |
| Resolve role once, branch read/write; behavior preserved | 1 |
| Unit tests keep 404/403 matrix + role cases | 1, 5 |
| JWT `AllowedJwtAlg` constant | 2 |
| `DomainHttpStatus` 404/403 constant in error classes + filter | 3 |
| Agent rules: API `constants/*.constant.ts` | 4 |
| ADR in DECISIONS.md | 4 |
| No Prisma/OpenAPI/URL/frontend changes | Global constraints |
| Suites green | 1, 3, 5 |

**Placeholder scan:** none.  
**Type consistency:** `CollectionAccessRole`, `resolveAccessRole` return shape, `AllowedJwtAlg`, `DomainHttpStatus` names stable across tasks; public access-service method signatures unchanged so callers need no edits.
