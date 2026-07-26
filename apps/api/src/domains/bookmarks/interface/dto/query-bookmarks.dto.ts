import { ApiPropertyOptional } from "@nestjs/swagger";

export class QueryBookmarksDto {
  @ApiPropertyOptional({
    description: "Case-insensitive contains match on title",
  })
  q?: string;

  @ApiPropertyOptional({
    description: "Filter to bookmarks in a collection the caller can read",
  })
  collectionId?: string;
}
