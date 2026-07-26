import { ApiPropertyOptional } from "@nestjs/swagger";

export class QueryCollectionsDto {
  @ApiPropertyOptional({
    description: "Case-insensitive contains match on name",
  })
  q?: string;
}
