import { defineConfig } from "tsdown"

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/client/index.ts",
    "src/avatar.ts",
    "src/datetime.ts",
    "src/geocode.ts",
    "src/host/index.ts",
    "src/markdown/index.ts",
    "src/ics/index.ts",
    "src/legal/index.ts",
    "src/legal-texts/index.ts",
  ],
  outDir: "dist",
  // Entries share one copy of each module (tsdown always splits code two entries import into a shared
  // chunk): unsplit, every subpath re-bundled its imports (the client entry alone carried the schemas and
  // its own AppError), so Metro shipped both copies and `instanceof` failed across subpaths. Re-check
  // `require` of every exports entry after a tsdown upgrade.
  format: ["esm", "cjs"],
  // The package has never shipped declaration maps; the tsconfig's `declarationMap` would turn them on.
  dts: { sourcemap: false },
  sourcemap: true,
  clean: true,
  target: "es2022",
  outExtensions: ({ format }) =>
    format === "cjs" ? { js: ".cjs", dts: ".d.cts" } : { js: ".js", dts: ".d.ts" },
})
