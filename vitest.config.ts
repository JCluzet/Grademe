import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Ink's test stdin is process-global, so each test file needs its own process.
    pool: "forks",
    isolate: true,
    include: ["src/**/*.test.{ts,tsx}", "contracts/src/**/*.test.ts"],
  },
});
