import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateBookmarkDto {
  @ApiProperty()
  url!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  collectionIds?: string[];
}
