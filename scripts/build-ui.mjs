import { spawnSync } from "node:child_process";

const result = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build"], {
  stdio: "inherit",
  env: { ...process.env, LSMS_BUILD_DIR: ".next-ui", API_INTERNAL_URL: "http://127.0.0.1:4100" },
});
process.exit(result.status ?? 1);
