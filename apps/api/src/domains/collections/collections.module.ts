import { Module } from "@nestjs/common";
import { BookmarksModule } from "../bookmarks/bookmarks.module";
import { CollectionsService } from "./application/collections.service";
import { CollectionAccessModule } from "./collection-access.module";
import { CollectionsController } from "./interface/collections.controller";

@Module({
  imports: [CollectionAccessModule, BookmarksModule],
  controllers: [CollectionsController],
  providers: [CollectionsService],
  exports: [CollectionAccessModule],
})
export class CollectionsModule {}
