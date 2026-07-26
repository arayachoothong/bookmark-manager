import { TextField } from "@bookmark-manager/ui";

interface CollectionsSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function CollectionsSearchField({
  value,
  onChange,
}: CollectionsSearchFieldProps) {
  return (
    <TextField
      label="Search collections"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
