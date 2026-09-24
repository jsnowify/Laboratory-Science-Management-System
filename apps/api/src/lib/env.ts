import { z } from "zod";
import { config } from "dotenv";

config({ path: process.env.LSMS_ENV_FILE ?? "../../.env.local", quiet: true });

const serverSchema = z.object({
  DATABASE_URL: z.url().refine((value) => value.startsWith("postgres://") || value.startsWith("postgresql://"), "Use a PostgreSQL URL"),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  FRONTEND_URL: z.url(),
  INITIAL_SETUP_TOKEN: z.string().min(24),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export function serverEnv() {
  const result = serverSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(`Invalid server configuration: ${result.error.issues.map((issue) => issue.path.join(".")).join(", ")}`);
  }
  return result.data;
}
