# Bookmark Manager Take-Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a private bookmark manager monorepo (NestJS + Prisma + Postgres API, React/Vite/MUI/Tailwind web) with Auth0 access-token auth, read-only email sharing, OpenAPI→Orval codegen, agent rules, and TDD-proven privacy tests — following the three-step spine in the design spec.

**Architecture:** pnpm monorepo (`apps/api`, `apps/web`, `packages/ui`, `packages/api-client`). Privacy is enforced in API access helpers (owner OR active share for reads; owner-only for writes). OpenAPI from Nest Swagger is the contract; Orval generates typed axios + React Query hooks. Agent rules (`CLAUDE.md` / `AGENTS.md` / `/.agent/`) land before application code.

**Tech Stack:** NestJS, Prisma, PostgreSQL (Docker), Auth0 (Authorization Code + PKCE), React + Vite, React Router ≥ v8, MUI ≥ v9, Tailwind, axios, TanStack Query, Orval, `@nestjs/swagger`, Vitest/Jest, ESLint flat config, pnpm

## Global Constraints

- Workspace: `/Users/anythingfons/Documents/bookmark-manager`
- Spec: `docs/superpowers/specs/2026-07-26-bookmark-manager-takehome-design.md`
- **Public naming:** never mention employer/bank brand names in repo docs, README, commits, or UI copy
- **TDD:** failing test first for features and all privacy claims; exceptions only for generated `api-client` and pure scaffolding
- **Strict TS:** `strict: true`; no `any`; no unjustified `as`
- **SRP:** one primary responsibility per file; compose small units
- **DRY:** OpenAPI/codegen for API shapes; `@bookmark-manager/ui` for shared visuals; no hand-copied DTOs in web
- **Auth:** API accepts **access token** only (audience `https://bbl-candidate-test-api`), JWKS **RS256 allowlist**, strict `iss`/`aud`/`exp`
- **Privacy:** non-members get **404** (not 403) on get-by-id; share = read-only; mutations = owner only
- **Collection delete:** null `collectionId` on bookmarks; cascade-delete shares
- **Share invite:** email → existing `User` only; unknown email → 404
- **Web port:** `3000` (Auth0 callback/logout)
- **Commits:** meaningful, frequent commits as you go (graded); do **not** squash history
- **Bonuses** (Dockerfiles for apps, CI, `/all`, FTS): only after Tasks 1–14 are solid — optional, not required by this plan

## File map

| Path | Responsibility |
|------|----------------|
| `CLAUDE.md` / `AGENTS.md` | Agent rules: privacy, auth, TDD, codegen, SRP |
| `.agent/commands/privacy-review.md` | Reusable agent capability |
| `.cursor/rules/bookmark-manager.mdc` | Cursor mirror of invariants |
| `API_DESIGN.md` / `DECISIONS.md` / `AI_WORKFLOW.md` | Living graded docs |
| `transcripts/.gitkeep` | Session log folder |
| `README.md` | Run/test; completed vs skipped; token rationale |
| `docker-compose.yml` | Postgres |
| `eslint.config.mjs` | Shared flat ESLint |
| `pnpm-workspace.yaml` / root `package.json` | Workspace scripts |
| `apps/api/prisma/schema.prisma` | User, Collection, Bookmark, CollectionShare |
| `apps/api/prisma/seed.ts` | ≥2 users + sample data |
| `apps/api/src/main.ts` | Bootstrap + Swagger |
| `apps/api/src/auth/access-token.guard.ts` | Bearer JWT validation |
| `apps/api/src/auth/jwt-verifier.ts` | iss/aud/exp/alg checks |
| `apps/api/src/auth/current-user.decorator.ts` | Inject resolved User |
| `apps/api/src/users/users.service.ts` | Upsert by `auth0Sub` |
| `apps/api/src/users/me.controller.ts` | `GET /me` |
| `apps/api/src/collections/**` | CRUD + nested bookmarks + shares |
| `apps/api/src/bookmarks/**` | CRUD + filters |
| `apps/api/src/access/collection-access.ts` | Owner/share read vs write policy |
| `apps/api/src/common/errors/**` | Uniform error shape + filters |
| `apps/api/test/**` | Integration tests (privacy, auth) |
| `openapi/openapi.json` | Exported OpenAPI (codegen input) |
| `packages/api-client/**` | Orval output (types + axios + RQ) |
| `orval.config.ts` | Codegen config |
| `packages/ui/src/**` | Presentational MUI+Tailwind primitives |
| `apps/web/src/main.tsx` | Providers (Auth0, Query, Router) |
| `apps/web/src/lib/http/configure-api-client.ts` | Axios auth interceptor wiring |
| `apps/web/src/pages/collections/**` | Collections feature (split files) |
| `apps/web/src/pages/bookmarks/**` | Bookmarks feature (split files) |
| `apps/web/src/pages/callback/**` | Auth0 callback route |

