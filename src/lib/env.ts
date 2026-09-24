import { z } from "zod";

const serverSchema = z.object({
  DATABASE_URL: z.url().refine((value) => value.startsWith("postgres://") || value.startsWith("postgresql://"), "Use a PostgreSQL URL"),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  INITIAL_SETUP_TOKEN: z.string().min(24),
});

export function serverEnv() {
  const result = serverSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(`Invalid server configuration: ${result.error.issues.map((issue) => issue.path.join(".")).join(", ")}`);
  }
  return result.data;
}
