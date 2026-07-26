import { BookmarkCollectionsField } from "./BookmarkCollectionsField";

type AssignBookmarkFieldsProps = {
  value: string[];
  onChange: (collectionIds: string[]) => void;
  currentUserId?: string;
  disabled?: boolean;
};

export function AssignBookmarkFields({
  value,
  onChange,
  currentUserId,
  disabled,
}: AssignBookmarkFieldsProps) {
  return (
    <BookmarkCollectionsField
      value={value}
      onChange={onChange}
      currentUserId={currentUserId}
      disabled={disabled}
    />
  );
}
