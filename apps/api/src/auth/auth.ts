import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { database } from "../db";
import { authSchema } from "../db/auth-schema";
import { serverEnv } from "../lib/env";

const env = serverEnv();

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.FRONTEND_URL],
  database: drizzleAdapter(database(), { provider: "pg", schema: authSchema }),
  user: { modelName: "auth_users" },
  session: {
    modelName: "auth_sessions",
    expiresIn: 60 * 60 * 24,
    updateAge: 60 * 60,
  },
  account: { modelName: "auth_accounts" },
  verification: { modelName: "auth_verifications" },
  emailAndPassword: { enabled: true, autoSignIn: false, minPasswordLength: 10 },
  advanced: {
    defaultCookieAttributes: {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
  },
  rateLimit: { enabled: true },
});
