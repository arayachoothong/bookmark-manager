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
import { BookmarksService } from "../../bookmarks/application/bookmarks.service";
import {
  BookmarkResponse,
  CollectionResponse,
} from "../../../shared/openapi/api-models";
import { CollectionsService } from "../application/collections.service";
import { AddBookmarksToCollectionDto } from "./dto/add-bookmarks-to-collection.dto";
import { CreateCollectionDto } from "./dto/create-collection.dto";
import { PatchCollectionDto } from "./dto/patch-collection.dto";
import { QueryCollectionsDto } from "./dto/query-collections.dto";
import { UpdateCollectionDto } from "./dto/update-collection.dto";

@ApiTags("collections")
@ApiBearerAuth("access-token")
@Controller("collections")
export class CollectionsController {
  constructor(
    private readonly collectionsService: CollectionsService,
    private readonly bookmarksService: BookmarksService,
  ) {}

  @Get()
  @ApiQuery({ name: "q", required: false })
  @ApiOperation({ summary: "List collections readable by the caller" })
  @ApiOkResponse({ type: CollectionResponse, isArray: true })
  list(
    @CurrentUser() user: User,
    @Query() query: QueryCollectionsDto,
  ) {
    return this.collectionsService.listForUser(user, query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get one collection" })
  @ApiOkResponse({ type: CollectionResponse })
  getOne(@CurrentUser() user: User, @Param("id") id: string) {
    return this.collectionsService.getOne(user, id);
  }

  @Post()
  @ApiOperation({ summary: "Create a collection" })
  @ApiOkResponse({ type: CollectionResponse })
  create(@CurrentUser() user: User, @Body() dto: CreateCollectionDto) {
    return this.collectionsService.create(user, dto);
  }

  @Put(":id")
  @ApiOperation({ summary: "Replace a collection" })
  @ApiOkResponse({ type: CollectionResponse })
  replace(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body() dto: UpdateCollectionDto,
  ) {
    return this.collectionsService.replace(user, id, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Partially update a collection" })
  @ApiOkResponse({ type: CollectionResponse })
  patch(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body() dto: PatchCollectionDto,
  ) {
    return this.collectionsService.patch(user, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a collection" })
  async remove(@CurrentUser() user: User, @Param("id") id: string) {
    await this.collectionsService.remove(user, id);
  }

  @Get(":id/bookmarks")
  @ApiOperation({ summary: "List bookmarks in a collection" })
  @ApiOkResponse({ type: BookmarkResponse, isArray: true })
  listBookmarks(@CurrentUser() user: User, @Param("id") id: string) {
    return this.collectionsService.listBookmarks(user, id);
  }

  @Post(":id/bookmarks")
  async addBookmarks(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body() dto: AddBookmarksToCollectionDto,
  ) {
    await this.bookmarksService.addToCollection(user, id, dto.bookmarkIds);
  }

  @Delete(":id/bookmarks/:bookmarkId")
  async removeBookmark(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Param("bookmarkId") bookmarkId: string,
  ) {
    await this.bookmarksService.removeFromCollection(user, id, bookmarkId);
  }
}
