# Session notes — API + privacy (Tasks 4–8)

_Synthesized from SDD reports; not verbatim chat logs._

## Goals

- RS256 JWT verifier (TDD), global access-token guard, `/me` upsert
- Collections and bookmarks CRUD with centralized `CollectionAccessService`
- Email-based read-only shares; unknown invitee → 404

## Outcomes

- Unit tests for JWT paths; e2e privacy suites for collections, bookmarks, shares.
- ADRs accepted for share model and 404 vs 403 split.
- **21/21** API e2e passing with Postgres up.

## Mistakes caught

- Early temptation to return 403 for unknown collection IDs — corrected to 404 for non-members.
- Share grantees must not pass write checks on PATCH/DELETE (403 when read access exists).
