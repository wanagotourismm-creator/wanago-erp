import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    css: true,
    // Firestore rules tests need the emulator running (see
    // vitest.rules.config.ts + `npm run test:rules`) — they'd just hang/fail
    // here since this config runs against jsdom with no emulator up. e2e/
    // is Playwright's own *.spec.ts suite (`npm run test:e2e`), which uses
    // an incompatible test()/describe() API — Vitest must never collect it.
    exclude: [...configDefaults.exclude, "rules-tests/**", "e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      // Phase 1 target (PRD Pillar 1, "Testing & CI/CD"): 60% on
      // services/ and schemas/ — that's what CI's coverage gate checks,
      // not the whole src tree (components/pages are covered by the
      // Playwright smoke suite instead).
      include: ["src/**/services/**/*.ts", "src/**/schemas/**/*.ts"],
      exclude: ["**/*.d.ts", "**/*.test.ts", "**/*.test.tsx"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
