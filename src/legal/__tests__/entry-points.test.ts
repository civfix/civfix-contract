import { execFileSync } from "node:child_process"
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { build, type Options } from "tsup"
import { afterAll, describe, expect, it } from "vitest"
import tsupConfig from "../../../tsup.config.js"

const ROOT = fileURLToPath(new URL("../../../", import.meta.url))
const IMPORT_SPECIFIER = /(?:^|[\s;])(?:import|export)\s[^"';]*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)|^\s*import\s*["']([^"']+)["']/gmu

/** Every specifier a source file imports or re-exports, type-only ones included. */
function specifiers(file: string): string[] {
  const source = readFileSync(file, "utf8")
  return [...source.matchAll(IMPORT_SPECIFIER)].map((m) => (m[1] ?? m[2] ?? m[3]) as string)
}

function reachable(entry: string, resolveRelative: (from: string, spec: string) => string): {
  files: Set<string>
  bare: Set<string>
} {
  const files = new Set<string>()
  const bare = new Set<string>()
  const queue = [entry]
  while (queue.length > 0) {
    const file = queue.pop() as string
    if (files.has(file)) continue
    files.add(file)
    for (const spec of specifiers(file)) {
      if (spec.startsWith(".")) queue.push(resolveRelative(file, spec))
      else bare.add(spec)
    }
  }
  return { files, bare }
}

const sourceFile = (from: string, spec: string): string => {
  const target = resolve(dirname(from), spec)
  const ts = target.replace(/\.js$/u, ".ts")
  if (existsSync(ts)) return ts
  if (existsSync(target)) return target
  throw new Error(`unresolved import ${spec} from ${relative(ROOT, from)}`)
}

const builtFile = (from: string, spec: string): string => resolve(dirname(from), spec)

const dirs: string[] = []
afterAll(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
})

describe("entry points", () => {
  it("T22: the root and /legal never reach legal-texts or node:crypto in the source", () => {
    for (const entry of ["src/index.ts", "src/legal/index.ts"]) {
      const { files, bare } = reachable(join(ROOT, entry), sourceFile)
      const texts = [...files].filter((file) => relative(ROOT, file).startsWith("src/legal-texts"))
      expect(texts, entry).toEqual([])
      expect([...bare].filter((spec) => spec === "node:crypto" || spec === "crypto"), entry).toEqual([])
    }
  })

  it("T22: the built package loads legal-texts in ESM and CJS, apart from the root and /legal", { timeout: 300_000 }, async () => {
    mkdirSync(join(ROOT, "node_modules/.cache"), { recursive: true })
    const pkg = mkdtempSync(join(ROOT, "node_modules/.cache/contract-entries-"))
    dirs.push(pkg)
    copyFileSync(join(ROOT, "package.json"), join(pkg, "package.json"))
    await build({
      ...(tsupConfig as Options),
      entry: ((tsupConfig as Options).entry as string[]).map((file) => join(ROOT, file)),
      outDir: join(pkg, "dist"),
      dts: false,
      sourcemap: false,
      silent: true,
      config: false,
    })

    for (const entry of ["dist/index.js", "dist/legal/index.js"]) {
      const { files } = reachable(join(pkg, entry), builtFile)
      for (const file of files) expect(readFileSync(file, "utf8"), relative(pkg, file)).not.toMatch(/node:crypto/u)
    }

    // A file inside the package resolves "@civfix/contract/..." through package.json exports (self-reference).
    writeFileSync(
      join(pkg, "probe.mjs"),
      `const out = {}
for (const sub of ["", "/legal", "/legal-texts"]) {
  const m = await import("@civfix/contract" + sub)
  out[sub || "."] = { texts: typeof m.LEGAL_TEXTS, hash: typeof m.legalRecordSha256 }
}
console.log(JSON.stringify(out))
`,
    )
    writeFileSync(
      join(pkg, "probe.cjs"),
      `const out = {}
for (const sub of ["", "/legal", "/legal-texts"]) {
  const m = require("@civfix/contract" + sub)
  out[sub || "."] = { texts: typeof m.LEGAL_TEXTS, hash: typeof m.legalRecordSha256 }
}
console.log(JSON.stringify(out))
`,
    )
    const expected = {
      ".": { texts: "undefined", hash: "undefined" },
      "/legal": { texts: "undefined", hash: "undefined" },
      "/legal-texts": { texts: "object", hash: "function" },
    }
    for (const probe of ["probe.mjs", "probe.cjs"]) {
      const out = execFileSync("node", [join(pkg, probe)], { cwd: pkg, encoding: "utf8" })
      expect(JSON.parse(out), probe).toEqual(expected)
    }
  })
})
