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
import type { User } from "@prisma/client";
import { CurrentUser } from "../../auth/interface/current-user.decorator";
import { SharesService } from "../application/shares.service";
import type { CreateShareDto } from "./dto/create-share.dto";

@Controller("collections/:collectionId/shares")
export class SharesController {
  constructor(private readonly sharesService: SharesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: User,
    @Param("collectionId") collectionId: string,
    @Body() dto: CreateShareDto,
  ) {
    return this.sharesService.create(user, collectionId, dto);
  }

  @Get()
  list(
    @CurrentUser() user: User,
    @Param("collectionId") collectionId: string,
  ) {
    return this.sharesService.list(user, collectionId);
  }

  @Delete(":granteeUserId")
  async revoke(
    @CurrentUser() user: User,
    @Param("collectionId") collectionId: string,
    @Param("granteeUserId") granteeUserId: string,
  ) {
    await this.sharesService.revoke(user, collectionId, granteeUserId);
  }
}
