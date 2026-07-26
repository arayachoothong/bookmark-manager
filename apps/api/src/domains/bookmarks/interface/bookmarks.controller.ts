import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import type { User } from "@prisma/client";
import { CurrentUser } from "../../auth/interface/current-user.decorator";
import { BookmarksService } from "../application/bookmarks.service";
import type { CreateBookmarkDto } from "./dto/create-bookmark.dto";
import type { PatchBookmarkDto } from "./dto/patch-bookmark.dto";
import type { QueryBookmarksDto } from "./dto/query-bookmarks.dto";
import type { UpdateBookmarkDto } from "./dto/update-bookmark.dto";

@Controller("bookmarks")
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @Get()
  list(@CurrentUser() user: User, @Query() query: QueryBookmarksDto) {
    return this.bookmarksService.listForUser(user, query);
  }

  @Get(":id")
  getOne(@CurrentUser() user: User, @Param("id") id: string) {
    return this.bookmarksService.getOne(user, id);
  }

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateBookmarkDto) {
    return this.bookmarksService.create(user, dto);
  }

  @Put(":id")
  replace(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body() dto: UpdateBookmarkDto,
  ) {
    return this.bookmarksService.replace(user, id, dto);
  }

  @Patch(":id")
  patch(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body() dto: PatchBookmarkDto,
  ) {
    return this.bookmarksService.patch(user, id, dto);
  }

  @Delete(":id")
  async remove(@CurrentUser() user: User, @Param("id") id: string) {
    await this.bookmarksService.remove(user, id);
  }
}
