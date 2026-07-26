import { ApiPropertyOptional } from "@nestjs/swagger";

export class QueryBookmarksDto {
  @ApiPropertyOptional({
    description: "Filter bookmarks to a collection the caller can read",
  })
  collectionId?: string;
}
