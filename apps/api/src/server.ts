import { createApp } from "./app";
import { closeDatabase } from "./db";
import { serverEnv } from "./lib/env";

const app = await createApp();
const env = serverEnv();

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, async () => {
    await app.close();
    await closeDatabase();
    process.exit(0);
  });
}

await app.listen({ port: env.PORT, host: "0.0.0.0" });
