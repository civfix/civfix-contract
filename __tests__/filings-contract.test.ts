import { describe, it, expect } from "vitest"
import {
  AdminFilingDTOSchema,
  CancelFilingRequestSchema,
  CancelFilingResponseSchema,
  FILING_CASE_ID_PATTERN,
  FILING_LIST_PAGE_MAX,
  FILING_NOTE_MAX,
  FILING_REQUEST_TYPE_HINT_MAX,
  FILING_ROUTES_MAX,
  FILING_SENDER_DOMAINS_MAX,
  FileReportRequestSchema,
  FileReportResponseSchema,
  FilingChannelSchema,
  FilingEvidenceDTOSchema,
  FilingEvidenceKindSchema,
  FilingGroupSchema,
  FilingMethodSchema,
  FilingReasonSchema,
  FilingRouteDTOSchema,
  FilingRouteInputSchema,
  FilingSettingsDTOSchema,
  FilingStatusSchema,
  GetFilingRequestSchema,
  GetFilingResponseSchema,
  GetFilingSettingsRequestSchema,
  GetFilingSettingsResponseSchema,
  ListFilingRoutesRequestSchema,
  ListFilingRoutesResponseSchema,
  ListFilingsRequestSchema,
  ListFilingsResponseSchema,
  RecordManualFilingRequestSchema,
  RecordManualFilingResponseSchema,
  RetryFilingRequestSchema,
  RetryFilingResponseSchema,
  SaveFilingRoutesRequestSchema,
  SaveFilingRoutesResponseSchema,
  SetFilingSettingsRequestSchema,
  SetFilingSettingsResponseSchema,
} from "../src/schemas/admin/filings.js"
import { AdminReportDTOSchema } from "../src/schemas/admin/reports.js"
import { HomeSummaryResponseSchema } from "../src/schemas/admin/home.js"
import {
  DEFAULT_FORWARD_BODY_TEMPLATE,
  FORWARD_TEMPLATE_VARIABLES,
  forwardTemplateIssues,
} from "../src/schemas/admin/forward-template.js"
import { ReportCategorySchema } from "../src/schemas/common.js"
import { ReportDTOSchema, ReportFilingDTOSchema } from "../src/schemas/entities.js"

const UUID = "123e4567-e89b-12d3-a456-426614174000"
const AT = "2026-10-19T12:00:00.000Z"
const PORTAL_BASE = "https://myla311.lacity.gov/"

const portal = {
  category: "graffiti",
  channel: "portal",
  formUrl: "https://myla311.lacity.gov/s/",
  requestTypeHint: "Graffiti Removal",
  includeLink: true,
  statusSenderDomains: ["lacity.org"],
  enabled: true,
}

const emailDefault = { category: null, channel: "email", formUrl: null, requestTypeHint: null }

const routeFor = (category: string | null) => ({ ...emailDefault, category })

const urlOfLength = (base: string, length: number) => base + "a".repeat(length - base.length)

const passes = (schema: { safeParse: (v: unknown) => { success: boolean } }, value: unknown) =>
  schema.safeParse(value).success

const evidence = {
  id: "e1",
  kind: "screenshot",
  label: "Confirmation page",
  url: "https://media.example/e1.png?sig=abc",
  createdAt: AT,
}

const filing = {
  id: "f1",
  reportId: UUID,
  reportTitle: "Tag on wall",
  referenceCode: "LA-06-000001",
  geoid: "0644000",
  jurisdictionName: "Los Angeles",
  category: "graffiti",
  channel: "portal",
  portalHost: "myla311.lacity.gov",
  status: "submitted",
  method: "script",
  reason: null,
  reasonDetail: null,
  caseId: "1-2345678901",
  caseUrl: "https://myla311.lacity.gov/s/case/1",
  cityClosedAt: null,
  attempts: 1,
  scriptVersion: "myla311@3",
  dryRun: false,
  ticketText: "Tag on wall\n\nReported by a resident via CivFix · ref LA-06-000001",
  createdAt: AT,
  updatedAt: AT,
  submittedAt: AT,
}

