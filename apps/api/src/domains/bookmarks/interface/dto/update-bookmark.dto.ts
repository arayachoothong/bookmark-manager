import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateBookmarkDto {
  @ApiProperty()
  url!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  notes?: string | null;

  @ApiPropertyOptional({ type: [String] })
  collectionIds?: string[];
}
