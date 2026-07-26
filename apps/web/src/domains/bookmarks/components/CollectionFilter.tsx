import type { CollectionResponse } from "@bookmark-manager/api-client";
import { Stack } from "@bookmark-manager/ui";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { useSearchParams } from "react-router";

type CollectionFilterProps = {
  collections: CollectionResponse[];
  disabled?: boolean;
};

export function CollectionFilter({
  collections,
  disabled,
}: CollectionFilterProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const collectionId = searchParams.get("collectionId") ?? "";

  function handleChange(next: string) {
    const params = new URLSearchParams(searchParams);
    if (next) {
      params.set("collectionId", next);
    } else {
      params.delete("collectionId");
    }
    setSearchParams(params, { replace: true });
  }

  return (
    <Stack className="max-w-md">
      <FormControl size="small" disabled={disabled}>
        <InputLabel id="bookmark-collection-filter-label">
          Filter by collection
        </InputLabel>
        <Select
          labelId="bookmark-collection-filter-label"
          label="Filter by collection"
          value={collectionId}
          onChange={(event) => handleChange(event.target.value)}
        >
          <MenuItem value="">All collections</MenuItem>
          {collections.map((collection) => (
            <MenuItem key={collection.id} value={collection.id}>
              {collection.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}

export function useBookmarkCollectionFilterParam(): string | undefined {
  const [searchParams] = useSearchParams();
  const collectionId = searchParams.get("collectionId");
  return collectionId && collectionId.length > 0 ? collectionId : undefined;
}
