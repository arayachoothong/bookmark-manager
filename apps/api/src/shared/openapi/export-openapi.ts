import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Test } from "@nestjs/testing";
import { AppModule } from "../../app.module";
import { JWT_VERIFIER } from "../../domains/auth/jwt-verifier.token";
import { PrismaService } from "../prisma/prisma.service";
import { createSwaggerDocument } from "./swagger.config";

async function exportOpenApi(): Promise<void> {
  process.env.AUTH0_ISSUER ??= "https://openapi-export.local/";
  process.env.AUTH0_AUDIENCE ??= "openapi-export-audience";

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue({
      onModuleInit: async () => {},
      onModuleDestroy: async () => {},
    })
    .overrideProvider(JWT_VERIFIER)
    .useValue(async () => {
      throw new Error("JWT verifier not used during OpenAPI export");
    })
    .compile();

  const app = moduleRef.createNestApplication();
  await app.init();

  const document = createSwaggerDocument(app);
  const outDir = join(process.cwd(), "..", "..", "openapi");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, "openapi.json"),
    `${JSON.stringify(document, null, 2)}\n`,
  );

  await app.close();
}

void exportOpenApi().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
