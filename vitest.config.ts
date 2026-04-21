import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    env: {
      /** Deterministic test key - 32-byte zero buffer base64 */
      PII_ENCRYPTION_KEY: Buffer.alloc(32, 11).toString("base64"),
      DEPLOYMENT_TIMEZONE: "UTC",
    },
    environment: "node",
    globals: true,
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules", ".next", "e2e/**"],
    // Minimum 100 iterations for property-based tests (fast-check default is 100)
    // fast-check numRuns can be configured per test or globally via fc.configureGlobal
  },
});
