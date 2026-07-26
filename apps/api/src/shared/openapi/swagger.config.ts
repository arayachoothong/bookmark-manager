import type { INestApplication } from "@nestjs/common";
import type { OpenAPIObject} from "@nestjs/swagger";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export function buildSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle("Bookmark Manager API")
    .setDescription("Authenticated bookmark and collection API")
    .setVersion("1.0")
    .addBearerAuth(
      { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      "access-token",
    )
    .build();
}

export function createSwaggerDocument(app: INestApplication): OpenAPIObject {
  return SwaggerModule.createDocument(app, buildSwaggerConfig());
}

export function setupSwagger(app: INestApplication): void {
  const document = createSwaggerDocument(app);
  SwaggerModule.setup("api", app, document, {
    jsonDocumentUrl: "api-json",
  });
}
