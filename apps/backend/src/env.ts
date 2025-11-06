import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(0).default(3000),
  GCP_PROJECT_ID: z.string().min(1, "GCP_PROJECT_ID is required"),
  GCP_CLIENT_EMAIL: z.string().email().optional(),
  GCP_PRIVATE_KEY: z.string().min(1).optional(),
  FIRESTORE_EMULATOR_HOST: z.string().optional(),
  ADMIN_PASSWORD: z
    .string()
    .min(1, "ADMIN_PASSWORD must be provided for staff tooling")
});

export const env = envSchema.parse(process.env);

export type Env = typeof env;
