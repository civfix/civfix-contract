import { afterEach, describe, expect, it, vi } from "vitest"
import { LegalDocumentTypeSchema, type LegalDocumentType } from "../../schemas/common.js"
import { LEGAL_DOCUMENTS, currentLegalVersion, currentVersion, isCurrent, legalDocument } from "../documents.js"

const ALL: readonly LegalDocumentType[] = LegalDocumentTypeSchema.options

describe("LEGAL_DOCUMENTS", () => {
  it("carries at least one version of every legal document type and nothing else", () => {
    expect([...new Set(LEGAL_DOCUMENTS.map((doc) => doc.type))].sort()).toEqual([...ALL].sort())
  })

  it("is frozen so no consumer can mutate the legal record", () => {
    expect(Object.isFrozen(LEGAL_DOCUMENTS)).toBe(true)
    for (const doc of LEGAL_DOCUMENTS) expect(Object.isFrozen(doc)).toBe(true)
  })

  it("uses an ISO effectiveAt and a 64-hex sha256", () => {
    for (const doc of LEGAL_DOCUMENTS) {
      expect(doc.effectiveAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
      expect(Number.isFinite(Date.parse(doc.effectiveAt))).toBe(true)
      expect(doc.sha256).toMatch(/^[0-9a-f]{64}$/)
    }
  })

  it("points every version at its type's https civfix.org page", () => {
    for (const doc of LEGAL_DOCUMENTS) expect(doc.url).toBe(`https://civfix.org/legal/${doc.type}`)
  })

  it("gives every version a distinct sha256", () => {
    const hashes = LEGAL_DOCUMENTS.map((doc) => doc.sha256)
    expect(new Set(hashes).size).toBe(hashes.length)
  })
})

describe("currentLegalVersion", () => {
  it("T20: returns the newest version in effect at the given time", () => {
    expect(currentLegalVersion("terms", new Date("2026-09-21T00:00:00.000Z")).version).toBe("2026-09-21")
    expect(currentLegalVersion("terms", new Date("2026-09-20T23:59:59.999Z")).version).toBe("2026-09-16")
    expect(currentLegalVersion("privacy", new Date("2026-09-06T00:00:00.000Z")).version).toBe("2026-09-06")
    expect(currentLegalVersion("cookies", new Date("2026-12-01T00:00:00.000Z")).version).toBe("2026-10-26")
    expect(() => currentLegalVersion("terms", new Date("2026-09-05T23:59:59.999Z"))).toThrow(RangeError)
    expect(() => currentLegalVersion("donations" as LegalDocumentType, new Date())).toThrow(RangeError)
  })
})

describe("legalDocument / currentVersion / isCurrent", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("T21: answer for the version in effect now", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-10-25T12:00:00.000Z"))
    expect(currentVersion("terms")).toBe("2026-09-21")
    expect(legalDocument("cookies").version).toBe("2026-09-16")
    expect(isCurrent("terms", "2026-09-21")).toBe(true)
    expect(isCurrent("terms", "2026-09-16")).toBe(false)

    vi.setSystemTime(new Date("2026-09-18T00:00:00.000Z"))
    expect(currentVersion("terms")).toBe("2026-09-16")
  })

  it("rejects versions that are not current", () => {
    for (const type of ALL) {
      expect(isCurrent(type, currentVersion(type))).toBe(true)
      expect(isCurrent(type, "1999-01-01")).toBe(false)
      expect(isCurrent(type, "")).toBe(false)
    }
  })

  it("throws on an unknown type rather than silently accepting stale consent", () => {
    expect(() => currentVersion("nope" as LegalDocumentType)).toThrow(RangeError)
    expect(() => legalDocument("nope" as LegalDocumentType)).toThrow(RangeError)
  })
})
