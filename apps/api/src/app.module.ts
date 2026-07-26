import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { AuthModule } from "./domains/auth/auth.module";
import { AccessTokenGuard } from "./domains/auth/interface/access-token.guard";
import { BookmarksModule } from "./domains/bookmarks/bookmarks.module";
import { CollectionsModule } from "./domains/collections/collections.module";
import { UsersModule } from "./domains/users/users.module";
import { DomainExceptionFilter } from "./shared/errors/domain-exception.filter";

@Module({
  imports: [AuthModule, UsersModule, CollectionsModule, BookmarksModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AccessTokenGuard,
    },
    {
      provide: APP_FILTER,
      useClass: DomainExceptionFilter,
    },
  ],
})
export class AppModule {}
