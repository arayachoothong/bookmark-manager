# Session notes — foundation (Tasks 1–3)

_Synthesized from SDD reports; not verbatim chat logs. Secrets redacted._

## Goals

- Agent rules (`CLAUDE.md`, `AGENTS.md`, Cursor rules)
- Living doc stubs, privacy-review command
- Monorepo, Docker Postgres on host **5433**, Prisma schema, migrate, seed

## Outcomes

- Planned ADRs and API design skeleton committed.
- Postgres + two seeded users for share/bookmark scenarios.
- ESLint flat config introduced for the monorepo.

## Notes

- Public docs avoid employer/bank branding per spec.
- Auth0 test tenant values live in `.env.example` only (`[REDACTED]` if copied elsewhere).
