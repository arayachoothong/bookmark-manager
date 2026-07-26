import { ApiProperty } from "@nestjs/swagger";

export class CreateShareDto {
  @ApiProperty({ description: "Existing user email to grant read access" })
  email!: string;
}