const nullFiling = {
  ...filing,
  referenceCode: null,
  geoid: null,
  jurisdictionName: null,
  channel: null,
  portalHost: null,
  status: "needs_human",
  method: null,
  reason: null,
  reasonDetail: null,
  caseId: null,
  caseUrl: null,
  cityClosedAt: null,
  scriptVersion: null,
  submittedAt: null,
}

const health = { lastFiledAt: AT, lastFailedAt: null, scriptVersion: "myla311@3" }
const routeDto = { ...portal, health }
const settings = { paused: false, automaticFiling: true }
const counts = { needs_human: 0, in_progress: 0 }

const reportFiling = {
  jurisdictionName: "Los Angeles",
  caseId: "1-2345678901",
  caseUrl: "https://myla311.lacity.gov/s/case/1",
  filedAt: AT,
  linkedExisting: false,
}

const listPage = (items: unknown[]) => ({ items, nextCursor: null, counts })

function baseReport() {
  return {
    id: UUID,
    category: "graffiti" as const,
    status: "acknowledged" as const,
    visibility: "public" as const,
    lat: 34.05,
    lng: -118.24,
    geomSource: "device" as const,
    createdAt: AT,
    mine: false,
    gov: true,
    following: false,
    media: [],
    timeline: [],
  }
}

const adminReport = {
  id: "REP-1",
  category: "graffiti",
  status: "in_progress",
  flagged: false,
  title: "Tag on wall",
  place: "Los Angeles, CA",
  reporter: { id: null, name: "Ada Neighbor", handle: "ada", joined: "Jan 2026" },
  confirmations: 3,
  submitted: { rel: "2h ago", abs: "Jun 3, 2026, 4:12 PM" },
  coords: [34.05, -118.24],
  address: "100 Main St",
  hasPhoto: true,
  desc: "Spray paint",
  timeline: [{ who: "Ada", what: "Submitted", when: "2h ago", kind: "submit" }],
  city: { dept: "Public Works", place: "Los Angeles, CA", contact: "pw@lacity.org", routed: true },
  media: [{ id: "m1", kind: "image", url: "https://r2/x.jpg" }],
}

const homeSummary = {
  discovery: { queue: 12, reportsWaiting: 40, overSla: 3 },
  reports: { flagged: 2, inProgress: 7, completed: 31 },
  events: { upcoming: 5, live: 1, attending: 88 },
  mail: { unread: 4, needsAction: 2 },
  users: { flagged: 1, highRisk: 2, suspended: 0 },
  analytics: {
    pinsThisMonth: 240,
    resolvedPct: 89,
    coveragePct: 62,
    cleanups: 34,
    eventsThisMonth: 12,
    newUsers: 140,
    pinsByWeek: [10, 20, 15, 30, 25, 40, 35, 50],
  },
  livePins24h: 18,
}

