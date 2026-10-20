import { describe, it, expect, vi } from "vitest"
import { createApiClient } from "../src/client/client.js"
import { endpoints } from "../src/client/endpoints.js"
import {
  PressingReportsResponseSchema,
  ReportConfirmRequestSchema,
  ReportConfirmResponseSchema,
  ReportDTOSchema,
  ReportPinDTOSchema,
} from "../src/index.js"

const UUID = "123e4567-e89b-12d3-a456-426614174000"

function baseReport() {
  return {
    id: UUID,
    category: "trash" as const,
    status: "published" as const,
    visibility: "public" as const,
    lat: 34.05,
    lng: -118.24,
    geomSource: "device" as const,
    createdAt: "2026-06-01T12:00:00.000Z",
    mine: false,
    gov: false,
    following: false,
    media: [],
    timeline: [],
  }
}

function basePin() {
  return {
    id: UUID,
    category: "trash" as const,
    lat: 34.05,
    lng: -118.24,
    status: "published" as const,
  }
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  })
}

describe("ReportDTO fixed votes", () => {
  it("T1: parses a body without fixedCount and fixedByMe as 0 and false", () => {
    const r = ReportDTOSchema.parse(baseReport())
    expect(r.fixedCount).toBe(0)
    expect(r.fixedByMe).toBe(false)
  })

  it("T2: rejects fixedCount -1", () => {
    expect(ReportDTOSchema.safeParse({ ...baseReport(), fixedCount: -1 }).success).toBe(false)
  })

  it("T10: rejects fixedCount 1.5", () => {
    expect(ReportDTOSchema.safeParse({ ...baseReport(), fixedCount: 1.5 }).success).toBe(false)
  })

  it("T11: carries fixedCount 2 and fixedByMe true", () => {
    const r = ReportDTOSchema.parse({ ...baseReport(), fixedCount: 2, fixedByMe: true })
    expect(r.fixedCount).toBe(2)
    expect(r.fixedByMe).toBe(true)
  })
})

describe("ReportPinDTO fixedCount", () => {
  it("T3: parses a pin without fixedCount as 0, and carries 2", () => {
    expect(ReportPinDTOSchema.parse(basePin()).fixedCount).toBe(0)
    expect(ReportPinDTOSchema.parse({ ...basePin(), fixedCount: 2 }).fixedCount).toBe(2)
  })

  it("T12: rejects fixedCount -1, and 0.5", () => {
    expect(ReportPinDTOSchema.safeParse({ ...basePin(), fixedCount: -1 }).success).toBe(false)
    expect(ReportPinDTOSchema.safeParse({ ...basePin(), fixedCount: 0.5 }).success).toBe(false)
  })

  it("T13: fills fixedCount 0 on a pressing list pin without it", () => {
    const res = PressingReportsResponseSchema.parse({ items: [basePin()] })
    expect(res.items[0]!.fixedCount).toBe(0)
  })
})

describe("ReportConfirmResponse fixed votes", () => {
  it("T4: parses a 0.62.0 body with fixedCount 0 and fixedByMe false", () => {
    expect(ReportConfirmResponseSchema.parse({ confirmCount: 1, confirmedByMe: true })).toEqual({
      confirmCount: 1,
      confirmedByMe: true,
      fixedCount: 0,
      fixedByMe: false,
    })
  })

  it("T5: parses a four-field body unchanged", () => {
    const body = { confirmCount: 0, confirmedByMe: false, fixedCount: 3, fixedByMe: true }
    expect(ReportConfirmResponseSchema.parse(body)).toEqual(body)
  })

  it("T14: rejects fixedCount -1, and 0.5", () => {
    const body = { confirmCount: 0, confirmedByMe: false, fixedByMe: false }
    expect(ReportConfirmResponseSchema.safeParse({ ...body, fixedCount: -1 }).success).toBe(false)
    expect(ReportConfirmResponseSchema.safeParse({ ...body, fixedCount: 0.5 }).success).toBe(false)
  })
})

describe("ReportConfirmRequest", () => {
  it("T9: rejects an id that is not a UUID", () => {
    expect(ReportConfirmRequestSchema.safeParse({ id: "not-a-uuid" }).success).toBe(false)
  })
})

describe("markReportFixed / unmarkReportFixed registry entries", () => {
  it("T6: registers markReportFixed as POST /reports/:id/fixed, auth required, csrf, v1", () => {
    expect(endpoints.markReportFixed).toMatchObject({
      method: "POST",
      path: "/reports/:id/fixed",
      auth: "required",
      csrf: true,
      version: "v1",
    })
  })

  it("T7: registers unmarkReportFixed as DELETE /reports/:id/fixed, auth required, csrf, v1", () => {
    expect(endpoints.unmarkReportFixed).toMatchObject({
      method: "DELETE",
      path: "/reports/:id/fixed",
      auth: "required",
      csrf: true,
      version: "v1",
    })
  })

  it("T15: both take ReportConfirmRequestSchema and answer ReportConfirmResponseSchema", () => {
    for (const e of [endpoints.markReportFixed, endpoints.unmarkReportFixed]) {
      expect(e?.request).toBe(ReportConfirmRequestSchema)
      expect(e?.response).toBe(ReportConfirmResponseSchema)
    }
  })
})

describe("markReportFixed / unmarkReportFixed on the typed client", () => {
  it("T8: POSTs and DELETEs /v1/reports/<id>/fixed and returns the parsed four-field body", async () => {
    const calls: Array<{ url: string; method: string | undefined }> = []
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), method: init?.method })
      return jsonResponse({ confirmCount: 2, confirmedByMe: false, fixedCount: 1, fixedByMe: init?.method === "POST" })
    }) as unknown as typeof fetch
    const client = createApiClient({
      baseURL: "https://api.civfix.test",
      fetchImpl,
      getCsrfToken: () => "csrf-1",
    })

    expect(await client.markReportFixed({ id: UUID })).toEqual({
      confirmCount: 2,
      confirmedByMe: false,
      fixedCount: 1,
      fixedByMe: true,
    })
    expect(await client.unmarkReportFixed({ id: UUID })).toEqual({
      confirmCount: 2,
      confirmedByMe: false,
      fixedCount: 1,
      fixedByMe: false,
    })
    expect(calls).toEqual([
      { url: `https://api.civfix.test/v1/reports/${UUID}/fixed`, method: "POST" },
      { url: `https://api.civfix.test/v1/reports/${UUID}/fixed`, method: "DELETE" },
    ])
  })
})
