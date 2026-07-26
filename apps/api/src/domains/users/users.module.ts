import { Module } from "@nestjs/common";
import { PrismaModule } from "../../shared/prisma/prisma.module";
import { UsersService } from "./application/users.service";
import { MeController } from "./interface/me.controller";

@Module({
  imports: [PrismaModule],
  controllers: [MeController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
