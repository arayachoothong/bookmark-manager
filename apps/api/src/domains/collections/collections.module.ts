import { Module } from "@nestjs/common";
import { PrismaModule } from "../../shared/prisma/prisma.module";
import { CollectionsService } from "./application/collections.service";
import { CollectionAccessService } from "./domain/collection-access.service";
import { COLLECTION_ACCESS_PORT } from "./domain/collection-access.port";
import { CollectionsRepository } from "./infrastructure/collections.repository";
import { CollectionsController } from "./interface/collections.controller";

@Module({
  imports: [PrismaModule],
  controllers: [CollectionsController],
  providers: [
    CollectionsRepository,
    {
      provide: COLLECTION_ACCESS_PORT,
      useExisting: CollectionsRepository,
    },
    CollectionAccessService,
    CollectionsService,
  ],
  exports: [CollectionAccessService],
})
export class CollectionsModule {}
