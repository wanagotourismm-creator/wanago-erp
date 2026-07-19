import { defineConfig } from "vitest/config";

// Separate from vitest.config.ts because these tests hit a real (emulated)
// Firestore instance over the network — no jsdom, no path aliases needed,
// and they must never run as part of the fast `npm test` unit suite. Always
// invoke via `npm run test:rules`, which wraps this in
// `firebase emulators:exec` so FIRESTORE_EMULATOR_HOST is set and the
// emulator is torn down after.
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["rules-tests/**/*.test.ts"],
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
