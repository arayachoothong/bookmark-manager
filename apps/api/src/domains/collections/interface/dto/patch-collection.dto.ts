import { ApiPropertyOptional } from "@nestjs/swagger";

export class PatchCollectionDto {
  @ApiPropertyOptional()
  name?: string;
}
