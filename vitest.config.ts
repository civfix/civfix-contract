import { defineConfig } from "vitest/config"

// scripts/*.test.mjs use node:test and run with `node --test` (see ci.yml).
export default defineConfig({
  test: {
    exclude: ["**/node_modules/**", "**/dist/**", "scripts/**"],
    setupFiles: ["./vitest.console-guard.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // Barrels and type-only modules compile to nothing worth measuring.
      exclude: [
        "src/**/__tests__/**",
        "src/**/*.d.ts",
        "src/index.ts",
        "src/client/index.ts",
        "src/host/index.ts",
        "src/ics/index.ts",
        "src/legal/index.ts",
        "src/markdown/index.ts",
        "src/schemas/admin/index.ts",
        "src/schemas/host/index.ts",
        "src/markdown/ast.ts",
        "src/types/domain.ts",
      ],
      reporter: ["text-summary"],
      // The measured baseline rounded down; raise these as coverage grows, never lower them.
      thresholds: {
        statements: 97,
        branches: 92,
        functions: 97,
        lines: 98,
      },
    },
  },
})
