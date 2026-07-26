import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AuthModule } from "./domains/auth/auth.module";
import { AccessTokenGuard } from "./domains/auth/interface/access-token.guard";
import { UsersModule } from "./domains/users/users.module";

@Module({
  imports: [AuthModule, UsersModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AccessTokenGuard,
    },
  ],
})
export class AppModule {}