describe("FilingRouteInput formUrl", () => {
  it("T1: a portal route with formUrl null fails", () => {
    expect(passes(FilingRouteInputSchema, { ...portal, formUrl: null })).toBe(false)
  })

  it("T2: a portal route with an http formUrl fails", () => {
    expect(passes(FilingRouteInputSchema, { ...portal, formUrl: "http://myla311.lacity.gov/s/" })).toBe(false)
  })

  it("T3: a portal formUrl on an IP literal fails, however it is spelled", () => {
    for (const formUrl of [
      "https://10.0.0.1/",
      "https://[::1]/",
      "https://2130706433/",
      "https://0x7f.0.0.1/",
    ]) {
      expect(passes(FilingRouteInputSchema, { ...portal, formUrl }), formUrl).toBe(false)
    }
  })

  it("T4: a portal formUrl on localhost, a .localhost subdomain, .local or .internal fails", () => {
    for (const formUrl of ["https://localhost/", "https://foo.localhost/", "https://x.local/", "https://x.internal/"]) {
      expect(passes(FilingRouteInputSchema, { ...portal, formUrl }), formUrl).toBe(false)
    }
  })

  it("T5: a portal formUrl on civfix.org, civfix.dev or a subdomain fails", () => {
    for (const formUrl of ["https://civfix.org/a", "https://api.civfix.dev/", "https://CIVFIX.ORG/"]) {
      expect(passes(FilingRouteInputSchema, { ...portal, formUrl }), formUrl).toBe(false)
    }
  })

  it("T6: a portal formUrl on notcivfix.org passes", () => {
    expect(passes(FilingRouteInputSchema, { ...portal, formUrl: "https://notcivfix.org/" })).toBe(true)
  })

  it("T7: a portal formUrl with userinfo, punycode or a trailing dot fails", () => {
    for (const formUrl of [
      "https://u@myla311.lacity.gov/",
      "https://xn--80ak6aa92e.com/",
      "https://myla311.lacity.gov./",
    ]) {
      expect(passes(FilingRouteInputSchema, { ...portal, formUrl }), formUrl).toBe(false)
    }
  })

  it("T8: a portal formUrl of 2049 characters fails; of 2048 passes", () => {
    const long = urlOfLength(PORTAL_BASE, 2049)
    const max = urlOfLength(PORTAL_BASE, 2048)
    expect(long.length).toBe(2049)
    expect(max.length).toBe(2048)
    expect(passes(FilingRouteInputSchema, { ...portal, formUrl: long })).toBe(false)
    expect(passes(FilingRouteInputSchema, { ...portal, formUrl: max })).toBe(true)
  })

  it("T38: a portal formUrl on a .localhost subdomain fails; a public host containing localhost passes", () => {
    for (const formUrl of ["https://foo.localhost/", "https://a.b.localhost/", "https://FOO.LOCALHOST/"]) {
      expect(passes(FilingRouteInputSchema, { ...portal, formUrl }), formUrl).toBe(false)
    }
    for (const formUrl of ["https://notlocalhost.com/", "https://localhost.lacity.gov/"]) {
      expect(passes(FilingRouteInputSchema, { ...portal, formUrl }), formUrl).toBe(true)
    }
  })
})

describe("FilingRouteInput shape", () => {
  it("T9: a full portal route passes unchanged", () => {
    expect(FilingRouteInputSchema.parse(portal)).toEqual(portal)
  })

  it("T10: an email default route parses with includeLink, statusSenderDomains and enabled defaulted", () => {
    expect(FilingRouteInputSchema.parse(emailDefault)).toEqual({
      ...emailDefault,
      includeLink: true,
      statusSenderDomains: [],
      enabled: true,
    })
  })

  it("T11: category, formUrl, requestTypeHint and channel are required keys", () => {
    for (const key of ["category", "formUrl", "requestTypeHint", "channel"] as const) {
      const input = Object.fromEntries(Object.entries(emailDefault).filter(([k]) => k !== key))
      expect(passes(FilingRouteInputSchema, input), `without ${key}`).toBe(false)
    }
  })

  it("T12: an email or manual route with a non-null formUrl fails", () => {
    for (const channel of ["email", "manual"]) {
      expect(
        passes(FilingRouteInputSchema, { ...emailDefault, channel, formUrl: "https://myla311.lacity.gov/s/" }),
        channel,
      ).toBe(false)
    }
  })

  it("T13: a sender domain is trimmed and lowercased", () => {
    expect(
      FilingRouteInputSchema.parse({ ...emailDefault, statusSenderDomains: [" LACity.org "] }).statusSenderDomains,
    ).toEqual(["lacity.org"])
  })

  it("T14: too many, malformed or duplicate sender domains fail", () => {
    const cases: string[][] = [
      ["a.gov", "b.gov", "c.gov", "d.gov", "e.gov", "f.gov"],
      ["lacity.org/x"],
      ["noreply@lacity.org"],
      ["lacity.org:443"],
      ["lacity"],
      ["lacity.org."],
      ["10.0.0.1"],
      ["lacity.org", "LACITY.org"],
    ]
    for (const statusSenderDomains of cases) {
      expect(
        passes(FilingRouteInputSchema, { ...emailDefault, statusSenderDomains }),
        JSON.stringify(statusSenderDomains),
      ).toBe(false)
    }
  })

  it("T15: a requestTypeHint of 201 characters fails; of 200 passes", () => {
    expect(passes(FilingRouteInputSchema, { ...portal, requestTypeHint: "a".repeat(201) })).toBe(false)
    expect(passes(FilingRouteInputSchema, { ...portal, requestTypeHint: "a".repeat(200) })).toBe(true)
  })
})

