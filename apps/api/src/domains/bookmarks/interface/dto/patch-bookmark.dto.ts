import { ApiPropertyOptional } from "@nestjs/swagger";

export class PatchBookmarkDto {
  @ApiPropertyOptional()
  url?: string;

  @ApiPropertyOptional()
  title?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  description?: string | null;

  @ApiPropertyOptional({ type: [String] })
  collectionIds?: string[];
}
