# /privacy-review

Audit the current diff (or named paths) for privacy violations:

1. Any Prisma/query path on Collection or Bookmark missing ownerId OR active CollectionShare for the current user on **reads**.
2. Any **mutation** that does not require ownership.
3. Any get-by-id that returns 403 instead of 404 for non-members.
4. Any frontend type that duplicates OpenAPI DTOs instead of importing `@bookmark-manager/api-client`.

Output: file:line findings + required fix. Do not rewrite unrelated code.
