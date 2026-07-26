import { Controller, Get } from "@nestjs/common";
import type { User } from "@prisma/client";
import { CurrentUser } from "../../auth/interface/current-user.decorator";

@Controller()
export class MeController {
  @Get("me")
  me(@CurrentUser() user: User) {
    return {
      id: user.id,
      email: user.email,
      auth0Sub: user.auth0Sub,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
