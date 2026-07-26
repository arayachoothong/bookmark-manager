# Bookmark Manager Take-Home — Design Spec

**Date:** 2026-07-26  
**Location:** `/Users/anythingfons/Documents/bookmark-manager`  
**Delivery approach:** Strict three-step sequence (agent setup → architecture/verification → product)

## 1. Goal

Build a private read-later bookmark manager: a signed-in person saves links, organises them into collections, and — by default — nobody else can see, edit, or learn that another user’s data exists.

The submission is graded primarily on how well AI coding agents are driven, verified, and reasoned about — not on CRUD speed. Only a small portion of the score is “the app runs.” Ship a smaller, honest, well-verified repo over a large undefendable one.

**Public naming rule:** Do not mention employer or bank brand names in the repo, README, commit messages, or docs intended for the public GitHub submission. Describe the work as a private bookmark manager take-home.

## 2. Delivery spine (three steps)

Work proceeds in strict order. Do not start Step N+1 until Step N’s success check passes.

### Step 1 — AI track (steer first)

Write agent rules and one reusable agent capability first. Leave workflow/transcripts/decisions as living docs filled during Steps 2–3.

**Ship:**

- `CLAUDE.md` and `AGENTS.md` — product invariants, stack constraints, auth rules, OpenAPI-as-contract + codegen rules, “every security claim needs a test”
- `/.agent/` — at least one capability genuinely used (e.g. `/privacy-review` command that audits data-access for missing owner/share checks)
- Thin Cursor mirror (`.cursor/rules` or equivalent) pointing at the same invariants
- Stub living files: `AI_WORKFLOW.md`, `DECISIONS.md`, `API_DESIGN.md`, `transcripts/.gitkeep`, skeleton `README.md`

**Deferred:** filled narrative, real transcripts, full API contract body, application code.

**Success check:** A fresh agent session, given only the repo rules, refuses unsafe patterns (e.g. listing bookmarks with no owner filter) and knows the stack and token choice.

### Step 2 — Architecture and code rules

Lock auth, privacy, data model, API contract, and a verification harness before building the full UI.

**Ship:**

- Auth and token validation design (documented + testable)
- Prisma schema + Postgres (Docker Compose)
- NestJS **Swagger / OpenAPI** wired; export OpenAPI document
- Codegen pipeline into `packages/api-client` (shared types + typed HTTP client)
- `API_DESIGN.md` filled with contract and privacy enforcement notes (aligned with OpenAPI)
- First ADRs in `DECISIONS.md`
- Automated tests proving ownership isolation, share read-only, non-member 404, owner-only mutations, collection-delete nulls `collectionId`

**Success check:** Privacy/security tests are runnable and green against the API layer (with documented Auth0 mock boundary if used). Regenerating the client from OpenAPI succeeds and `apps/web` imports types only from `packages/api-client` (no hand-copied DTO interfaces).

### Step 3 — Real product

End-to-end app: Auth0 login, CRUD, share invite UI, seed data, meaningful commit history, real transcripts.

**Success check:** Login → CRUD → read-only share → privacy tests green → README lists completed vs skipped.

## 3. Monorepo structure

```
bookmark-manager/
  apps/
    api/                 # NestJS + TypeScript + Prisma + Swagger
    web/                 # React + Vite + TypeScript
  packages/
    ui/                  # shared UI: MUI + Tailwind-friendly primitives
    api-client/          # generated from OpenAPI: types + axios client (+ RQ hooks)
  CLAUDE.md
  AGENTS.md
  .agent/
  .cursor/               # day-to-day Cursor rules (optional thin layer)
  API_DESIGN.md
  DECISIONS.md
  AI_WORKFLOW.md
  transcripts/
  README.md
  docker-compose.yml     # PostgreSQL
  package.json           # pnpm workspace (+ turbo if useful)
  pnpm-workspace.yaml
```

- Workspace tool: **pnpm** workspaces (Turbo optional for scripts).
- Graders’ expected top-level names (`backend` / `frontend`) may be mapped in README as `apps/api` and `apps/web`; do not invent a second copy of the apps.

### 3.1 OpenAPI + codegen (shared contract)

**Source of truth:** NestJS controllers/DTOs annotated with `@nestjs/swagger`. The running API exposes Swagger UI (dev) and an OpenAPI JSON document (e.g. `/api-json` or a committed `openapi.json` exported in CI/scripts).

**Codegen:** A workspace script (e.g. `pnpm codegen:api`) runs **Orval** (or equivalent) against that OpenAPI document and writes into `packages/api-client`:

- TypeScript types for request/response bodies and query params
- Typed **axios** client functions
- Optional **TanStack Query** hooks (`useQuery` / `useMutation` wrappers) so `apps/web` does not re-declare the same shapes

**Rules:**

