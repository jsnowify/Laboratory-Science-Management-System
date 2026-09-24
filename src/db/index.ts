import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { serverEnv } from "@/lib/env";

let client: ReturnType<typeof postgres> | undefined;

export function database() {
  client ??= postgres(serverEnv().DATABASE_URL, { max: 10, prepare: false });
  return drizzle(client);
}
