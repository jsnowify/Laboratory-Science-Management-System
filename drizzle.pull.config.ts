import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local", quiet: true });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to inspect the existing lsms database.");
}

export default defineConfig({
  dialect: "postgresql",
  out: "./.drizzle-introspection",
  schemaFilter: ["public"],
  introspect: { casing: "camel" },
  dbCredentials: { url: process.env.DATABASE_URL },
});
