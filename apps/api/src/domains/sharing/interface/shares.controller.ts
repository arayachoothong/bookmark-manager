import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type { User } from "@prisma/client";
import { CurrentUser } from "../../auth/interface/current-user.decorator";
import { ShareResponse } from "../../../shared/openapi/api-models";
import { SharesService } from "../application/shares.service";
import type { CreateShareDto } from "./dto/create-share.dto";

@ApiTags("shares")
@ApiBearerAuth("access-token")
@Controller("collections/:collectionId/shares")
export class SharesController {
  constructor(private readonly sharesService: SharesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Share a collection read-only by email" })
  @ApiCreatedResponse({ type: ShareResponse })
  create(
    @CurrentUser() user: User,
    @Param("collectionId") collectionId: string,
    @Body() dto: CreateShareDto,
  ) {
    return this.sharesService.create(user, collectionId, dto);
  }

  @Get()
  @ApiOperation({ summary: "List shares on a collection (owner only)" })
  @ApiOkResponse({ type: ShareResponse, isArray: true })
  list(
    @CurrentUser() user: User,
    @Param("collectionId") collectionId: string,
  ) {
    return this.sharesService.list(user, collectionId);
  }

  @Delete(":granteeUserId")
  @ApiOperation({ summary: "Revoke a share" })
  async revoke(
    @CurrentUser() user: User,
    @Param("collectionId") collectionId: string,
    @Param("granteeUserId") granteeUserId: string,
  ) {
    await this.sharesService.revoke(user, collectionId, granteeUserId);
  }
}
