export type UpdateBookmarkDto = {
  url: string;
  title: string;
  notes?: string | null;
  collectionId?: string | null;
};
