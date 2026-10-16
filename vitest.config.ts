import { defineConfig } from "vitest/config"

// scripts/*.test.mjs use node:test and run with `node --test` (see ci.yml).
export default defineConfig({
  test: { exclude: ["**/node_modules/**", "**/dist/**", "scripts/**"] },
})
