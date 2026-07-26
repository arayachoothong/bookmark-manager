import { Module } from "@nestjs/common";
import { PrismaModule } from "../../shared/prisma/prisma.module";
import { UsersService } from "./application/users.service";
import { Auth0UserinfoClient } from "./infrastructure/auth0-userinfo.client";
import { MeController } from "./interface/me.controller";

@Module({
  imports: [PrismaModule],
  controllers: [MeController],
  providers: [Auth0UserinfoClient, UsersService],
  exports: [UsersService],
})
export class UsersModule {}
