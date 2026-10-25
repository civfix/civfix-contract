import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { afterAll, describe, expect, it } from "vitest"
import { legalRecordSha256 } from "../../legal-texts/index.js"

const ROOT = fileURLToPath(new URL("../../../", import.meta.url))
const SCRIPT = join(ROOT, "scripts/legal-hash.mjs")
const ZEROS = "0".repeat(64)

const dirs: string[] = []
afterAll(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
})

const run = (args: string[]): string => execFileSync("node", [SCRIPT, ...args], { cwd: ROOT, encoding: "utf8" })
const gitStatus = (): string => execFileSync("git", ["status", "--porcelain"], { cwd: ROOT, encoding: "utf8" })

describe("pnpm legal:hash", () => {
  it("T19: leaves this branch untouched", { timeout: 120_000 }, () => {
    const before = gitStatus()
    run([])
    expect(gitStatus()).toBe(before)
  })

  it("T19: rewrites exactly the one stale hash in a fixture, every other byte identical", { timeout: 120_000 }, () => {
    const dir = mkdtempSync(join(tmpdir(), "legal-hash-"))
    dirs.push(dir)
    const terms = {
      type: "terms" as const,
      version: "2026-10-25",
      effectiveAt: "2026-10-25T00:00:00.000Z",
      url: "https://civfix.org/legal/terms",
      title: "Terms of Service",
      summary: "No change in wording",
      material: false,
    }
    const privacy = { ...terms, type: "privacy" as const, url: "https://civfix.org/legal/privacy", title: "Privacy Policy" }
    const termsBlocks = [{ kind: "paragraph" as const, text: "Terms text" }]
    const privacyBlocks = [{ kind: "heading" as const, level: 2 as const, text: "Privacy" }]
    const termsHash = legalRecordSha256({ ...terms, sha256: ZEROS }, termsBlocks)
    const privacyHash = legalRecordSha256({ ...privacy, sha256: ZEROS }, privacyBlocks)

    const documents = `export const LEGAL_DOCUMENTS = [
  {
    type: "terms",
    version: "2026-09-21",
    effectiveAt: "2026-09-21T00:00:00.000Z",
    url: "https://civfix.org/legal/terms",
    sha256: "52fe3908a8d7aa4427239a7555a2d7b2346d7a2b9730dfb539ecd157f6195772",
  },
  {
    type: "terms",
    version: "2026-10-25",
    effectiveAt: "2026-10-25T00:00:00.000Z",
    url: "https://civfix.org/legal/terms",
    title: "Terms of Service",
    summary: "No change in wording",
    material: false,
    sha256: "${ZEROS}",
  },
  {
    type: "privacy",
    version: "2026-10-25",
    effectiveAt: "2026-10-25T00:00:00.000Z",
    url: "https://civfix.org/legal/privacy",
    title: "Privacy Policy",
    summary: "No change in wording",
    material: false,
    sha256: "${privacyHash}",
  },
]
`
    const texts = `export const LEGAL_TEXTS = {
  "terms@2026-10-25": ${JSON.stringify(termsBlocks)},
  "privacy@2026-10-25": ${JSON.stringify(privacyBlocks)},
}
`
    const documentsPath = join(dir, "documents.ts")
    const textsPath = join(dir, "texts.ts")
    writeFileSync(documentsPath, documents)
    writeFileSync(textsPath, texts)

    run(["--documents", documentsPath, "--texts", textsPath])

    expect(documents.split(ZEROS)).toHaveLength(2)
    expect(readFileSync(documentsPath, "utf8")).toBe(documents.replace(ZEROS, termsHash))
    expect(readFileSync(textsPath, "utf8")).toBe(texts)
  })
})