---

## Phase A — Step 1: AI track

### Task 1: Agent rules, living stubs, privacy-review command

**Files:**
- Create: `CLAUDE.md`
- Create: `AGENTS.md`
- Create: `.agent/commands/privacy-review.md`
- Create: `.cursor/rules/bookmark-manager.mdc`
- Create: `API_DESIGN.md` (stub)
- Create: `DECISIONS.md` (stub with planned ADRs listed)
- Create: `AI_WORKFLOW.md` (stub)
- Create: `transcripts/.gitkeep`
- Create: `README.md` (skeleton)

**Interfaces:**
- Consumes: design spec decisions (access token, 404, share read-only, TDD)
- Produces: agent-readable invariants that later tasks must obey

- [ ] **Step 1: Write `CLAUDE.md` and identical-intent `AGENTS.md`**

Include at minimum:

```markdown
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
- Fix ESLint before claiming done. No blanket eslint-disable.
- Public docs: no employer/bank brand names.

## When stuck
Decide, document in DECISIONS.md, steer the agent — do not silently accept agent defaults that violate privacy.
```

- [ ] **Step 2: Write `.agent/commands/privacy-review.md`**

```markdown
# /privacy-review

Audit the current diff (or named paths) for privacy violations:

1. Any Prisma/query path on Collection or Bookmark missing ownerId OR active CollectionShare for the current user on **reads**.
2. Any **mutation** that does not require ownership.
3. Any get-by-id that returns 403 instead of 404 for non-members.
4. Any frontend type that duplicates OpenAPI DTOs instead of importing `@bookmark-manager/api-client`.

Output: file:line findings + required fix. Do not rewrite unrelated code.
```

- [ ] **Step 3: Write Cursor rule + living stubs**

`API_DESIGN.md` stub header: resources TBD, privacy section TBD, “agent mistakes” section empty.  
`DECISIONS.md` list planned ADRs: token choice, 404 vs 403, delete semantics, share model, Postgres.  
`AI_WORKFLOW.md`: empty sections for tools, wins, failures, prompts.  
`README.md`: title, “setup TBD”, token rationale one-liner placeholder pointing to DECISIONS.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md AGENTS.md .agent .cursor API_DESIGN.md DECISIONS.md AI_WORKFLOW.md transcripts README.md
git commit -m "$(cat <<'EOF'
Add agent rules, privacy-review command, and living doc stubs.

Steer future sessions before application code lands.
EOF
)"
```

---

## Phase B — Step 2: Architecture, harness, contract

### Task 2: Monorepo scaffold + Docker Postgres + ESLint

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `.gitignore`, `.npmrc` (`shamefully-hoist=false` optional)
- Create: `docker-compose.yml`
- Create: `eslint.config.mjs`
- Create: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/nest-cli.json`
- Create: `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/vite.config.ts`
- Create: `packages/ui/package.json`, `packages/ui/tsconfig.json`, `packages/ui/src/index.ts`
- Create: `packages/api-client/package.json`, `packages/api-client/src/index.ts` (placeholder export)
- Create: `.env.example`

**Interfaces:**
- Produces: `pnpm install` works; `docker compose up -d` starts Postgres; `pnpm lint` runs (may only lint empty packages)

- [ ] **Step 1: Root workspace files**

`pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Root `package.json` scripts:

```json
{
  "name": "bookmark-manager",
  "private": true,
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "lint": "eslint .",
    "test": "pnpm --filter @bookmark-manager/api test",
    "dev:api": "pnpm --filter @bookmark-manager/api start:dev",
    "dev:web": "pnpm --filter @bookmark-manager/web dev",
    "codegen:api": "pnpm --filter @bookmark-manager/api export:openapi && orval",
    "db:up": "docker compose up -d",
    "db:down": "docker compose down"
  }
}
```

`docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    environment:
      POSTGRES_USER: bookmark
      POSTGRES_PASSWORD: bookmark
      POSTGRES_DB: bookmark
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

