export enum CollectionAccessRole {
  Owner = "owner",
  Viewer = "viewer",
}

export function collectionAccessRole(
  currentUserId: string | undefined,
  ownerId: string,
): CollectionAccessRole {
  return currentUserId === ownerId
    ? CollectionAccessRole.Owner
    : CollectionAccessRole.Viewer;
}
