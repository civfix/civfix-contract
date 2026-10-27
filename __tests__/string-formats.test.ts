import { describe, expect, it } from "vitest"
import type { z } from "zod"
import { EmailOtpRequestRequestSchema, UserDTOSchema } from "../src/schemas/auth.js"
import { MessageThreadDTOSchema } from "../src/schemas/chat.js"
import { GuestRsvpRequestRequestSchema } from "../src/schemas/cleanups.js"
import { HostEventEmailSchema, HttpsUrlSchema } from "../src/schemas/entities.js"
import { SuggestContactRequestSchema } from "../src/schemas/map.js"
import { ServiceDateSchema } from "../src/schemas/admin/user-hours.js"

// These pin what the string formats accept, how they normalize and the issue clients receive, so a
// change of zod API (or a zod upgrade) that moves any of it fails here first.

function issue(schema: z.ZodType, input: unknown) {
  const result = schema.safeParse(input)
  if (result.success) throw new Error(`expected ${JSON.stringify(input)} to be rejected`)
  return result.error.issues.map(({ code, message, path, ...rest }) => ({
    code,
    message,
    path,
    format: "format" in rest ? rest.format : undefined,
  }))
}

const INVALID_EMAIL = [{ code: "invalid_format", format: "email", message: "Invalid email address", path: [] }]
const INVALID_URL = [{ code: "invalid_format", format: "url", message: "Invalid URL", path: [] }]
const INVALID_DATETIME = [{ code: "invalid_format", format: "datetime", message: "Invalid ISO datetime", path: [] }]

describe("email fields", () => {
  const email = EmailOtpRequestRequestSchema.shape.email

  it.each(["user@example.com", "First.Last+tag@Example.COM", "a@b.co", "a'b@example.com"])(
    "accepts %s unchanged",
    (value) => {
      expect(email.parse(value)).toBe(value)
    },
  )

  it.each([
    " a@b.co",
    "a..b@example.com",
    ".a@example.com",
    "a@localhost",
    "a@[127.0.0.1]",
    '"quoted"@example.com',
    "a@b",
    "a@-b.com",
    "a@b_c.com",
    "üñî@example.com",
    "a@exämple.com",
    "!#$%&'*+/=?^_`{|}~@x.com",
  ])("rejects %s as an invalid email", (value) => {
    expect(issue(email, value)).toEqual(INVALID_EMAIL)
  })

  it("rejects a non-string as invalid_type", () => {
    expect(issue(email, 42)).toEqual([
      { code: "invalid_type", message: "Invalid input: expected string, received number", path: [], format: undefined },
    ])
  })

  it("HostEventEmailSchema trims and lowercases before it checks the format", () => {
    expect(HostEventEmailSchema.parse("  Host@Example.COM  ")).toBe("host@example.com")
    expect(issue(HostEventEmailSchema, " ")).toEqual(INVALID_EMAIL)
    expect(issue(HostEventEmailSchema, `${"a".repeat(250)}@b.co`)).toEqual([
      { code: "too_big", message: "Too big: expected string to have <=254 characters", path: [], format: undefined },
    ])
  })

  it("a guest email is lowercased but not trimmed", () => {
    const guestEmail = GuestRsvpRequestRequestSchema.shape.email
    expect(guestEmail.parse("Guest@Example.com")).toBe("guest@example.com")
    expect(issue(guestEmail, " guest@example.com")).toEqual(INVALID_EMAIL)
  })
})

describe("URL fields", () => {
  const formUrl = SuggestContactRequestSchema.shape.formUrl

  it.each([
    "https://example.com",
    "http://x",
    "https://localhost:3000/x",
    "https://ü.com",
    "https:example.com",
    "ftp://x.com",
    "mailto:a@b.com",
    "custom-scheme://x",
    "javascript:alert(1)",
    "data:text/plain,hi",
    "file:///etc/passwd",
  ])("accepts %s (any protocol)", (value) => {
    expect(formUrl.parse(value)).toBe(value)
  })

  it("trims surrounding whitespace", () => {
    expect(formUrl.parse(" https://example.com")).toBe("https://example.com")
  })

  it.each(["example.com", "//example.com", "https://", "https://exa mple.com"])("rejects %s", (value) => {
    expect(issue(formUrl, value)).toEqual(INVALID_URL)
  })

  it("HttpsUrlSchema trims, caps at 500 characters and requires https://", () => {
    const base = "https://example.com/"
    expect(HttpsUrlSchema.parse("  https://example.com/a  ")).toBe("https://example.com/a")
    expect(HttpsUrlSchema.parse(base + "a".repeat(480))).toBe(base + "a".repeat(480))
    expect(issue(HttpsUrlSchema, base + "a".repeat(481))).toEqual([
      { code: "too_big", message: "Too big: expected string to have <=500 characters", path: [], format: undefined },
    ])
    for (const value of ["http://example.com", "javascript:alert(1)", "HTTPS://EXAMPLE.COM"]) {
      expect(issue(HttpsUrlSchema, value)).toEqual([
        {
          code: "invalid_format",
          format: "starts_with",
          message: 'Invalid string: must start with "https://"',
          path: [],
        },
      ])
    }
  })
})

describe("datetime fields", () => {
  const fields = [
    ["UserDTO.handleChangeableAt", UserDTOSchema.shape.handleChangeableAt],
    ["MessageThreadDTO.lastMessageAt", MessageThreadDTOSchema.shape.lastMessageAt],
  ] as const

  describe.each(fields)("%s", (_name, field) => {
    it.each(["2026-10-26T12:00:00Z", "2026-10-26T12:00:00.123Z", "2026-10-26T12:00:00.123456789Z"])(
      "accepts the UTC instant %s unchanged",
      (value) => {
        expect(field.parse(value)).toBe(value)
      },
    )

    it("stays nullable and optional", () => {
      expect(field.parse(null)).toBeNull()
      expect(field.parse(undefined)).toBeUndefined()
    })

    it.each([
      "2026-10-26T12:00:00+05:30",
      "2026-10-26T12:00:00-08:00",
      "2026-10-26T12:00:00+00:00",
      "2026-10-26T12:00Z",
      "2026-10-26T12:00:00",
      "2026-10-26",
      "2026-10-26 12:00:00Z",
      "2026-10-26t12:00:00z",
      "2026-02-30T00:00:00Z",
      "2026-10-26T24:00:00Z",
    ])("rejects %s (offsets, missing parts and impossible dates)", (value) => {
      expect(issue(field, value)).toEqual(INVALID_DATETIME)
    })
  })
})

describe("calendar date fields", () => {
  it.each(["2026-10-26", "2024-02-29"])("accepts %s", (value) => {
    expect(ServiceDateSchema.parse(value)).toBe(value)
  })

  it.each(["2026-02-29", "2026-13-01", "2026-1-1", "2026-10-26T00:00:00Z"])("rejects %s", (value) => {
    expect(issue(ServiceDateSchema, value)).toEqual([
      { code: "invalid_format", format: "date", message: "Invalid ISO date", path: [] },
    ])
  })
})
