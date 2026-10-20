import { z } from "zod"
import { CursorSchema, pageResponse, ReportCategorySchema } from "../common.js"
import { isSafeHttpsUrl, unsafeHostReason } from "../../markdown/safe-url.js"

/**
 * City filing: an approved report is filed with its jurisdiction by email, by a portal script or by an
 * operator, through the route saved for its (geoid, category). See DECISIONS §62.
 */

export const FILING_NOTE_MAX = 500
export const FILING_REQUEST_TYPE_HINT_MAX = 200
export const FILING_SENDER_DOMAINS_MAX = 5
export const FILING_ROUTES_MAX = 8
export const FILING_LIST_PAGE_MAX = 50
const HOSTNAME_MAX = 253

/** A city request number. The backend also checks every number a script or a city message yields against it. */
export const FILING_CASE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 ._#/-]{0,63}$/

export const FilingChannelSchema = z.enum(["email", "portal", "manual"])
export type FilingChannel = z.infer<typeof FilingChannelSchema>

export const FilingStatusSchema = z.enum([
  "queued",
  "running",
  "submitted",
  "linked_existing",
  "needs_human",
  "cancelled",
])
export type FilingStatus = z.infer<typeof FilingStatusSchema>

/** Who completed the filing. */
export const FilingMethodSchema = z.enum(["email", "script", "operator"])
export type FilingMethod = z.infer<typeof FilingMethodSchema>

/** The filings list tabs: in_progress is queued + running, filed is submitted + linked_existing. */
export const FilingGroupSchema = z.enum(["needs_human", "in_progress", "filed", "cancelled"])
export type FilingGroup = z.infer<typeof FilingGroupSchema>

export const FilingEvidenceKindSchema = z.enum(["screenshot", "script"])
export type FilingEvidenceKind = z.infer<typeof FilingEvidenceKindSchema>

