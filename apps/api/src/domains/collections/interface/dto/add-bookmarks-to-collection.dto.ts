import { ApiProperty } from "@nestjs/swagger";

export class AddBookmarksToCollectionDto {
  @ApiProperty({ type: [String] })
  bookmarkIds!: string[];
}
