import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";

import { useOwnedCollections } from "../hooks/useOwnedCollections";

type AssignBookmarkFieldsProps = {
  value: string;
  onChange: (collectionId: string) => void;
  currentUserId?: string;
  disabled?: boolean;
};

export function AssignBookmarkFields({
  value,
  onChange,
  currentUserId,
  disabled,
}: AssignBookmarkFieldsProps) {
  const { ownedCollections, isLoading } = useOwnedCollections(currentUserId);

  return (
    <FormControl size="small" fullWidth disabled={disabled || isLoading}>
      <InputLabel id="assign-bookmark-collection-label">Collection</InputLabel>
      <Select
        labelId="assign-bookmark-collection-label"
        label="Collection"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <MenuItem value="">None</MenuItem>
        {ownedCollections.map((collection) => (
          <MenuItem key={collection.id} value={collection.id}>
            {collection.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
