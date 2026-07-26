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
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import type { User } from "@prisma/client";
import { CurrentUser } from "../../auth/interface/current-user.decorator";
import { BookmarkResponse } from "../../../shared/openapi/api-models";
import { BookmarksService } from "../application/bookmarks.service";
import { CreateBookmarkDto } from "./dto/create-bookmark.dto";
import { PatchBookmarkDto } from "./dto/patch-bookmark.dto";
import { QueryBookmarksDto } from "./dto/query-bookmarks.dto";
import { UpdateBookmarkDto } from "./dto/update-bookmark.dto";

@ApiTags("bookmarks")
@ApiBearerAuth("access-token")
@Controller("bookmarks")
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @Get()
  @ApiOperation({ summary: "List bookmarks readable by the caller" })
  @ApiQuery({ name: "collectionId", required: false })
  @ApiOkResponse({ type: BookmarkResponse, isArray: true })
  list(@CurrentUser() user: User, @Query() query: QueryBookmarksDto) {
    return this.bookmarksService.listForUser(user, query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get one bookmark" })
  @ApiOkResponse({ type: BookmarkResponse })
  getOne(@CurrentUser() user: User, @Param("id") id: string) {
    return this.bookmarksService.getOne(user, id);
  }

  @Post()
  @ApiOperation({ summary: "Create a bookmark" })
  @ApiOkResponse({ type: BookmarkResponse })
  create(@CurrentUser() user: User, @Body() dto: CreateBookmarkDto) {
    return this.bookmarksService.create(user, dto);
  }

  @Put(":id")
  @ApiOperation({ summary: "Replace a bookmark" })
  @ApiOkResponse({ type: BookmarkResponse })
  replace(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body() dto: UpdateBookmarkDto,
  ) {
    return this.bookmarksService.replace(user, id, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Partially update a bookmark" })
  @ApiOkResponse({ type: BookmarkResponse })
  patch(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body() dto: PatchBookmarkDto,
  ) {
    return this.bookmarksService.patch(user, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a bookmark" })
  async remove(@CurrentUser() user: User, @Param("id") id: string) {
    await this.bookmarksService.remove(user, id);
  }
}
