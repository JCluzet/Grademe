import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli.ts"],
  format: ["esm"],
  target: "node22",
  banner: { js: "#!/usr/bin/env node" },
  clean: true,
  noExternal: ["@grademe/contracts"],
});
