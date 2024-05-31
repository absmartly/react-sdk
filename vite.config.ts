import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: "./vitest-setup.ts",
    environment: "jsdom",
    coverage: {
      reporter: ["lcov", "text"],
    },
  },
});
