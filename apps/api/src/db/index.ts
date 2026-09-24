import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { serverEnv } from "../lib/env";
import * as lsmsSchema from "./introspected/schema";
import * as authSchema from "./auth-schema";

let client: ReturnType<typeof postgres> | undefined;

export function database() {
  client ??= postgres(serverEnv().DATABASE_URL, { max: 10, prepare: false });
  return drizzle(client, { schema: { ...lsmsSchema, ...authSchema } });
}

export async function closeDatabase() {
  if (client) await client.end();
  client = undefined;
}