describe("SaveFilingRoutesRequest", () => {
  const distinct = [...ReportCategorySchema.options, null].map(routeFor)

  it("T16: 9 routes, a repeated category, a repeated default or no geoid fails", () => {
    expect(passes(SaveFilingRoutesRequestSchema, { geoid: "0644000", routes: [...distinct, routeFor("trash")] })).toBe(
      false,
    )
    expect(
      passes(SaveFilingRoutesRequestSchema, { geoid: "0644000", routes: [routeFor("graffiti"), routeFor("graffiti")] }),
    ).toBe(false)
    expect(passes(SaveFilingRoutesRequestSchema, { geoid: "0644000", routes: [routeFor(null), routeFor(null)] })).toBe(
      false,
    )
    expect(passes(SaveFilingRoutesRequestSchema, { routes: [] })).toBe(false)
  })

  it("T17: no routes, or 8 routes with distinct categories, passes", () => {
    expect(distinct).toHaveLength(8)
    expect(passes(SaveFilingRoutesRequestSchema, { geoid: "0644000", routes: [] })).toBe(true)
    expect(passes(SaveFilingRoutesRequestSchema, { geoid: "0644000", routes: distinct })).toBe(true)
  })
})

describe("RecordManualFilingRequest", () => {
  it("T18: a request number with digits, spaces and ._#/- passes", () => {
    for (const caseId of ["1-2345678901", "1 2/3#4._-"]) {
      expect(passes(RecordManualFilingRequestSchema, { id: "f1", caseId }), caseId).toBe(true)
    }
  })

  it("T19: an empty, dash-led, 65-character or markup request number fails", () => {
    for (const caseId of ["", "-abc", "a".repeat(65), "<b>"]) {
      expect(passes(RecordManualFilingRequestSchema, { id: "f1", caseId }), caseId).toBe(false)
    }
  })

  it("T20: caseUrl must be a safe https URL of at most 2048 characters, and is optional", () => {
    const base = { id: "f1", caseId: "1-2345678901" }
    expect(passes(RecordManualFilingRequestSchema, { ...base, caseUrl: "http://x.gov/1" })).toBe(false)
    expect(passes(RecordManualFilingRequestSchema, { ...base, caseUrl: urlOfLength(PORTAL_BASE, 2049) })).toBe(false)
    expect(
      passes(RecordManualFilingRequestSchema, { ...base, caseUrl: "https://myla311.lacity.gov/s/case/1" }),
    ).toBe(true)
    expect(passes(RecordManualFilingRequestSchema, base)).toBe(true)
  })
})

