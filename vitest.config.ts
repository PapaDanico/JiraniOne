import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["server/**/*.test.ts", "shared/**/*.test.ts"],
    // We're not running integration tests against a real DB by default;
    // unit tests in this project mock the DB layer. To run integration
    // tests against a real Neon branch, set INTEGRATION=1 and configure
    // DATABASE_URL.
    testTimeout: 10_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      // Source under test. The migrate-*.mjs scripts and the seed are
      // operational utilities, not runtime code paths, so we don't ask
      // coverage to track them. index.ts is bootstrap-only and is
      // covered transitively by the supertest-style middleware tests.
      include: ["server/src/**/*.ts", "shared/**/*.ts"],
      exclude: [
        "**/*.test.ts",
        "server/src/types/**",
        "server/src/seed.ts",
        "server/src/index.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
});
