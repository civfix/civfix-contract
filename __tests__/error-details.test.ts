import { describe, expect, it } from "vitest"
import { parseError } from "../src/client/client.js"
import { LegalVersionOutdatedDetailsSchema } from "../src/schemas/legal.js"
import { AppError, ErrorCode, toAppError } from "../src/types/errors.js"

const DETAILS = {
  reason: "legal_version_outdated",
  current: [{ type: "terms", version: "2026-10-25", sha256: "ab".repeat(32) }],
}

const conflict = (body: unknown): Response =>
  new Response(JSON.stringify(body), { status: 409, headers: { "content-type": "application/json" } })

describe("AppError details", () => {
  it("T28: carries details when given and leaves every other error as it was", () => {
    const withDetails = new AppError(ErrorCode.CONFLICT, "Outdated", { details: DETAILS })
    expect(withDetails.details).toEqual(DETAILS)
    expect(withDetails.toJSON()).toEqual({ code: "CONFLICT", message: "Outdated", details: DETAILS })

    const plain = new AppError(ErrorCode.CONFLICT, "Outdated")
    expect(plain).not.toHaveProperty("details")
    expect(Object.keys(plain.toJSON())).not.toContain("details")

    expect(AppError.validation({ email: "bad" }).toJSON()).toEqual({
      code: "VALIDATION",
      message: "Validation failed",
      fields: { email: "bad" },
    })
  })

  it("T32: parseError and toAppError keep a details object and drop a malformed one, never the envelope", async () => {
    const parsed = await parseError(conflict({ code: "CONFLICT", message: "m", requestId: "r1", details: DETAILS }))
    expect(parsed).toBeInstanceOf(AppError)
    expect(parsed.code).toBe(ErrorCode.CONFLICT)
    expect(parsed.httpStatus).toBe(409)
    expect(parsed.message).toBe("m")
    expect(parsed.requestId).toBe("r1")
    expect(parsed.details).toEqual(DETAILS)
    expect(LegalVersionOutdatedDetailsSchema.safeParse(parsed.details).success).toBe(true)

    for (const details of ["x", [1]]) {
      const malformed = await parseError(conflict({ code: "CONFLICT", message: "m", details }))
      expect(malformed.code, JSON.stringify(details)).toBe(ErrorCode.CONFLICT)
      expect(malformed.message, JSON.stringify(details)).toBe("m")
      expect(malformed, JSON.stringify(details)).not.toHaveProperty("details")
    }

    expect(await parseError(conflict({ code: "CONFLICT", message: "m" }))).not.toHaveProperty("details")

    expect(toAppError({ code: "CONFLICT", message: "m", details: { a: 1 } }).details).toEqual({ a: 1 })
    expect(toAppError({ code: "CONFLICT", message: "m", details: "x" })).not.toHaveProperty("details")
  })
})