describe("filing request notes and required fields", () => {
  it("T21: a note of 501 characters fails; of 500 passes", () => {
    const bodies: Array<[{ safeParse: (v: unknown) => { success: boolean } }, Record<string, unknown>]> = [
      [FileReportRequestSchema, { id: UUID }],
      [CancelFilingRequestSchema, { id: "f1" }],
      [RecordManualFilingRequestSchema, { id: "f1", caseId: "1-2345678901" }],
    ]
    for (const [schema, body] of bodies) {
      expect(passes(schema, { ...body, note: "a".repeat(501) })).toBe(false)
      expect(passes(schema, { ...body, note: "a".repeat(500) })).toBe(true)
    }
  })

  it("T22: a request without its path parameter or required field fails", () => {
    expect(passes(FileReportRequestSchema, {})).toBe(false)
    expect(passes(GetFilingRequestSchema, {})).toBe(false)
    expect(passes(RetryFilingRequestSchema, {})).toBe(false)
    expect(passes(CancelFilingRequestSchema, {})).toBe(false)
    expect(passes(RecordManualFilingRequestSchema, { caseId: "1-2345678901" })).toBe(false)
    expect(passes(ListFilingRoutesRequestSchema, {})).toBe(false)
    expect(passes(SaveFilingRoutesRequestSchema, { routes: [] })).toBe(false)
    expect(passes(ListFilingsRequestSchema, {})).toBe(false)
    expect(passes(SetFilingSettingsRequestSchema, {})).toBe(false)
  })

  it("T23: every new request schema rejects an unknown key", () => {
    const valid: Array<[string, { safeParse: (v: unknown) => { success: boolean } }, Record<string, unknown>]> = [
      ["fileReport", FileReportRequestSchema, { id: UUID }],
      ["listFilings", ListFilingsRequestSchema, { group: "needs_human" }],
      ["getFiling", GetFilingRequestSchema, { id: "f1" }],
      ["retryFiling", RetryFilingRequestSchema, { id: "f1" }],
      ["cancelFiling", CancelFilingRequestSchema, { id: "f1" }],
      ["recordManualFiling", RecordManualFilingRequestSchema, { id: "f1", caseId: "1-2345678901" }],
      ["getFilingSettings", GetFilingSettingsRequestSchema, {}],
      ["setFilingSettings", SetFilingSettingsRequestSchema, { paused: true }],
      ["listFilingRoutes", ListFilingRoutesRequestSchema, { geoid: "0644000" }],
      ["saveFilingRoutes", SaveFilingRoutesRequestSchema, { geoid: "0644000", routes: [] }],
    ]
    for (const [name, schema, body] of valid) {
      expect(passes(schema, body), name).toBe(true)
      expect(passes(schema, { ...body, extra: 1 }), name).toBe(false)
    }
  })
})

describe("filing DTOs and responses", () => {
  it("T29: every new DTO and response schema rejects an unknown key", () => {
    const valid: Array<[string, { safeParse: (v: unknown) => { success: boolean } }, Record<string, unknown>]> = [
      ["FilingEvidenceDTO", FilingEvidenceDTOSchema, evidence],
      ["AdminFilingDTO", AdminFilingDTOSchema, filing],
      ["FilingRouteDTO", FilingRouteDTOSchema, routeDto],
      ["FilingSettingsDTO", FilingSettingsDTOSchema, settings],
      ["ReportFilingDTO", ReportFilingDTOSchema, reportFiling],
      ["FileReportResponse", FileReportResponseSchema, { filing }],
      ["ListFilingsResponse", ListFilingsResponseSchema, listPage([filing])],
      ["GetFilingResponse", GetFilingResponseSchema, { filing: { ...filing, evidence: [evidence] } }],
      ["RetryFilingResponse", RetryFilingResponseSchema, { filing }],
      ["CancelFilingResponse", CancelFilingResponseSchema, { filing }],
      ["RecordManualFilingResponse", RecordManualFilingResponseSchema, { filing }],
      ["GetFilingSettingsResponse", GetFilingSettingsResponseSchema, settings],
      ["SetFilingSettingsResponse", SetFilingSettingsResponseSchema, settings],
      ["ListFilingRoutesResponse", ListFilingRoutesResponseSchema, { routes: [routeDto] }],
      ["SaveFilingRoutesResponse", SaveFilingRoutesResponseSchema, { routes: [routeDto] }],
    ]
    for (const [name, schema, payload] of valid) {
      expect(passes(schema, payload), name).toBe(true)
      expect(passes(schema, { ...payload, extra: 1 }), name).toBe(false)
    }

    expect(passes(FilingRouteDTOSchema, { ...routeDto, health: { ...health, extra: 1 } }), "health").toBe(false)
    expect(passes(ListFilingsResponseSchema, { ...listPage([filing]), counts: { ...counts, extra: 1 } }), "counts").toBe(
      false,
    )
    const filingRoute = { channel: "portal", target: "myla311.lacity.gov" }
    expect(passes(AdminReportDTOSchema, { ...adminReport, filingRoute }), "filingRoute").toBe(true)
    expect(passes(AdminReportDTOSchema, { ...adminReport, filingRoute: { ...filingRoute, extra: 1 } }), "filingRoute").toBe(
      false,
    )
  })

  it("T24: an all-null filing without evidence is a valid AdminFilingDTO and fileReport response, but not a getFiling one", () => {
    expect(passes(AdminFilingDTOSchema, nullFiling)).toBe(true)
    expect(passes(FileReportResponseSchema, { filing: nullFiling })).toBe(true)
    expect(passes(GetFilingResponseSchema, { filing: nullFiling })).toBe(false)
  })
})

