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
  },
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
});
