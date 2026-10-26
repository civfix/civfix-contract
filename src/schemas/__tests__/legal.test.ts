import { describe, expect, it } from "vitest"
import { ConsentSurfaceSchema } from "../common.js"
import { LegalDocumentVersionDTOSchema } from "../entities.js"
import {
  AcceptLegalRequestSchema,
  AcceptLegalResponseSchema,
  GetLegalDocumentRequestSchema,
  GetLegalDocumentResponseSchema,
  GetLegalDocumentsResponseSchema,
  LEGAL_VERSION_OUTDATED,
  LegalDocumentDTOSchema,
  LegalVersionOutdatedDetailsSchema,
  MyLegalStatusResponseSchema,
} from "../legal.js"

const HEX = "ab".repeat(32)

const EPIC_DTO = {
  type: "terms",
  version: "2026-10-25",
  effectiveAt: "2026-10-25T00:00:00.000Z",
  url: "https://civfix.org/legal/terms",
  title: "Terms of Service",
  summary: "No change in wording",
  material: false,
  sha256: HEX,
  blocks: [{ kind: "paragraph", text: "Hi" }],
}

const PRE_EPIC_DTO = {
  type: "terms",
  version: "2026-09-21",
  effectiveAt: "2026-09-21T00:00:00.000Z",
  url: "https://civfix.org/legal/terms",
  title: null,
  summary: null,
  material: null,
  sha256: "52fe3908a8d7aa4427239a7555a2d7b2346d7a2b9730dfb539ecd157f6195772",
  blocks: null,
}

const { blocks: _blocks, ...EPIC_META } = EPIC_DTO

const STATUS = {
  required: [EPIC_META],
  notices: [],
  accepted: { terms: { version: "2026-09-21", action: "accepted", at: "2026-10-25T10:00:00.000Z" } },
}

const item = (type: string, extra: Record<string, unknown> = {}) => ({
  type,
  version: "2026-09-21",
  sha256: HEX,
  action: "accepted",
  ...extra,
})

describe("LegalDocumentDTOSchema", () => {
  it("T23: takes epic and pre-epic versions, refuses unsafe blocks and unknown types", () => {
    expect(LegalDocumentDTOSchema.safeParse(EPIC_DTO).success).toBe(true)
    expect(LegalDocumentDTOSchema.safeParse(PRE_EPIC_DTO).success).toBe(true)
    expect(
      LegalDocumentDTOSchema.safeParse({ ...EPIC_DTO, blocks: [{ kind: "paragraph", text: "[x](http://a.org)" }] })
        .success,
    ).toBe(false)
    expect(LegalDocumentDTOSchema.safeParse({ ...EPIC_DTO, type: "donations" }).success).toBe(false)
  })
})

describe("legal document reads", () => {
  it("T24: parses both responses and only a strict { type, version } request", () => {
    expect(GetLegalDocumentsResponseSchema.safeParse({ documents: [EPIC_DTO] }).success).toBe(true)
    expect(GetLegalDocumentResponseSchema.safeParse({ document: PRE_EPIC_DTO }).success).toBe(true)
    expect(GetLegalDocumentRequestSchema.safeParse({ type: "terms", version: "2026-09-21" }).success).toBe(true)
    expect(GetLegalDocumentRequestSchema.safeParse({ type: "x", version: "2026-09-21" }).success).toBe(false)
    expect(GetLegalDocumentRequestSchema.safeParse({ type: "terms" }).success).toBe(false)
    expect(GetLegalDocumentRequestSchema.safeParse({ type: "terms", version: "2026-09-21", extra: 1 }).success).toBe(
      false,
    )
  })
})

describe("MyLegalStatusResponseSchema", () => {
  it("T25: parses what a person owes, without blocks, keyed by known types", () => {
    expect(MyLegalStatusResponseSchema.safeParse(STATUS).success).toBe(true)
    expect(MyLegalStatusResponseSchema.safeParse({ ...STATUS, accepted: {} }).success).toBe(true)

    const withBlocks = MyLegalStatusResponseSchema.parse({ ...STATUS, required: [EPIC_DTO] })
    expect(withBlocks.required[0]).not.toHaveProperty("blocks")

    expect(
      MyLegalStatusResponseSchema.safeParse({ ...STATUS, accepted: { donations: STATUS.accepted.terms } }).success,
    ).toBe(false)
    expect(
      MyLegalStatusResponseSchema.safeParse({
        ...STATUS,
        accepted: { terms: { ...STATUS.accepted.terms, action: "declined" } },
      }).success,
    ).toBe(false)
  })
})

