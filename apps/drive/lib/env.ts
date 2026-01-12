import { DEFAULT_URLS } from "@workspace/utils";
import { z } from "zod";

const envSchema = z.object({
  // Default URL is DEV-ONLY - production MUST provide explicit value
  NEXT_PUBLIC_API_URL: z
    .string()
    .url()
    .default(process.env.NODE_ENV === "production" ? "" : DEFAULT_URLS.API),
});

function validateEnv() {
  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  });

  if (!parsed.success) {
    console.error("Invalid environment variables:");
    for (const issue of parsed.error.issues) {
      console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    throw new Error("Invalid environment variables");
  }

  return parsed.data;
}

export const env = validateEnv();
