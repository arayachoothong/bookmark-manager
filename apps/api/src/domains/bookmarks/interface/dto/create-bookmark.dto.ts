import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateBookmarkDto {
  @ApiProperty()
  url!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional()
  collectionId?: string;
}