describe("resident and admin report fields", () => {
  it("T26: ReportDTO takes no filing, a null filing, a full filing or one with nulls", () => {
    const cases: Array<Record<string, unknown>> = [
      baseReport(),
      { ...baseReport(), filing: null },
      { ...baseReport(), filing: reportFiling },
      { ...baseReport(), filing: { ...reportFiling, jurisdictionName: null, caseId: null, caseUrl: null } },
    ]
    for (const report of cases) {
      const parsed = ReportDTOSchema.safeParse(report)
      expect(parsed.success, JSON.stringify(report.filing)).toBe(true)
      expect(parsed.data && "filing" in parsed.data ? parsed.data.filing : undefined).toEqual(report.filing)
    }
  })

  it("T27: today's admin report and home summary still parse, and the new fields take null", () => {
    expect(passes(AdminReportDTOSchema, adminReport)).toBe(true)
    expect(HomeSummaryResponseSchema.parse(homeSummary)).toMatchObject({ filingsNeedsHuman: 0 })
    expect(
      passes(AdminReportDTOSchema, { ...adminReport, filing: null, filingRoute: { channel: "manual", target: null } }),
    ).toBe(true)
    expect(passes(AdminReportDTOSchema, { ...adminReport, filingRoute: null })).toBe(true)
  })

  it("T34: filingsNeedsHuman is a non-negative integer", () => {
    expect(passes(HomeSummaryResponseSchema, { ...homeSummary, filingsNeedsHuman: -1 })).toBe(false)
    expect(passes(HomeSummaryResponseSchema, { ...homeSummary, filingsNeedsHuman: 1.5 })).toBe(false)
    expect(HomeSummaryResponseSchema.parse({ ...homeSummary, filingsNeedsHuman: 3 })).toMatchObject({
      filingsNeedsHuman: 3,
    })
  })
})

describe("forward template", () => {
  it("T28: the default body drops the photo paragraph and keeps the other four", () => {
    expect(DEFAULT_FORWARD_BODY_TEMPLATE).not.toContain("{photoLinks}")
    expect(DEFAULT_FORWARD_BODY_TEMPLATE).not.toContain("{photoCount}")
    expect(DEFAULT_FORWARD_BODY_TEMPLATE).not.toContain("Photo/Video Links")
    expect(DEFAULT_FORWARD_BODY_TEMPLATE).toBe(
      [
        "A resident reported a {category} issue in {place} through civfix on {submittedDate}. Replies to this email go to civfix operators and to the reporter.",
        "Location: {address}\nCoordinates: {coordinates}\nView the exact location on a map: {mapLink}",
        "What was reported:\n{description}",
        "replies to this email are made public at https://civfix.org/pin/{reportId}",
      ].join("\n\n"),
    )
    const tokens = FORWARD_TEMPLATE_VARIABLES.map((v) => v.token)
    expect(tokens).toContain("{photoCount}")
    expect(tokens).toContain("{photoLinks}")
    expect(forwardTemplateIssues(DEFAULT_FORWARD_BODY_TEMPLATE)).toEqual([])
  })
})

