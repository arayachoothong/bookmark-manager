import { TextField } from "@bookmark-manager/ui";

interface BookmarksSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function BookmarksSearchField({
  value,
  onChange,
}: BookmarksSearchFieldProps) {
  return (
    <TextField
      label="Search bookmarks"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
