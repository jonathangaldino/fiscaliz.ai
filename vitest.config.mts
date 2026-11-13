import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "edge-runtime",
    server: { deps: { inline: ["convex-test"] } },
    // Fake secrets for tests only.
    env: { CITIZEN_HASH_SECRET: "test-secret", PUBLIC_APP_URL: "https://fiscaliza.test" },
    include: ["convex/**/*.test.ts", "lib/**/*.test.ts"],
  },
});
