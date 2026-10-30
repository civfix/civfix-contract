import { describe, expect, it } from "vitest"
import type { z } from "zod"
import * as root from "../src/index.js"
import { HttpUrlSchema } from "../src/schemas/entities.js"
import { SuggestContactRequestSchema } from "../src/schemas/map.js"
import {
  PatchJurisdictionRequestSchema,
  SaveContactsRequestSchema,
} from "../src/schemas/admin/jurisdictions.js"
import { SaveDraftRequestSchema } from "../src/schemas/admin/discovery.js"

// An https link exactly `n` characters long.
const L = (n: number) => "https://a.gov/" + "x".repeat(n - 14)

function issues(schema: z.ZodType, input: unknown) {
  const result = schema.safeParse(input)
  if (result.success)
    throw new Error(`expected ${JSON.stringify(input).slice(0, 80)} to be rejected`)
  return result.error.issues
}

const invalidUrl = (path: string[]) => [{ code: "invalid_format", format: "url", path }]
const tooBig = [{ code: "too_big", maximum: 2048, path: ["formUrl"] }]

describe("HttpUrlSchema", () => {
  it("T1: is exported from the package root with HTTP_URL_MAX_LENGTH", () => {
    expect(root.HTTP_URL_MAX_LENGTH).toBe(2048)
    expect(root.HttpUrlSchema.parse("https://lacity.gov/report")).toBe("https://lacity.gov/report")
  })

  it("T2: accepts an https link", () => {
    expect(HttpUrlSchema.parse("https://lacity.gov/report")).toBe("https://lacity.gov/report")
  })

  it("T3: accepts an http link with a port and a query", () => {
    expect(HttpUrlSchema.parse("http://localhost:8080/x?sig=1")).toBe(
      "http://localhost:8080/x?sig=1",
    )
  })

  it("T4: trims surrounding whitespace", () => {
    expect(HttpUrlSchema.parse("  https://a.gov  ")).toBe("https://a.gov")
  })

  it.each([
    ["T5", "javascript:alert(1)"],
    ["T6", "JAVASCRIPT:alert(1)"],
    ["T7", "data:text/html,x"],
    ["T8", "file:///etc/passwd"],
    ["T9", "vbscript:msgbox(1)"],
    ["T10", "blob:https://a.gov/x"],
    ["T11", "//a.gov/x"],
    ["T12", "http:foo"],
    ["T13", ""],
  ])("%s: rejects %j", (_id, value) => {
    expect(issues(HttpUrlSchema, value)).toMatchObject(invalidUrl([]))
  })
})

describe("SuggestContactRequest.formUrl", () => {
  const base = { geoid: "0644000" }

  it("T14: accepts a 2048-character link", () => {
    const result = SuggestContactRequestSchema.safeParse({ ...base, formUrl: L(2048) })
    expect(result.success).toBe(true)
    expect(result.data?.formUrl).toBe(L(2048))
  })

  it("T15: rejects a 2049-character link", () => {
    expect(issues(SuggestContactRequestSchema, { ...base, formUrl: L(2049) })).toMatchObject(tooBig)
  })

  it("T16: rejects a javascript: link", () => {
    expect(
      issues(SuggestContactRequestSchema, { ...base, formUrl: "javascript:alert(1)" }),
    ).toMatchObject(invalidUrl(["formUrl"]))
  })

  it("T17: still rejects null (optional, not nullable)", () => {
    expect(SuggestContactRequestSchema.safeParse({ ...base, formUrl: null }).success).toBe(false)
  })

  it("T18: stays optional", () => {
    const result = SuggestContactRequestSchema.safeParse({ ...base, email: "311@city.gov" })
    expect(result.success).toBe(true)
    expect("formUrl" in (result.data ?? {})).toBe(false)
  })
})

describe.each([
  ["SaveContactsRequestSchema", SaveContactsRequestSchema, { geoid: "0644000" }],
  ["PatchJurisdictionRequestSchema", PatchJurisdictionRequestSchema, { geoid: "0644000" }],
  ["SaveDraftRequestSchema", SaveDraftRequestSchema, { id: "d1" }],
] as const)("%s formUrl", (_name, schema, base) => {
  it("T19: null still clears the field", () => {
    const result = schema.safeParse({ ...base, formUrl: null })
    expect(result.success).toBe(true)
    expect(result.data?.formUrl).toBeNull()
  })

  it("T20: stays optional", () => {
    const result = schema.safeParse(base)
    expect(result.success).toBe(true)
    expect("formUrl" in (result.data ?? {})).toBe(false)
  })

  it("T21: caps the link at 2048 characters", () => {
    expect(schema.safeParse({ ...base, formUrl: L(2048) }).success).toBe(true)
    expect(issues(schema, { ...base, formUrl: L(2049) })).toMatchObject(tooBig)
  })

  it("T22: rejects a javascript: link", () => {
    expect(issues(schema, { ...base, formUrl: "javascript:alert(1)" })).toMatchObject(
      invalidUrl(["formUrl"]),
    )
  })
})
