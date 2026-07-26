import { ApiPropertyOptional } from "@nestjs/swagger";

export class PatchBookmarkDto {
  @ApiPropertyOptional()
  url?: string;

  @ApiPropertyOptional()
  title?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  notes?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  collectionId?: string | null;
}
