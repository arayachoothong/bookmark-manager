import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import { useId } from "react";

import { useOwnedCollections } from "../hooks/useOwnedCollections";

type BookmarkCollectionsFieldProps = {
  value: string[];
  onChange: (collectionIds: string[]) => void;
  currentUserId?: string;
  disabled?: boolean;
};

export function BookmarkCollectionsField({
  value,
  onChange,
  currentUserId,
  disabled,
}: BookmarkCollectionsFieldProps) {
  const labelId = useId();
  const { ownedCollections, isLoading } = useOwnedCollections(currentUserId);

  function handleChange(event: SelectChangeEvent<string[]>) {
    const nextValue = event.target.value;
    onChange(
      typeof nextValue === "string" ? nextValue.split(",") : nextValue,
    );
  }

  return (
    <FormControl size="small" fullWidth disabled={disabled || isLoading}>
      <InputLabel id={labelId}>Collections</InputLabel>
      <Select
        multiple
        labelId={labelId}
        label="Collections"
        value={value}
        onChange={handleChange}
        renderValue={(selected) =>
          ownedCollections
            .filter((collection) => selected.includes(collection.id))
            .map((collection) => collection.name)
            .join(", ")
        }
      >
        {ownedCollections.map((collection) => (
          <MenuItem key={collection.id} value={collection.id}>
            {collection.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
