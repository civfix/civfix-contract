import { createHash } from "node:crypto"
import { describe, expect, it } from "vitest"
import { LegalDocumentTypeSchema, type LegalDocumentType } from "../../schemas/common.js"
import { LEGAL_DOCUMENTS, currentVersion, isCurrent, legalDocument } from "../documents.js"
import * as legal from "../index.js"

const ALL: readonly LegalDocumentType[] = LegalDocumentTypeSchema.options

describe("LEGAL_DOCUMENTS", () => {
  it("carries exactly one entry per legal document type", () => {
    expect(LEGAL_DOCUMENTS.map((doc) => doc.type).sort()).toEqual([...ALL].sort())
    expect(new Set(LEGAL_DOCUMENTS.map((doc) => doc.type)).size).toBe(LEGAL_DOCUMENTS.length)
  })

  it("is frozen so no consumer can mutate the legal record", () => {
    expect(Object.isFrozen(LEGAL_DOCUMENTS)).toBe(true)
    for (const doc of LEGAL_DOCUMENTS) expect(Object.isFrozen(doc)).toBe(true)
  })

  it("uses a date-shaped version, an ISO effectiveAt and a 64-hex sha256", () => {
    for (const doc of LEGAL_DOCUMENTS) {
      expect(doc.version).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(doc.effectiveAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
      expect(Number.isFinite(Date.parse(doc.effectiveAt))).toBe(true)
      expect(doc.sha256).toMatch(/^[0-9a-f]{64}$/)
    }
  })

  it("gives every document a distinct https civfix.org URL", () => {
    const urls = LEGAL_DOCUMENTS.map((doc) => doc.url)
    expect(new Set(urls).size).toBe(urls.length)
    for (const url of urls) expect(url.startsWith("https://civfix.org/legal/")).toBe(true)
  })

  it("gives every document a distinct sha256", () => {
    const hashes = LEGAL_DOCUMENTS.map((doc) => doc.sha256)
    expect(new Set(hashes).size).toBe(hashes.length)
  })
})

describe("currentVersion / isCurrent", () => {
  it("returns the version recorded for the type", () => {
    for (const type of ALL) {
      expect(currentVersion(type)).toBe(legalDocument(type).version)
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

describe("terms and privacy 2026-10-20 (civfix/issue-tracker#205)", () => {
  const V = "2026-10-20"
  const TERMS_SHA256 = "942aabae31cda45d9cdace018ee0953d28506b27d2f0c45b2d3cd554cfa66ed3"
  const PRIVACY_SHA256 = "05dedba2376323c94697e2bfb43915f6b983761b806b74ba336d46c2f991ff8a"

  it("T1: legalDocument(\"terms\") is version V with slice 2's terms hash", () => {
    expect(legal.legalDocument("terms")).toEqual({
      type: "terms",
      version: V,
      sha256: TERMS_SHA256,
      effectiveAt: `${V}T00:00:00.000Z`,
      url: "https://civfix.org/legal/terms",
    })
  })

  it("T2: legalDocument(\"privacy\") is version V with slice 2's privacy hash", () => {
    expect(legal.legalDocument("privacy")).toEqual({
      type: "privacy",
      version: V,
      sha256: PRIVACY_SHA256,
      effectiveAt: `${V}T00:00:00.000Z`,
      url: "https://civfix.org/legal/privacy",
    })
  })

  it("T3: cookies and subprocessors are unchanged", () => {
    expect(legal.legalDocument("cookies")).toMatchObject({
      version: "2026-09-16",
      sha256: "4a05415bba1ef0301058815ce6d01f98eb593bd18378e7ce52555074da3064c0",
    })
    expect(legal.legalDocument("subprocessors")).toMatchObject({
      version: "2026-09-16",
      sha256: "5ab722bb37cc2972ada7521b6dc239bfd85f82691d0e3e2489f5dcac9983a198",
    })
  })

  it("T4: the 2026-09-21 terms and privacy are no longer current; V is", () => {
    expect(legal.isCurrent("terms", "2026-09-21")).toBe(false)
    expect(legal.isCurrent("privacy", "2026-09-21")).toBe(false)
    expect(legal.isCurrent("terms", V)).toBe(true)
    expect(legal.isCurrent("privacy", V)).toBe(true)
    expect(legal.currentVersion("terms")).toBe(V)
    expect(legal.currentVersion("privacy")).toBe(V)
  })

  it("T5: neither terms nor privacy carries the placeholder sha256 of \"<type>@V\"", () => {
    const placeholder = (type: string) => createHash("sha256").update(`${type}@${V}`).digest("hex")
    const byType = new Map(legal.LEGAL_DOCUMENTS.map((doc) => [doc.type, doc]))
    expect(byType.get("terms")?.sha256).not.toBe(placeholder("terms"))
    expect(byType.get("privacy")?.sha256).not.toBe(placeholder("privacy"))
  })
})
