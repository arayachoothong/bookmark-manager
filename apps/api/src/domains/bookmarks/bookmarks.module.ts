import { Module } from "@nestjs/common";
import { CollectionAccessModule } from "../collections/collection-access.module";
import { PrismaModule } from "../../shared/prisma/prisma.module";
import { BookmarksService } from "./application/bookmarks.service";
import { BookmarksRepository } from "./infrastructure/bookmarks.repository";
import { BookmarksController } from "./interface/bookmarks.controller";

@Module({
  imports: [PrismaModule, CollectionAccessModule],
  controllers: [BookmarksController],
  providers: [BookmarksRepository, BookmarksService],
  exports: [BookmarksService],
})
export class BookmarksModule {}