describe("AcceptLegalRequestSchema", () => {
  const ok = (value: unknown): boolean => AcceptLegalRequestSchema.safeParse(value).success

  it("T26: takes one to four distinct items and the three surfaces, refuses everything else", () => {
    expect(ok({ items: [item("terms")] })).toBe(true)
    expect(ok({ items: ["terms", "privacy", "cookies", "subprocessors"].map((type) => item(type)) })).toBe(true)
    for (const surface of ["signup", "prompt", "notice"]) expect(ok({ items: [item("terms")], surface }), surface).toBe(true)

    expect(ok({ items: [] })).toBe(false)
    expect(ok({ items: ["terms", "privacy", "cookies", "subprocessors", "terms"].map((type) => item(type)) })).toBe(false)
    expect(ok({ items: [item("terms"), item("terms")] })).toBe(false)
    expect(ok({ items: [item("terms", { action: "declined" })] })).toBe(false)
    expect(ok({ items: [item("terms", { sha256: "ABC" })] })).toBe(false)
    for (const surface of ["event_registration", "web_register"]) {
      expect(ok({ items: [item("terms")], surface }), surface).toBe(false)
    }
    expect(ok({ items: [item("terms")], extra: 1 })).toBe(false)
    expect(ok({ items: [item("terms", { extra: 1 })] })).toBe(false)
  })
})

describe("AcceptLegalResponseSchema", () => {
  it("T27: is the status response", () => {
    expect(AcceptLegalResponseSchema).toBe(MyLegalStatusResponseSchema)
    for (const input of [STATUS, { ...STATUS, accepted: {} }, { ...STATUS, required: [EPIC_DTO] }]) {
      expect(AcceptLegalResponseSchema.safeParse(input)).toEqual(MyLegalStatusResponseSchema.safeParse(input))
    }
  })
})

describe("LEGAL_VERSION_OUTDATED", () => {
  it("T29: names the CONFLICT reason and its details carry the current versions", () => {
    expect(LEGAL_VERSION_OUTDATED).toBe("legal_version_outdated")
    const details = {
      reason: "legal_version_outdated",
      current: [{ type: "terms", version: "2026-10-25", sha256: HEX }],
    }
    expect(LegalVersionOutdatedDetailsSchema.safeParse(details).success).toBe(true)
    expect(LegalVersionOutdatedDetailsSchema.safeParse({ ...details, reason: "other" }).success).toBe(false)
    expect(LegalVersionOutdatedDetailsSchema.safeParse({ ...details, current: [] }).success).toBe(false)
  })
})

describe("LegalDocumentVersionDTOSchema", () => {
  it("T30: gains optional fields and nullable counts; ConsentSurfaceSchema is unchanged", () => {
    const today = {
      type: "terms",
      version: "2026-09-21",
      sha256: HEX,
      effectiveAt: "2026-09-21T00:00:00.000Z",
      url: "https://civfix.org/legal/terms",
    }
    expect(LegalDocumentVersionDTOSchema.safeParse(today).success).toBe(true)
    const full = { ...today, title: "Terms", summary: "No change in wording", material: true, acceptedCount: 3, activeAccounts: null }
    expect(LegalDocumentVersionDTOSchema.safeParse(full).success).toBe(true)
    expect(LegalDocumentVersionDTOSchema.safeParse({ ...full, acceptedCount: -1 }).success).toBe(false)
    expect(LegalDocumentVersionDTOSchema.safeParse({ ...full, acceptedCount: 1.5 }).success).toBe(false)
    expect(ConsentSurfaceSchema.options).toEqual(["web_register", "mobile_register", "onboarding"])
  })
})
