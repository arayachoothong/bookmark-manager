import { Module } from "@nestjs/common";
import { PrismaModule } from "../../shared/prisma/prisma.module";
import { CollectionAccessService } from "./domain/collection-access.service";
import { COLLECTION_ACCESS_PORT } from "./domain/collection-access.port";
import { CollectionsRepository } from "./infrastructure/collections.repository";

@Module({
  imports: [PrismaModule],
  providers: [
    CollectionsRepository,
    {
      provide: COLLECTION_ACCESS_PORT,
      useExisting: CollectionsRepository,
    },
    CollectionAccessService,
  ],
  exports: [CollectionsRepository, CollectionAccessService],
})
export class CollectionAccessModule {}