export const FilingReasonSchema = z.enum([
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
export type FilingReason = z.infer<typeof FilingReasonSchema>

const isCivfixHost = (host: string): boolean =>
  ["civfix.org", "civfix.dev"].some((own) => host === own || host.endsWith(`.${own}`))

// The filer opens this URL in a browser on the server, so it must not reach a private address or our
// own hosts. The WHATWG hostname is checked as well as the raw authority: it normalizes spellings such
// as `2130706433` and `0x7f.0.0.1` into the IP literal they are.
function isFilingPortalUrl(value: string): boolean {
  if (!isSafeHttpsUrl(value)) return false
  let host: string
  try {
    host = new URL(value).hostname
  } catch {
    return false
  }
  return (
    unsafeHostReason(host) === null &&
    host !== "localhost" &&
    !host.endsWith(".localhost") &&
    !host.endsWith(".local") &&
    !host.endsWith(".internal") &&
    !isCivfixHost(host)
  )
}

const FilingPortalUrlSchema = z.string().trim().refine(isFilingPortalUrl, {
  message: "Portal URL must be a public https URL outside civfix.",
})

const StatusSenderDomainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine(
    (d) => unsafeHostReason(d) === null && d.includes(".") && d.length <= HOSTNAME_MAX,
    { message: "Sender domain must be a hostname such as lacity.org." },
  )

const StatusSenderDomainsSchema = z
  .array(StatusSenderDomainSchema)
  .max(FILING_SENDER_DOMAINS_MAX)
  .refine((domains) => new Set(domains).size === domains.length, {
    message: "Each sender domain may appear once.",
  })
  .default([])

/** One saved route of a jurisdiction. A null category is the jurisdiction's default route. */
export const FilingRouteInputSchema = z
  .object({
    category: ReportCategorySchema.nullable(),
    channel: FilingChannelSchema,
    /** The portal start URL: set exactly when the channel is portal. */
    formUrl: FilingPortalUrlSchema.nullable(),
    /** A hint for choosing the portal's request type. */
    requestTypeHint: z.string().max(FILING_REQUEST_TYPE_HINT_MAX).nullable(),
    /** Whether the ticket carries the public report URL. */
    includeLink: z.boolean().default(true),
    /** The hostnames whose city mail about this route's filings is trusted. Empty trusts none. */
    statusSenderDomains: StatusSenderDomainsSchema,
    enabled: z.boolean().default(true),
  })
  .strict()
  .superRefine((route, ctx) => {
    if ((route.channel === "portal") !== (route.formUrl !== null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["formUrl"],
        message: "A portal route needs a form URL, and only a portal route takes one.",
      })
    }
  })
export type FilingRouteInput = z.infer<typeof FilingRouteInputSchema>

export const FilingRouteHealthSchema = z
  .object({
    lastFiledAt: z.string().nullable(),
    lastFailedAt: z.string().nullable(),
    scriptVersion: z.string().nullable(),
  })
  .strict()
export type FilingRouteHealth = z.infer<typeof FilingRouteHealthSchema>

/** A saved route as the server returns it, already validated, with its recent outcomes. */
export const FilingRouteDTOSchema = z
  .object({
    category: ReportCategorySchema.nullable(),
    channel: FilingChannelSchema,
    formUrl: z.string().nullable(),
    requestTypeHint: z.string().nullable(),
    includeLink: z.boolean(),
    statusSenderDomains: z.array(z.string()),
    enabled: z.boolean(),
    health: FilingRouteHealthSchema,
  })
  .strict()
export type FilingRouteDTO = z.infer<typeof FilingRouteDTOSchema>

export const FilingEvidenceDTOSchema = z
  .object({
    id: z.string(),
    kind: FilingEvidenceKindSchema,
    label: z.string(),
    /** A signed GET that expires 15 minutes after the response: never cache it, refetch the filing. */
    url: z.string(),
    createdAt: z.string(),
  })
  .strict()
export type FilingEvidenceDTO = z.infer<typeof FilingEvidenceDTOSchema>

export const AdminFilingDTOSchema = z
  .object({
    id: z.string(),
    reportId: z.string(),
    reportTitle: z.string(),
    referenceCode: z.string().nullable(),
    /** Null for a report outside every jurisdiction. */
    geoid: z.string().nullable(),
    jurisdictionName: z.string().nullable(),
    category: ReportCategorySchema,
    /** Null until a route resolves. */
    channel: FilingChannelSchema.nullable(),
    portalHost: z.string().nullable(),
    status: FilingStatusSchema,
    method: FilingMethodSchema.nullable(),
    reason: FilingReasonSchema.nullable(),
    reasonDetail: z.string().nullable(),
    caseId: z.string().nullable(),
    caseUrl: z.string().nullable(),
    cityClosedAt: z.string().nullable(),
    attempts: z.number().int().nonnegative(),
    scriptVersion: z.string().nullable(),
    dryRun: z.boolean(),
    ticketText: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    submittedAt: z.string().nullable(),
    /** Sent by getFiling only. */
    evidence: z.array(FilingEvidenceDTOSchema).optional(),
  })
  .strict()
export type AdminFilingDTO = z.infer<typeof AdminFilingDTOSchema>

/** Where a report would be filed now: the portal host or email address, null on a manual route. */
export const AdminReportFilingRouteSchema = z
  .object({
    channel: FilingChannelSchema,
    target: z.string().nullable(),
  })
  .strict()
export type AdminReportFilingRoute = z.infer<typeof AdminReportFilingRouteSchema>

export const FilingSettingsDTOSchema = z
  .object({
    paused: z.boolean(),
    automaticFiling: z.boolean(),
  })
  .strict()
export type FilingSettingsDTO = z.infer<typeof FilingSettingsDTOSchema>

const FilingNoteSchema = z.string().max(FILING_NOTE_MAX).optional()

const FilingResponseSchema = z.object({ filing: AdminFilingDTOSchema }).strict()

/** File a report, or file it again. `id` is the report id. */
export const FileReportRequestSchema = z
  .object({
    id: z.string(),
    note: FilingNoteSchema,
  })
  .strict()
export type FileReportRequest = z.infer<typeof FileReportRequestSchema>

export const FileReportResponseSchema = FilingResponseSchema
export type FileReportResponse = z.infer<typeof FileReportResponseSchema>

export const ListFilingsRequestSchema = z
  .object({
    group: FilingGroupSchema,
    cursor: CursorSchema.optional(),
  })
  .strict()
export type ListFilingsRequest = z.infer<typeof ListFilingsRequestSchema>

export const ListFilingsResponseSchema = pageResponse(AdminFilingDTOSchema)
  .extend({
    items: z.array(AdminFilingDTOSchema).max(FILING_LIST_PAGE_MAX),
    counts: z
      .object({
        needs_human: z.number().int().nonnegative(),
        in_progress: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict()
export type ListFilingsResponse = z.infer<typeof ListFilingsResponseSchema>

export const GetFilingRequestSchema = z.object({ id: z.string() }).strict()
export type GetFilingRequest = z.infer<typeof GetFilingRequestSchema>

export const GetFilingResponseSchema = z
  .object({
    filing: AdminFilingDTOSchema.extend({ evidence: z.array(FilingEvidenceDTOSchema) }),
  })
  .strict()
export type GetFilingResponse = z.infer<typeof GetFilingResponseSchema>

export const RetryFilingRequestSchema = z.object({ id: z.string() }).strict()
export type RetryFilingRequest = z.infer<typeof RetryFilingRequestSchema>

export const RetryFilingResponseSchema = FilingResponseSchema
export type RetryFilingResponse = z.infer<typeof RetryFilingResponseSchema>

export const CancelFilingRequestSchema = z
  .object({
    id: z.string(),
    note: FilingNoteSchema,
  })
  .strict()
export type CancelFilingRequest = z.infer<typeof CancelFilingRequestSchema>

export const CancelFilingResponseSchema = FilingResponseSchema
export type CancelFilingResponse = z.infer<typeof CancelFilingResponseSchema>

/** Record a filing an operator made by hand. `caseId` replaces any earlier one. */
export const RecordManualFilingRequestSchema = z
  .object({
    id: z.string(),
    caseId: z.string().regex(FILING_CASE_ID_PATTERN),
    caseUrl: z.string().trim().refine((url) => isSafeHttpsUrl(url), { message: "Case URL must be an https URL." }).optional(),
    note: FilingNoteSchema,
  })
  .strict()
export type RecordManualFilingRequest = z.infer<typeof RecordManualFilingRequestSchema>

export const RecordManualFilingResponseSchema = FilingResponseSchema
export type RecordManualFilingResponse = z.infer<typeof RecordManualFilingResponseSchema>

export const GetFilingSettingsRequestSchema = z.object({}).strict()
export type GetFilingSettingsRequest = z.infer<typeof GetFilingSettingsRequestSchema>

export const GetFilingSettingsResponseSchema = FilingSettingsDTOSchema
export type GetFilingSettingsResponse = z.infer<typeof GetFilingSettingsResponseSchema>

export const SetFilingSettingsRequestSchema = z.object({ paused: z.boolean() }).strict()
export type SetFilingSettingsRequest = z.infer<typeof SetFilingSettingsRequestSchema>

export const SetFilingSettingsResponseSchema = FilingSettingsDTOSchema
export type SetFilingSettingsResponse = z.infer<typeof SetFilingSettingsResponseSchema>

export const ListFilingRoutesRequestSchema = z.object({ geoid: z.string() }).strict()
export type ListFilingRoutesRequest = z.infer<typeof ListFilingRoutesRequestSchema>

const FilingRoutesResponseSchema = z.object({ routes: z.array(FilingRouteDTOSchema) }).strict()

export const ListFilingRoutesResponseSchema = FilingRoutesResponseSchema
export type ListFilingRoutesResponse = z.infer<typeof ListFilingRoutesResponseSchema>

/** Replaces every saved route of the jurisdiction. */
export const SaveFilingRoutesRequestSchema = z
  .object({
    geoid: z.string(),
    routes: z
      .array(FilingRouteInputSchema)
      .max(FILING_ROUTES_MAX)
      .refine(
        (routes) => new Set(routes.map((r) => r.category)).size === routes.length,
        { message: "Each category may have one route, and the jurisdiction one default." },
      ),
  })
  .strict()
export type SaveFilingRoutesRequest = z.infer<typeof SaveFilingRoutesRequestSchema>

export const SaveFilingRoutesResponseSchema = FilingRoutesResponseSchema
export type SaveFilingRoutesResponse = z.infer<typeof SaveFilingRoutesResponseSchema>