1. `apps/web` must not hand-maintain parallel DTO interfaces for API payloads — import from `@bookmark-manager/api-client`.
2. Prisma models are **not** shared to the frontend. The public contract is OpenAPI DTOs only (keeps persistence details private).
3. After any API contract change: update Nest DTOs/Swagger → regenerate client → fix compile errors in web.
4. Generated output is committed (or regenerated in `predev`/`CI`) so reviewers can build without hunting a live server; README documents the command either way.
5. Agent rules must say: never invent frontend types that diverge from OpenAPI; run codegen instead.

**Why Orval:** matches the chosen frontend stack (axios + TanStack Query) in one pipeline; types stay in lockstep with Swagger.

## 4. Product requirements

### 4.1 Privacy invariant

Everything is private to the creator unless an explicit share exists.

- Default: every collection/bookmark query is scoped to the current user as **owner**.
- Exception: invitees see shared collections as **read-only** (list/get + nested bookmarks).
- Non-members: **404** on get-by-id (not 403) so existence is not leaked.
- Mutations (create/update/patch/delete, share management): **owner only**.

### 4.2 Under-specified requirement (§ collections / delete / share)

Resolved as follows:

| Topic | Decision |
| --- | --- |
| Share | Implement minimal path: invite by **email** → grantee gets **read-only** access to that collection and its bookmarks |
| Collection delete | Bookmarks are **kept**; `collectionId` set to `null`. Shares cascade-deleted |
| Not in v1 | Edit rights for collaborators, public links, nested roles |

### 4.3 Backend (`apps/api`)

1. Node.js + TypeScript; NestJS HTTP layer.
2. OIDC on every route against the provided Auth0 tenant.
3. Authorization Code flow with PKCE (S256). No implicit flow for the app’s primary path.
4. Resources `/collections` and `/bookmarks`: get one, list, create, update (PUT), patch (PATCH), delete, filtering. Plus `/me`. Plus `GET /collections/:id/bookmarks`.
5. Sharing endpoints (owner): create share by email, list shares, revoke share.
6. SQL persistence via **Prisma** on **PostgreSQL** (Docker).
7. Seed data for **at least two distinct users** (second user may exist only as seed for isolation/share tests if only one Auth0 login is interactive).
8. **Swagger / OpenAPI** via `@nestjs/swagger`: document all public routes, DTOs, auth bearer scheme, and error shapes. Swagger UI enabled in local/dev. OpenAPI document is the input to client codegen.

### 4.4 Auth / token choice

Inspect the tenant discovery document and JWKS before implementing. Observed facts used in this design:

- PKCE `S256` is supported; `token_endpoint_auth_methods_supported` includes `none` (public SPA client OK).
- JWKS publishes RS256 keys; discovery also lists HS256 for ID token signing — treat algorithm confusion as a real risk if ID tokens were accepted as API credentials.
- An API audience is provided so Auth0 can mint a JWT access token for the API.

**API Bearer credential:** Auth0 **access token** requested with the assignment’s API audience (`https://bbl-candidate-test-api`).

Validate via JWKS with:

- Strict `iss`, `aud`, `exp`
- **Algorithms allowlist: RS256 only** (reject HS256 / `none`)

One-line rationale for README: *Access tokens are audience-bound to the API; ID tokens are authentication receipts for the SPA client and are the wrong credential for authorization.*

Map token `sub` (and email as needed) to local `User`. `/me` returns the current signed-in person.

Config values (from the brief; keep in env, not hardcoded in docs beyond what’s needed to run):

| Key | Value |
| --- | --- |
| Discovery | `https://dev-yg.us.auth0.com/.well-known/openid-configuration` |
| Client ID | `H9F6QG5SzTKMv0tbmgxLj9LjG1EKVllA` |
| Callback | `http://localhost:3000/callback` |
| Logout | `http://localhost:3000` |
| Scope | `openid profile email` |
| API Audience | `https://bbl-candidate-test-api` (Auth0 API identifier from the assignment config; not product branding) |
| Test user | `candidate@test.com` / `@password1234` |

### 4.5 Data model

- **User** — `id`, `auth0Sub`, `email`, timestamps
- **Collection** — `id`, `name`, `ownerId`, timestamps
- **Bookmark** — `id`, `url`, `title`, `notes?`, `collectionId?`, `ownerId`, timestamps
- **CollectionShare** — `collectionId`, `granteeUserId`, `createdAt`; unique `(collectionId, granteeUserId)`

A bookmark’s `collectionId` is nullable (uncategorised). Both resources belong to a person (`ownerId`). Sharing does not transfer ownership.

**Share invite resolution:** `POST .../shares` accepts an email. Look up an existing `User` by email. If no user exists, return **404** with a generic message (do not create placeholder accounts in v1). This fits the seeded two-user test strategy and keeps the privacy model simple.

### 4.6 Frontend (`apps/web`)

