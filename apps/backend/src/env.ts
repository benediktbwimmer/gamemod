import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(0).default(3000),
  DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().optional()
});

export const env = envSchema.parse(process.env);

export type Env = typeof env;
