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
    passWithNoTests: false,
    coverage: {
      all: false,
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "**/node_modules/**",
        "dist/**",
        "dist-cjs/**",
        "coverage/**",
        "scripts/**",
        "**/*.config.*",
        "eslint.config.js",
        "**/types/**",
      ],
      thresholds: {
        lines: 20,
        functions: 10,
        statements: 15,
        branches: 5,
      },
    },
  },
});
