import { createHash } from "node:crypto"
import { describe, expect, it } from "vitest"
import { legalRecordSha256 } from "../index.js"

describe("legalRecordSha256", () => {
  it("T17: hashes the canonical record with sorted keys, no whitespace and no sha256", () => {
    const S =
      '{"blocks":[{"kind":"paragraph","text":"Hi"}],"effectiveAt":"2026-10-25T00:00:00.000Z","material":false,"summary":"No change in wording","title":"Términos","type":"terms","url":"https://civfix.org/legal/terms","version":"2026-10-25"}'
    const expected = createHash("sha256").update(S, "utf8").digest("hex")

    const entry = {
      type: "terms" as const,
      version: "2026-10-25",
      effectiveAt: "2026-10-25T00:00:00.000Z",
      url: "https://civfix.org/legal/terms",
      title: "Términos",
      summary: "No change in wording",
      material: false,
      sha256: "0".repeat(64),
    }
    expect(legalRecordSha256(entry, [{ kind: "paragraph", text: "Hi" }])).toBe(expected)

    const reordered = {
      sha256: "f".repeat(64),
      material: false,
      url: "https://civfix.org/legal/terms",
      summary: "No change in wording",
      effectiveAt: "2026-10-25T00:00:00.000Z",
      title: "Términos",
      version: "2026-10-25",
      type: "terms" as const,
    }
    expect(legalRecordSha256(reordered, [{ text: "Hi", kind: "paragraph" }])).toBe(expected)
  })

  it("T18: refuses a pre-epic version, which has no record to hash", () => {
    const entry = {
      type: "privacy" as const,
      version: "2026-09-16",
      effectiveAt: "2026-09-16T00:00:00.000Z",
      url: "https://civfix.org/legal/privacy",
      sha256: "d3789e993ddee83cb5c556234694a9d0f200e5d99b533eba6ca3ca2053df9417",
    }
    expect(() => legalRecordSha256(entry, [{ kind: "paragraph", text: "Hi" }])).toThrow(Error)
    expect(() => legalRecordSha256(entry, [{ kind: "paragraph", text: "Hi" }])).toThrow(/privacy@2026-09-16/)
  })
})
