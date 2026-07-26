export enum BookmarkAccessRole {
  Owner = "owner",
  Viewer = "viewer",
}

export function bookmarkAccessRole(
  currentUserId: string | undefined,
  ownerId: string,
): BookmarkAccessRole {
  return currentUserId === ownerId
    ? BookmarkAccessRole.Owner
    : BookmarkAccessRole.Viewer;
}