`.env.example`:

```
DATABASE_URL=postgresql://bookmark:bookmark@localhost:5432/bookmark?schema=public
AUTH0_ISSUER=https://dev-yg.us.auth0.com/
AUTH0_AUDIENCE=https://bbl-candidate-test-api
AUTH0_DOMAIN=dev-yg.us.auth0.com
AUTH0_CLIENT_ID=H9F6QG5SzTKMv0tbmgxLj9LjG1EKVllA
VITE_AUTH0_DOMAIN=dev-yg.us.auth0.com
VITE_AUTH0_CLIENT_ID=H9F6QG5SzTKMv0tbmgxLj9LjG1EKVllA
VITE_AUTH0_AUDIENCE=https://bbl-candidate-test-api
VITE_API_BASE_URL=http://localhost:4000
```

- [ ] **Step 2: ESLint flat config (strict any ban)**

```js
// eslint.config.mjs
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["**/dist/**", "**/node_modules/**", "packages/api-client/src/generated/**"],
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": "error",
      "max-lines": ["warn", { max: 200, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ["apps/web/**/*.{ts,tsx}", "packages/ui/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
  },
  {
    files: ["apps/web/**/*.{ts,tsx}", "packages/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: [{ name: "@prisma/client", message: "Do not import Prisma outside apps/api." }] },
      ],
    },
  },
);
```

- [ ] **Step 3: Minimal package manifests + `pnpm install` + `docker compose up -d`**

Package names: `@bookmark-manager/api`, `@bookmark-manager/web`, `@bookmark-manager/ui`, `@bookmark-manager/api-client`.

API listens later on **4000** (web on **3000**). Scaffold Nest via `pnpm dlx @nestjs/cli new` into `apps/api` **or** hand-create `main.ts`/`app.module.ts` stubs — prefer Nest CLI then strip sample code.

- [ ] **Step 4: Verify**

Run: `pnpm lint` — Expected: pass or only warn on empty packages  
Run: `docker compose ps` — Expected: postgres healthy/up

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-workspace.yaml pnpm-lock.yaml docker-compose.yml eslint.config.mjs .gitignore .env.example apps packages
git commit -m "$(cat <<'EOF'
Scaffold pnpm monorepo, Postgres compose, and strict ESLint.

Establish workspace packages before domain code.
EOF
)"
```

---

### Task 3: Prisma schema + seed (≥2 users)

**Files:**
- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/seed.ts`
- Modify: `apps/api/package.json` (prisma scripts, `prisma.seed`)

**Interfaces:**
- Produces models: `User`, `Collection`, `Bookmark`, `CollectionShare`
- Seed users: `candidate@test.com` (matches Auth0 test user email) + `alice@example.com`

- [ ] **Step 1: Schema**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  auth0Sub  String   @unique
  email     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  collections Collection[]
  bookmarks   Bookmark[]
  shares      CollectionShare[] @relation("GranteeShares")
}

model Collection {
  id        String   @id @default(cuid())
  name      String
  ownerId   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  owner     User              @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  bookmarks Bookmark[]
  shares    CollectionShare[]
}

model Bookmark {
  id           String   @id @default(cuid())
  url          String
  title        String
  notes        String?
  collectionId String?
  ownerId      String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  owner      User        @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  collection Collection? @relation(fields: [collectionId], references: [id], onDelete: SetNull)
}