describe("filing enums, list and limits", () => {
  it("T30: the six enums hold D15's values in order", () => {
    expect(FilingChannelSchema.options).toEqual(["email", "portal", "manual"])
    expect(FilingStatusSchema.options).toEqual([
      "queued",
      "running",
      "submitted",
      "linked_existing",
      "needs_human",
      "cancelled",
    ])
    expect(FilingMethodSchema.options).toEqual(["email", "script", "operator"])
    expect(FilingGroupSchema.options).toEqual(["needs_human", "in_progress", "filed", "cancelled"])
    expect(FilingEvidenceKindSchema.options).toEqual(["screenshot", "script"])
    expect(FilingReasonSchema.options).toEqual([
      "no_route",
      "route_disabled",
      "manual_route",
      "filing_off",
      "dry_run",
      "captcha",
      "login_required",
      "missing_info",
      "portal_error",
      "attempts_exhausted",
      "uncertain_submission",
      "ai_unavailable",
      "city_needs_info",
      "reopened_after_city_closed",
      "other",
    ])
  })

  it("T31: listFilings takes a group and a cursor, and returns at most 50 items with counts", () => {
    expect(passes(ListFilingsRequestSchema, { group: "filed" })).toBe(true)
    expect(passes(ListFilingsRequestSchema, { group: "filed", cursor: "abc" })).toBe(true)
    expect(passes(ListFilingsRequestSchema, { group: "running" })).toBe(false)
    const fifty = Array.from({ length: 50 }, (_, i) => ({ ...filing, id: `f${i}` }))
    expect(passes(ListFilingsResponseSchema, listPage(fifty))).toBe(true)
    expect(passes(ListFilingsResponseSchema, listPage([...fifty, { ...filing, id: "f50" }]))).toBe(false)
    expect(passes(ListFilingsResponseSchema, { items: fifty, nextCursor: null })).toBe(false)
  })

  it("T32: five distinct sender domains and a 253-character one pass; 254 characters fails", () => {
    const five = ["a.gov", "b.gov", "c.gov", "d.gov", "e.gov"]
    const d253 = "a".repeat(249) + ".gov"
    const d254 = "a".repeat(250) + ".gov"
    expect(d253).toHaveLength(253)
    expect(d254).toHaveLength(254)
    expect(passes(FilingRouteInputSchema, { ...emailDefault, statusSenderDomains: five })).toBe(true)
    expect(passes(FilingRouteInputSchema, { ...emailDefault, statusSenderDomains: [d253] })).toBe(true)
    expect(passes(FilingRouteInputSchema, { ...emailDefault, statusSenderDomains: [d254] })).toBe(false)
  })

  it("T33: recordManualFiling requires caseId", () => {
    expect(passes(RecordManualFilingRequestSchema, { id: "f1" })).toBe(false)
    expect(passes(RecordManualFilingRequestSchema, { id: "f1", caseId: "1-2345678901" })).toBe(true)
  })

  it("T35: the filing limits are exported", () => {
    expect(FILING_NOTE_MAX).toBe(500)
    expect(FILING_REQUEST_TYPE_HINT_MAX).toBe(200)
    expect(FILING_SENDER_DOMAINS_MAX).toBe(5)
    expect(FILING_ROUTES_MAX).toBe(8)
    expect(FILING_LIST_PAGE_MAX).toBe(50)
    expect(FILING_CASE_ID_PATTERN.source).toBe("^[A-Za-z0-9][A-Za-z0-9 ._#/-]{0,63}$")
  })

  it("T37: filing settings take an empty request and a boolean paused, and return both flags", () => {
    expect(passes(GetFilingSettingsRequestSchema, {})).toBe(true)
    expect(passes(SetFilingSettingsRequestSchema, { paused: true })).toBe(true)
    expect(passes(SetFilingSettingsRequestSchema, { paused: "true" })).toBe(false)
    expect(passes(FilingSettingsDTOSchema, { paused: false, automaticFiling: true })).toBe(true)
    expect(passes(FilingSettingsDTOSchema, { paused: false })).toBe(false)
  })
})
