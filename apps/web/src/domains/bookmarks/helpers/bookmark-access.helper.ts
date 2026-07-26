import { BookmarkAccessRole } from "../constants/bookmark-access.constant";

export function bookmarkAccessRole(
  currentUserId: string | undefined,
  ownerId: string,
): BookmarkAccessRole {
  return currentUserId === ownerId
    ? BookmarkAccessRole.Owner
    : BookmarkAccessRole.Viewer;
}