model CollectionShare {
  id           String   @id @default(cuid())
  collectionId String
  granteeUserId String
  createdAt    DateTime @default(now())

  collection Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  grantee    User       @relation("GranteeShares", fields: [granteeUserId], references: [id], onDelete: Cascade)

  @@unique([collectionId, granteeUserId])
}
```

- [ ] **Step 2: Seed (≥2 users)**

```ts
// apps/api/prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const candidate = await prisma.user.upsert({
    where: { email: "candidate@test.com" },
    update: {},
    create: {
      email: "candidate@test.com",
      auth0Sub: "auth0|seed-candidate",
    },
  });

  const alice = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: {
      email: "alice@example.com",
      auth0Sub: "auth0|seed-alice",
    },
  });

  await prisma.collection.create({
    data: { name: "Candidate private", ownerId: candidate.id },
  });
  await prisma.collection.create({
    data: { name: "Alice private", ownerId: alice.id },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
```

- [ ] **Step 3: Migrate**

```bash
cp .env.example apps/api/.env
# ensure DATABASE_URL matches compose
pnpm --filter @bookmark-manager/api exec prisma migrate dev --name init
pnpm --filter @bookmark-manager/api exec prisma db seed
```

Expected: tables created; two users present.

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma apps/api/package.json apps/api/.env.example
git commit -m "$(cat <<'EOF'
Add Prisma schema and two-user seed.

Model collections, bookmarks, and read-only shares.
EOF
)"
```

---

### Task 4: JWT verifier (TDD) — RS256 + aud/iss/exp

**Files:**
- Create: `apps/api/src/auth/jwt-verifier.ts`
- Create: `apps/api/src/auth/jwt-verifier.spec.ts`
- Create: `apps/api/test/helpers/test-keys.ts` (generate RS256 keypair once for tests)

**Interfaces:**
- Consumes: `issuer: string`, `audience: string`, `jwksUri` or injected `getKey`
- Produces: `verifyAccessToken(token: string): Promise<{ sub: string; email?: string }>`
- Throws on wrong alg / aud / iss / expired

- [ ] **Step 1: Write failing tests**

```ts
// apps/api/src/auth/jwt-verifier.spec.ts
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { createJwtVerifier } from "./jwt-verifier";

describe("createJwtVerifier", () => {
  const issuer = "https://dev-yg.us.auth0.com/";
  const audience = "https://bbl-candidate-test-api";

  it("accepts a valid RS256 access token", async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256");
    const jwk = await exportJWK(publicKey);
    jwk.kid = "test";
    jwk.alg = "RS256";

    const token = await new SignJWT({ email: "candidate@test.com" })
      .setProtectedHeader({ alg: "RS256", kid: "test" })
      .setIssuer(issuer)
      .setAudience(audience)
      .setSubject("auth0|abc")
      .setExpirationTime("2h")
      .sign(privateKey);

    const verify = createJwtVerifier({
      issuer,
      audience,
      getKey: async () => publicKey,
    });

    await expect(verify(token)).resolves.toMatchObject({
      sub: "auth0|abc",
      email: "candidate@test.com",
    });
  });

  it("rejects HS256 tokens even if signature would otherwise verify", async () => {
    const secret = new TextEncoder().encode("super-secret-key-for-hs256-tests!!");
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer(issuer)
      .setAudience(audience)
      .setSubject("auth0|abc")
      .setExpirationTime("2h")
      .sign(secret);

    const verify = createJwtVerifier({
      issuer,
      audience,
      getKey: async () => secret,
    });

    await expect(verify(token)).rejects.toThrow(/algorithm|alg|RS256/i);
  });

  it("rejects wrong audience", async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256");
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "RS256", kid: "test" })
      .setIssuer(issuer)
      .setAudience("https://wrong-audience")
      .setSubject("auth0|abc")
      .setExpirationTime("2h")
      .sign(privateKey);

    const verify = createJwtVerifier({
      issuer,
      audience,
      getKey: async () => publicKey,
    });

    await expect(verify(token)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
pnpm --filter @bookmark-manager/api test -- jwt-verifier.spec.ts
```

Expected: FAIL (module/function missing)

- [ ] **Step 3: Minimal implementation**

```ts
// apps/api/src/auth/jwt-verifier.ts
import { createLocalJWKSet, jwtVerify, errors } from "jose";
import type { KeyLike, JWK } from "jose";

export type JwtClaims = { sub: string; email?: string };

export type JwtVerifierOptions = {
  issuer: string;
  audience: string;
  /** Injected for tests; production uses remote JWKS */
  getKey: (header: { kid?: string; alg?: string }) => Promise<KeyLike | Uint8Array>;
};

export function createJwtVerifier(options: JwtVerifierOptions) {
  return async function verifyAccessToken(token: string): Promise<JwtClaims> {
    const { payload, protectedHeader } = await jwtVerify(token, options.getKey, {
      issuer: options.issuer,
      audience: options.audience,
      algorithms: ["RS256"],
    });

    if (protectedHeader.alg !== "RS256") {
      throw new Error("Invalid algorithm: only RS256 allowed");
    }
    if (typeof payload.sub !== "string" || payload.sub.length === 0) {
      throw new Error("Missing sub");
    }

    const email = typeof payload.email === "string" ? payload.email : undefined;
    return { sub: payload.sub, email };
  };
}

export function createRemoteJwksVerifier(opts: {
  issuer: string;
  audience: string;
  jwksUri: string;
}) {
  // Production helper: fetch JWKS via createRemoteJWKSet(new URL(opts.jwksUri))
  // Keep in separate file if preferred (SRP).
}
```

Refine `getKey` signature to match `jose`'s `jwtVerify` key resolver (`JWTVerifyGetKey`). Prefer:

```ts
import { jwtVerify, createRemoteJWKSet } from "jose";

export function createJwtVerifier(options: {
  issuer: string;
  audience: string;
  getKey: Parameters<typeof jwtVerify>[1];
}) {
  return async (token: string): Promise<JwtClaims> => {
    const { payload } = await jwtVerify(token, options.getKey, {
      issuer: options.issuer,
      audience: options.audience,
      algorithms: ["RS256"],
    });
    // ...
  };
}
```

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/auth apps/api/test
git commit -m "$(cat <<'EOF'
Add RS256 access-token verifier with failing-path tests.

Reject wrong audience and non-RS256 algorithms.
EOF
)"
```

---

### Task 5: Auth guard + User upsert + `GET /me` (TDD)

**Files:**
- Create: `apps/api/src/auth/access-token.guard.ts`
- Create: `apps/api/src/auth/current-user.decorator.ts`
- Create: `apps/api/src/auth/auth.module.ts`
- Create: `apps/api/src/users/users.service.ts`
- Create: `apps/api/src/users/me.controller.ts`
- Create: `apps/api/src/users/users.module.ts`
- Create: `apps/api/src/prisma/prisma.service.ts`
- Create: `apps/api/test/me.e2e-spec.ts` (or integration)

**Interfaces:**
- `UsersService.findOrCreateFromClaims(claims: JwtClaims): Promise<User>`
- `GET /me` → `{ id, email, auth0Sub, createdAt, updatedAt }`
- Unauthenticated → 401

- [ ] **Step 1: Failing e2e/integration test**

```ts
it("GET /me without token returns 401", async () => {
  const res = await request(app.getHttpServer()).get("/me");
  expect(res.status).toBe(401);
});

it("GET /me with valid access token returns the user", async () => {
  const token = await signTestAccessToken({ sub: "auth0|me-1", email: "me@example.com" });
  const res = await request(app.getHttpServer())
    .get("/me")
    .set("Authorization", `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.email).toBe("me@example.com");
  expect(res.body.auth0Sub).toBe("auth0|me-1");
});
```

Helper `signTestAccessToken` uses Task 4 keys; app test module overrides verifier `getKey`.

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement guard, users service, me controller** (one concern per file)

Wire global `AccessTokenGuard` (or apply via `APP_GUARD`). On success, upsert user by `auth0Sub`, attach to request.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
Add access-token guard and GET /me with user upsert.

Prove unauthenticated requests are rejected.
EOF
)"
```

---

### Task 6: Collection access policy + collections CRUD (TDD)

**Files:**
- Create: `apps/api/src/access/collection-access.service.ts`
- Create: `apps/api/src/access/collection-access.service.spec.ts`
- Create: `apps/api/src/collections/dto/create-collection.dto.ts`
- Create: `apps/api/src/collections/dto/update-collection.dto.ts`
- Create: `apps/api/src/collections/dto/patch-collection.dto.ts`
- Create: `apps/api/src/collections/collections.service.ts`
- Create: `apps/api/src/collections/collections.controller.ts`
- Create: `apps/api/src/collections/collections.module.ts`
- Create: `apps/api/test/collections.privacy.e2e-spec.ts`

**Interfaces:**
- `assertCanReadCollection(userId, collectionId): Promise<Collection>` — throws NotFoundException if neither owner nor share
- `assertCanWriteCollection(userId, collectionId): Promise<Collection>` — owner only; else NotFoundException (or 403 only if caller already proved read via share — prefer **404** for non-owners who aren't members, **403** for grantee mutate attempts where they can read)

Spec rule: grantee mutate → **403**; stranger → **404**.

```ts
// collection-access.service.ts responsibilities only — no HTTP
async getReadableOrThrow(userId: string, collectionId: string): Promise<Collection> { /* ... */ }
async getWritableOrThrow(userId: string, collectionId: string): Promise<
  | { collection: Collection; denial: null }
  | { collection: null; denial: "not_found" }
  | { collection: Collection; denial: "forbidden" } // shared but not owner
> { /* simplify: throw Nest exceptions from a thin adapter if preferred */ }
```

Prefer throwing domain errors mapped by a filter:

- `NotFoundError` → 404  
- `ForbiddenError` → 403  

- [ ] **Step 1: Unit tests for access policy + e2e privacy**

```ts
it("owner can read and write", async () => { /* ... */ });
it("grantee can read but not write", async () => { /* ... */ });
it("stranger read returns not found", async () => { /* ... */ });
```

E2E:

```ts
it("user B cannot GET user A private collection (404)", async () => { /* ... */ });
it("user B cannot list user A collections", async () => {
  // list only returns B's owned + shared
});
it("DELETE collection nulls bookmark.collectionId and removes shares", async () => { /* ... */ });
```

- [ ] **Step 2: FAIL → implement → PASS**

Controller routes:

- `GET /collections`
- `GET /collections/:id`
- `POST /collections`
- `PUT /collections/:id`
- `PATCH /collections/:id`
- `DELETE /collections/:id`
- `GET /collections/:id/bookmarks`

All guarded. List filters: owned ∪ shared (read).

- [ ] **Step 3: Commit**

```bash
git commit -m "$(cat <<'EOF'
Add collections CRUD with ownership and share-aware reads.

Prove cross-user isolation and delete-nulls-collectionId behavior.
EOF
)"
```

---

### Task 7: Bookmarks CRUD + filters (TDD)

**Files:**
- Create: `apps/api/src/bookmarks/dto/*.ts` (create/update/patch/query)
- Create: `apps/api/src/bookmarks/bookmarks.service.ts`
- Create: `apps/api/src/bookmarks/bookmarks.controller.ts`
- Create: `apps/api/src/bookmarks/bookmarks.module.ts`
- Create: `apps/api/test/bookmarks.privacy.e2e-spec.ts`

**Interfaces:**
- Bookmark always has `ownerId = current user` on create
- If `collectionId` set: must be writable (owned) collection; else 404
- List filter: `?collectionId=`
- Reads: own bookmarks OR bookmarks in a collection shared with user
- Mutations: owner only

- [ ] **Step 1: Failing privacy tests** (isolation + filter + shared collection bookmark readable by grantee)

- [ ] **Step 2: Implement → PASS**

- [ ] **Step 3: Commit**

```bash
git commit -m "$(cat <<'EOF'
Add bookmarks CRUD with collection filters and privacy checks.

Allow grantees to read bookmarks inside shared collections only.
EOF
)"
```

---

### Task 8: Collection shares by email (TDD)

**Files:**
- Create: `apps/api/src/collections/dto/create-share.dto.ts` (`email: string`)
- Create: `apps/api/src/collections/shares.service.ts`
- Create: `apps/api/src/collections/shares.controller.ts` (or nested routes on collections controller — prefer **separate** `shares.controller.ts` mounted at `collections/:id/shares` for SRP)
- Create: `apps/api/test/shares.e2e-spec.ts`

**Interfaces:**
- `POST /collections/:id/shares` body `{ email }` — owner only; resolve user by email; missing → 404
- `GET /collections/:id/shares` — owner only
- `DELETE /collections/:id/shares/:granteeUserId` — owner only
- Grantee then sees collection on `GET /collections` and can `GET` it; PATCH → 403

- [ ] **Step 1: Failing tests for invite / unknown email / grantee read / grantee write denied**

- [ ] **Step 2: Implement → PASS**

- [ ] **Step 3: Update `DECISIONS.md` ADR for share model + 403 vs 404**

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
Add email-based read-only collection sharing.

Reject unknown emails with 404; deny grantee mutations with 403.
EOF
)"
```

---

### Task 9: Swagger + OpenAPI export + Orval `api-client`

**Files:**
- Modify: `apps/api/src/main.ts` — SwaggerModule setup, Bearer auth
- Create: `apps/api/src/scripts/export-openapi.ts` (or nest script)
- Create: `openapi/openapi.json` (generated, committed)
- Create: `orval.config.ts`
- Modify: `packages/api-client/**` generated output
- Modify: root `package.json` `codegen:api`

**Interfaces:**
- Produces: `@bookmark-manager/api-client` exports typed operations + React Query hooks
- Web must import from this package only for API shapes

- [ ] **Step 1: Annotate DTOs/controllers with `@ApiTags`, `@ApiBearerAuth`, `@ApiProperty`**

- [ ] **Step 2: Export OpenAPI JSON**

```ts
// After Nest app init in a one-shot script:
const document = SwaggerModule.createDocument(app, config);
writeFileSync("openapi/openapi.json", JSON.stringify(document, null, 2));
```

- [ ] **Step 3: Orval config**

```ts
import { defineConfig } from "orval";

export default defineConfig({
  bookmark: {
    input: "./openapi/openapi.json",
    output: {
      target: "./packages/api-client/src/generated/endpoints.ts",
      schemas: "./packages/api-client/src/generated/models",
      client: "react-query",
      httpClient: "axios",
      mode: "tags-split",
      override: {
        mutator: {
          path: "./packages/api-client/src/custom-instance.ts",
          name: "customInstance",
        },
      },
    },
  },
});
```

`custom-instance.ts`: axios instance placeholder (baseURL + later Authorization header from web).

- [ ] **Step 4: Run `pnpm codegen:api` — Expected: generated files; package builds**

- [ ] **Step 5: Fill `API_DESIGN.md`** from real routes (status codes, filters, on-delete, privacy enforcement, 2–3 anticipated agent mistakes — update as found)

- [ ] **Step 6: Commit**

```bash
git commit -m "$(cat <<'EOF'
Wire Swagger, export OpenAPI, and generate api-client via Orval.

Make OpenAPI the single source of truth for web types.
EOF
)"
```

---

## Phase C — Step 3: Product UI

### Task 10: `packages/ui` primitives (Button, TextField, PageHeader)

**Files:**
- Create: `packages/ui/src/Button.tsx`
- Create: `packages/ui/src/TextField.tsx`
- Create: `packages/ui/src/PageHeader.tsx`
- Create: `packages/ui/src/Stack.tsx` (layout helper using Tailwind classes)
- Modify: `packages/ui/src/index.ts`
- Optional: Vitest smoke render tests

**Interfaces:**
- Presentational only; wrap MUI; accept standard props; no API imports

- [ ] **Step 1: Implement one component per file; export from index**

- [ ] **Step 2: Lint/typecheck package**

- [ ] **Step 3: Commit**

```bash
git commit -m "$(cat <<'EOF'
Add shared MUI+Tailwind UI primitives package.

Keep presentational components free of API knowledge.
EOF
)"
```

---

### Task 11: Web app scaffold — Auth0 PKCE + Query + Router (port 3000)

**Files:**
- Create: `apps/web/vite.config.ts` (`server.port = 3000`)
- Create: `apps/web/index.html`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/app/AppRouter.tsx`
- Create: `apps/web/src/app/providers/AppProviders.tsx`
- Create: `apps/web/src/lib/http/configure-api-client.ts`
- Create: `apps/web/src/pages/callback/CallbackPage.tsx`
- Create: `apps/web/.env.example`
- Modify: Tailwind + MUI theme setup (`src/styles.css`)

**Interfaces:**
- Auth0 React SDK (`@auth0/auth0-react`) with `authorizationParams.audience` = API audience; `redirect_uri` = `http://localhost:3000/callback`
- `getAccessTokenSilently()` → set axios Authorization on `customInstance`
- Routes: `/collections`, `/bookmarks`, `/callback`

- [ ] **Step 1: Scaffold Vite React-TS; add deps**

`@auth0/auth0-react`, `@tanstack/react-query`, `react-router`, `@mui/material`, `@emotion/react`, `@emotion/styled`, `tailwindcss`, `@bookmark-manager/ui`, `@bookmark-manager/api-client`

- [ ] **Step 2: Wire providers + token mutator**

```ts
// configure-api-client.ts
import { setAccessTokenGetter } from "@bookmark-manager/api-client";

export function configureApiClient(getToken: () => Promise<string>) {
  setAccessTokenGetter(getToken);
}
```

Implement `setAccessTokenGetter` inside `packages/api-client/src/custom-instance.ts` (hand-written, not overwritten by Orval — exclude from generation overwrite).

- [ ] **Step 3: Manual smoke** — login with `candidate@test.com` / `@password1234`, reach `/collections` shell (can be empty page)

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
Scaffold web app with Auth0 PKCE, React Query, and port 3000.

Wire access tokens into the generated axios client.
EOF
)"
```

---

### Task 12: Collections pages (list/create/delete/detail + share)

**Files (split — one responsibility each):**
- `apps/web/src/pages/collections/CollectionsPage.tsx` — route wiring
- `apps/web/src/pages/collections/CollectionsList.tsx` — presentational list
- `apps/web/src/pages/collections/CreateCollectionForm.tsx`
- `apps/web/src/pages/collections/CollectionDetailPage.tsx`
- `apps/web/src/pages/collections/ShareCollectionForm.tsx`
- `apps/web/src/pages/collections/useCollectionsQuery.ts` — thin wrapper if Orval hooks need cache invalidation helpers
- Prefer Orval-generated hooks directly when possible

- [ ] **Step 1: Build UI against generated hooks** (`useGetCollections`, `usePostCollections`, etc. — exact names from Orval output)

- [ ] **Step 2: Share form posts email; show errors for 404 unknown user**

- [ ] **Step 3: Manual verify** create/list/delete/share as candidate; confirm alice-only data never appears without share

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
Add collections UI with create, delete, detail, and share invite.

Compose small page modules on generated React Query hooks.
EOF
)"
```

---

### Task 13: Bookmarks pages (list/detail/create/delete/filter)

**Files:**
- `apps/web/src/pages/bookmarks/BookmarksPage.tsx`
- `apps/web/src/pages/bookmarks/BookmarksList.tsx`
- `apps/web/src/pages/bookmarks/BookmarkDetailPage.tsx`
- `apps/web/src/pages/bookmarks/CreateBookmarkForm.tsx`
- `apps/web/src/pages/bookmarks/CollectionFilter.tsx`

- [ ] **Step 1: Implement with generated hooks + collection filter query param**

- [ ] **Step 2: Manual verify + commit**

```bash
git commit -m "$(cat <<'EOF'
Add bookmarks UI with detail, create, delete, and collection filter.

Keep pages thin and reuse shared UI primitives.
EOF
)"
```

---

### Task 14: README + living docs completion + privacy-review pass

**Files:**
- Modify: `README.md` — setup, env, `pnpm db:up`, migrate, seed, `dev:api`, `dev:web`, `pnpm test`, `pnpm codegen:api`, token rationale one-liner, completed vs skipped, map `apps/api`↔backend / `apps/web`↔frontend
- Modify: `API_DESIGN.md` — finalize contract + 2–3 real agent mistakes found during build
- Modify: `DECISIONS.md` — close ADRs
- Modify: `AI_WORKFLOW.md` — tools/models, decomposition, wins/failures, prompts, cost note
- Add: `transcripts/*.md` (redact secrets) from real sessions
- Run: invoke `/privacy-review` on `apps/api/src` and fix any findings (document invocation in `AI_WORKFLOW.md`)

- [ ] **Step 1: Write README runbook**

Include:

> API Bearer credential: Auth0 access token bound to audience `https://bbl-candidate-test-api`. ID tokens are not accepted — they authenticate the SPA user to Auth0, not the caller to this API.

- [ ] **Step 2: Ensure `pnpm test` and `pnpm lint` pass**

- [ ] **Step 3: Commit**

```bash
git commit -m "$(cat <<'EOF'
Complete README and submission writeups after privacy-review.

Document decisions, workflow, and how to run verification.
EOF
)"
```

- [ ] **Step 4: Push**

```bash
git push origin main
```

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| Step 1 agent rules + `/.agent/` capability | Task 1 |
| Living docs stubs → filled | Tasks 1, 8, 9, 14 |
| Postgres Docker + Prisma | Tasks 2–3 |
| Access token RS256 + tests | Task 4–5 |
| `/me`, collections, bookmarks CRUD + filters + nested bookmarks | Tasks 5–7 |
| Share by email read-only; unknown email 404 | Task 8 |
| Delete collection → null `collectionId` | Task 6 tests |
| Swagger + Orval shared types | Task 9 |
| packages/ui MUI+Tailwind | Task 10 |
| Web Auth0 PKCE, axios, RQ, Router, port 3000 | Task 11–13 |
| TDD / ESLint / SRP / DRY / no Prisma in web | Global + Tasks 2, 4–8 |
| Seed ≥2 users | Task 3 |
| No employer branding | Global |
| Bonuses | Explicitly deferred |

**Placeholder scan:** none intentional — Orval hook names may differ after first codegen; adjust Task 12–13 import names to match generated exports (do not invent parallel types).

**Type consistency:** `JwtClaims.sub` / `email` → `UsersService.findOrCreateFromClaims`; collection access helpers used by collections, bookmarks, and shares services.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-26-bookmark-manager-takehome.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration  
2. **Inline Execution** — execute tasks in this session with executing-plans and checkpoints  

Which approach?
