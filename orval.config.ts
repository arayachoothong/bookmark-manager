import { defineConfig } from "orval";

export default defineConfig({
  bookmark: {
    input: "./openapi/openapi.json",
    output: {
      target: "./packages/api-client/src/generated/endpoints.ts",
      schemas: "./packages/api-client/src/generated/models",
      client: "react-query",
      httpClient: "axios",
      mode: "tags-split",
      override: {
        mutator: {
          path: "./packages/api-client/src/custom-instance.ts",
          name: "customInstance",
        },
      },
    },
  },
});
