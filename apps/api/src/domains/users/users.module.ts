import { Module } from "@nestjs/common";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { UsersService } from "./application/users.service";
import { MeController } from "./interface/me.controller";

@Module({
  controllers: [MeController],
  providers: [UsersService, PrismaService],
  exports: [UsersService],
})
export class UsersModule {}
