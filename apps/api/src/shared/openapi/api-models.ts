import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class UserMeResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  auth0Sub!: string;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt!: Date;
}

export class BookmarkResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  url!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  notes!: string | null;

  @ApiProperty({ type: [String] })
  collectionIds!: string[];

  @ApiProperty()
  ownerId!: string;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt!: Date;
}

export class CollectionResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  ownerId!: string;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt!: Date;
}

export class ShareResponse {
  @ApiProperty()
  granteeUserId!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: Date;
}
