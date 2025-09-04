import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url().describe("PostgreSQL connection string"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV,
});
