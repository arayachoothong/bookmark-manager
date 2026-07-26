import { Module } from "@nestjs/common";
import { PrismaModule } from "../../shared/prisma/prisma.module";
import { CollectionsModule } from "../collections/collections.module";
import { SharesService } from "./application/shares.service";
import { SharesRepository } from "./infrastructure/shares.repository";
import { SharesController } from "./interface/shares.controller";

@Module({
  imports: [PrismaModule, CollectionsModule],
  controllers: [SharesController],
  providers: [SharesRepository, SharesService],
})
export class SharingModule {}
