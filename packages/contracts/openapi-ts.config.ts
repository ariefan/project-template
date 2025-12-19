import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "./tsp-output/openapi/openapi.yaml",
  output: {
    path: "./src",
    format: "prettier",
  },
  plugins: [
    "@hey-api/typescript",
    "zod",
    {
      name: "@hey-api/sdk",
      validator: true,
    },
    "@hey-api/client-fetch",
    "@tanstack/react-query",
  ],
});
