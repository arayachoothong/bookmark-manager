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
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type { User } from "@prisma/client";
import { CurrentUser } from "../../auth/interface/current-user.decorator";
import {
  BookmarkResponse,
  CollectionResponse,
} from "../../../shared/openapi/api-models";
import { CollectionsService } from "../application/collections.service";
import type { CreateCollectionDto } from "./dto/create-collection.dto";
import type { PatchCollectionDto } from "./dto/patch-collection.dto";
import type { UpdateCollectionDto } from "./dto/update-collection.dto";

@ApiTags("collections")
@ApiBearerAuth("access-token")
@Controller("collections")
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Get()
  @ApiOperation({ summary: "List collections readable by the caller" })
  @ApiOkResponse({ type: CollectionResponse, isArray: true })
  list(@CurrentUser() user: User) {
    return this.collectionsService.listForUser(user);
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
}