1. React + Vite + TypeScript (no Next.js).
2. React Router ≥ v8.
3. MUI ≥ v9 for interactive components; **Tailwind** for layout/spacing utilities.
4. **axios** HTTP client with auth header interceptor (access token) — prefer the generated client from `@bookmark-manager/api-client`, configured once with the interceptor.
5. **TanStack Query** — `useQuery` / `useMutation` for list, detail, create, delete, share flows; prefer Orval-generated hooks where available, thin app wrappers only for UI-specific cache keys/invalidation.
6. Dev server listens on **port 3000** so Auth0 callback/logout URLs match the brief (`http://localhost:3000`).
7. Pages:
   - `/collections` — list, view one, create, delete; share-invite UI for collections you own
   - `/bookmarks` — list, detail, create, delete, filter by collection
8. Integrates with `apps/api` using the access token and **generated** request/response types only.

### 4.7 Shared UI (`packages/ui`)

- Presentational only — no API calls, no auth knowledge.
- MUI-based primitives + Tailwind-friendly composition helpers.
- Apps import via a workspace package name (e.g. `@bookmark-manager/ui`).
- Do not duplicate button/input/dialog patterns inside `apps/web`.

### 4.8 Shared API client (`packages/api-client`)

- Generated package; do not hand-edit generated files (edit Nest DTOs/Swagger, then regenerate).
- Exports types + axios-based API functions (+ React Query hooks if Orval is configured for them).
- Consumed by `apps/web`; may also be used by API e2e helpers if useful, but Prisma remains the server’s persistence model.

### 4.9 Optional bonuses (after Steps 1–3 are solid)

Dockerfile(s), CI pipeline, `/all` page, full-text search. Modelling collections↔bookmarks is core, not a bonus.

## 5. Agent tooling

**Primary day-to-day:** Cursor (rules + this monorepo).  
**Graded agent surface:** `CLAUDE.md` / `AGENTS.md` + `/.agent/` with at least one reusable capability that was actually invoked during the build.

Dual setup must stay consistent: Cursor rules and CLAUDE/AGENTS must not contradict on privacy, token choice, or stack.

## 6. Verification harness

Runnable proof of claims — especially security:

1. User A cannot list/get/mutate User B’s private collections or bookmarks.
2. Shared collection: grantee can read; grantee cannot mutate; non-member gets 404.
3. Collection delete: bookmarks retained with `collectionId = null`; shares removed.
4. Unauthenticated requests rejected.
5. Token validation rejects wrong `aud` / wrong algorithm when tested.

Prefer API/integration tests against real Postgres in Docker. If Auth0 verification is mocked in tests, document the mock boundary in README and keep the real validation path exercised in the running app.

What is *not* tested is also a judgment signal — document intentional gaps in README or `AI_WORKFLOW.md`.

## 7. Submission artifacts

Required at submit time (filled progressively):

| Artifact | Role |
| --- | --- |
| Agent rules (`CLAUDE.md` / `AGENTS.md`) | Fresh session produces on-spec code |
| `/.agent/` | One real reusable capability + when/why used |
| `API_DESIGN.md` | Contract, on-delete, privacy enforcement; 2–3 agent mistakes corrected |
| `DECISIONS.md` | ADR-style: ambiguities, choices, trade-offs, how agent was steered |
| Automated tests | Reviewer can run them |
| `AI_WORKFLOW.md` | Tools/models, decomposition, wins/failures, prompts, cost awareness |
| `transcripts/` | Real session logs; redact secrets only |
| `README.md` | Run/test steps; completed vs skipped |
| Commit history | Meaningful steps; do not squash into one “initial commit” |

## 8. Error handling (API)

- Uniform error response shape (document in `API_DESIGN.md`).
- Auth failures: 401.
- Authenticated but not allowed to mutate: 403 for “you know it exists but cannot change it” (e.g. grantee PATCH); **404** when the resource must not be acknowledged.
- Validation errors: 400 with field details.
- Missing related collection on bookmark create/update: 400 or 404 per contract — pick one in Step 2 and stick to it (prefer 400 if body invalid, 404 if referenced collection is not visible to the caller).

## 9. Out of scope

- Next.js
- Implicit OAuth flow as the primary app path
- Accepting ID tokens as API Bearer credentials
- Public/unauthenticated browsing of any user content
- Share-by-link without an account
- Employer/bank branding in the public repository
- Sharing Prisma models/types directly to the frontend (OpenAPI DTOs + codegen only)

## 10. Success criteria

- Three-step delivery followed; agent setup precedes product polish.
- Privacy invariant proven by automated tests.
- Access-token + RS256 allowlist defended in README and understandably in person.
- Monorepo runs: Postgres up, API authenticated, web login + collections/bookmarks + read-only share.
- Swagger documents the API; `pnpm codegen:api` (or documented equivalent) regenerates `packages/api-client`; web compiles against generated types.
- Submission writeups match the committed code and real transcripts.
