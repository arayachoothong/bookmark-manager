import { Controller, Get } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type { User } from "@prisma/client";
import { CurrentUser } from "../../auth/interface/current-user.decorator";
import { UserMeResponse } from "../../../shared/openapi/api-models";

@ApiTags("users")
@ApiBearerAuth("access-token")
@Controller()
export class MeController {
  @Get("me")
  @ApiOperation({ summary: "Current authenticated user profile" })
  @ApiOkResponse({ type: UserMeResponse })
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
