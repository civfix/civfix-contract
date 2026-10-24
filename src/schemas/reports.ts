import { z } from "zod"
import {
  IdSchema,
  ISODateSchema,
  BBoxSchema,
  LatLngFields,
  ReportCategorySchema,
  ReportTypeSchema,
  PaginationQuerySchema,
  pageResponse,
} from "./common.js"
import { ReportDTOSchema, ReportPinDTOSchema } from "./entities.js"
import { ReportContentFields, ReportMediaAndHoneypotFields } from "./internal-fields.js"

export {
  ReportDTOSchema,
  ReportPinDTOSchema,
  ReportTimelineEntryDTOSchema,
  ReportVisibilitySchema,
  MediaDTOSchema,
} from "./entities.js"
export type {
  ReportDTO,
  ReportPinDTO,
  ReportTimelineEntryDTO,
  ReportVisibility,
  MediaDTO,
} from "./entities.js"

export {
  MAX_REPORT_ADDR_LENGTH,
  MAX_REPORT_DESCRIPTION_LENGTH,
  MAX_REPORT_MEDIA,
  MAX_REPORT_TITLE_LENGTH,
} from "./internal-fields.js"

export const CreateReportRequestSchema = z
  .object({
    idempotencyKey: IdSchema,
    ...ReportContentFields,
    capturedAt: ISODateSchema.optional(),
    ...ReportMediaAndHoneypotFields,
  })
  .strict()
export type CreateReportRequest = z.infer<typeof CreateReportRequestSchema>

export const ListReportsInBBoxRequestSchema = z
  .object({
    bbox: BBoxSchema,
    categories: z.array(ReportCategorySchema).optional(),
    types: z.array(ReportTypeSchema).optional(),
    zoom: z.number(),
  })
  .strict()
export type ListReportsInBBoxRequest = z.infer<typeof ListReportsInBBoxRequestSchema>

export const ListReportsSearchRequestSchema = z
  .object({
    // The server matches title and address, not description. Optional so a category-only (or empty)
    // search is valid.
    q: z.string().trim().max(120).optional(),
    categories: z.array(ReportCategorySchema).optional(),
    types: z.array(ReportTypeSchema).optional(),
    cursor: z.string().optional(),
    // Coerced because this also validates GET query strings, where every value arrives as a string.
    limit: z.coerce.number().int().min(1).max(50).optional().default(30),
  })
  .strict()
export type ListReportsSearchRequest = z.infer<typeof ListReportsSearchRequestSchema>

export const ListReportsSearchResponseSchema = z.object({
  items: z.array(ReportPinDTOSchema),
  nextCursor: z.string().nullable(),
})
export type ListReportsSearchResponse = z.infer<typeof ListReportsSearchResponseSchema>

export const ReportClusterDTOSchema = z.object({
  ...LatLngFields,
  count: z.number().int().nonnegative(),
})
export type ReportClusterDTO = z.infer<typeof ReportClusterDTOSchema>

export const ReportClusterResponseSchema = z.object({
  clusters: z.array(ReportClusterDTOSchema),
  pins: z.array(ReportPinDTOSchema),
  // Per-category pin counts for the reports filter popover; a category may be absent.
  counts: z.partialRecord(ReportCategorySchema, z.number()).optional(),
})
export type ReportClusterResponse = z.infer<typeof ReportClusterResponseSchema>

export const GetReportResponseSchema = ReportDTOSchema
export type GetReportResponse = z.infer<typeof GetReportResponseSchema>

export const ListMyReportsRequestSchema = PaginationQuerySchema
export type ListMyReportsRequest = z.infer<typeof ListMyReportsRequestSchema>

export const ListMyReportsResponseSchema = pageResponse(ReportDTOSchema)
export type ListMyReportsResponse = z.infer<typeof ListMyReportsResponseSchema>

/**
 * POST /reports/:id/resolve: the reporter marks their own report resolved, or reopens it to `published`.
 * `id` consumes the `:id` path param. Owner-only (403 for a non-owner, 404 for a missing report). The
 * response is the updated ReportDTO so the client can replace its cached detail without a second fetch.
 */
export const ResolveReportRequestSchema = z
  .object({
    id: IdSchema,
    resolved: z.boolean(),
  })
  .strict()
export type ResolveReportRequest = z.infer<typeof ResolveReportRequestSchema>

/**
 * POST /reports/:id/unlist: the reporter hides their own report from the public map, search and detail,
 * or re-lists it. The report stays in the city pipeline with its real status. Owner-only (403 for a
 * non-owner, 404 for a missing report); returns the updated ReportDTO. Never deletes: the record is
 * retained so an already-forwarded city item never becomes a ghost.
 */
export const UnlistReportRequestSchema = z
  .object({
    id: IdSchema,
    unlisted: z.boolean(),
  })
  .strict()
export type UnlistReportRequest = z.infer<typeof UnlistReportRequestSchema>

/**
 * A signed-in resident's vote on someone else's report (DECISIONS §60, §61): "I see this too" is a
 * confirmation, "This is fixed" a fixed vote, and an account holds at most one of the two per report.
 * `id` consumes the `:id` path param. Each call answers the caller's state after it:
 * - POST /reports/:id/confirm (confirmReport) makes the vote a confirmation, adding it or moving it
 *   from a fixed vote;
 * - POST /reports/:id/fixed (markReportFixed) makes the vote a fixed vote, adding it or moving it from
 *   a confirmation;
 * - DELETE /reports/:id/confirm (unconfirmReport) removes a confirmation, and changes nothing when the
 *   vote is a fixed vote or there is none;
 * - DELETE /reports/:id/fixed (unmarkReportFixed) removes a fixed vote, and changes nothing when the
 *   vote is a confirmation or there is none.
 * Repeating a call changes nothing. Errors, in this order:
 * 1. NOT_FOUND unless a non-owner can see the report (unknown, hidden, held, deleted, submitted or
 *    rejected), with the body an unknown id gets, for everyone including its reporter;
 * 2. FORBIDDEN when the caller filed it;
 * 3. confirmReport and markReportFixed only: CONFLICT when it is `resolved` (a removal works on any
 *    visible report).
 * No session is UNAUTHORIZED, which the auth guard answers before any of these.
 */
export const ReportConfirmRequestSchema = z
  .object({
    id: IdSchema,
  })
  .strict()
export type ReportConfirmRequest = z.infer<typeof ReportConfirmRequestSchema>

// The fixed-vote fields are defaulted so a 0.62.0 server's `{ confirmCount, confirmedByMe }` still parses.
export const ReportConfirmResponseSchema = z.object({
  confirmCount: z.number().int().nonnegative(),
  confirmedByMe: z.boolean(),
  fixedCount: z.number().int().nonnegative().default(0),
  fixedByMe: z.boolean().default(false),
})
export type ReportConfirmResponse = z.infer<typeof ReportConfirmResponseSchema>

/** GET /reports/pressing: the bbox only, under the same rules as mapReports; no zoom or category filters. */
export const PressingReportsRequestSchema = z
  .object({
    bbox: BBoxSchema,
  })
  .strict()
export type PressingReportsRequest = z.infer<typeof PressingReportsRequestSchema>

/** Open public reports in the bbox with at least one confirmation, ranked as DECISIONS §61 describes. */
export const PressingReportsResponseSchema = z.object({
  items: z.array(ReportPinDTOSchema).max(20),
})
export type PressingReportsResponse = z.infer<typeof PressingReportsResponseSchema>
