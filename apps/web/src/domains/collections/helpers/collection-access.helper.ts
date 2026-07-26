import { CollectionAccessRole } from "../constants/collection-access.constant";

export function collectionAccessRole(
  currentUserId: string | undefined,
  ownerId: string,
): CollectionAccessRole {
  return currentUserId === ownerId
    ? CollectionAccessRole.Owner
    : CollectionAccessRole.Viewer;
}
