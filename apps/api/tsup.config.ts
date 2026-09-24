import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  platform: "node",
  outDir: "dist",
  splitting: false,
  noExternal: ["@lsms/shared"],
});
