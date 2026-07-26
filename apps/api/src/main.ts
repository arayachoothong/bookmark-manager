import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { setupSwagger } from "./shared/openapi/swagger.config";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  if (process.env.NODE_ENV !== "production") {
    setupSwagger(app);
  }
  const port = process.env.PORT ?? 4000;
  await app.listen(port);
}

void bootstrap();
