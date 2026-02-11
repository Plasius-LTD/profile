import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: [
      "tests/**/*.test.ts",
      "tests/**/*.test.tsx",
      "tests/**/*.tests.ts",
      "tests/**/*.tests.tsx",
    ],
    passWithNoTests: true,
    coverage: {
      reporter: ["text", "json", "html"],
      exclude: ["**/node_modules/**", "dist", "dist-cjs", "**/types/**"],
    },
  },
});
