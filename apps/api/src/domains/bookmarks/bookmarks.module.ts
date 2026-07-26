import { Module } from "@nestjs/common";
import { CollectionsModule } from "../collections/collections.module";
import { PrismaModule } from "../../shared/prisma/prisma.module";
import { BookmarksService } from "./application/bookmarks.service";
import { BookmarksRepository } from "./infrastructure/bookmarks.repository";
import { BookmarksController } from "./interface/bookmarks.controller";

@Module({
  imports: [PrismaModule, CollectionsModule],
  controllers: [BookmarksController],
  providers: [BookmarksRepository, BookmarksService],
})
export class BookmarksModule {}
