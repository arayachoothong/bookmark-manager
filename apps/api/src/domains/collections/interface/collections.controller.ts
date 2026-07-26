import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from "@nestjs/common";
import type { User } from "@prisma/client";
import { CurrentUser } from "../../auth/interface/current-user.decorator";
import { CollectionsService } from "../application/collections.service";
import type { CreateCollectionDto } from "./dto/create-collection.dto";
import type { PatchCollectionDto } from "./dto/patch-collection.dto";
import type { UpdateCollectionDto } from "./dto/update-collection.dto";

@Controller("collections")
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Get()
  list(@CurrentUser() user: User) {
    return this.collectionsService.listForUser(user);
  }

  @Get(":id")
  getOne(@CurrentUser() user: User, @Param("id") id: string) {
    return this.collectionsService.getOne(user, id);
  }

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateCollectionDto) {
    return this.collectionsService.create(user, dto);
  }

  @Put(":id")
  replace(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body() dto: UpdateCollectionDto,
  ) {
    return this.collectionsService.replace(user, id, dto);
  }

  @Patch(":id")
  patch(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body() dto: PatchCollectionDto,
  ) {
    return this.collectionsService.patch(user, id, dto);
  }

  @Delete(":id")
  async remove(@CurrentUser() user: User, @Param("id") id: string) {
    await this.collectionsService.remove(user, id);
  }

  @Get(":id/bookmarks")
  listBookmarks(@CurrentUser() user: User, @Param("id") id: string) {
    return this.collectionsService.listBookmarks(user, id);
  }
}
