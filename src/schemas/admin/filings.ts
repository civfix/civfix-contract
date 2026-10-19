import { z } from "zod"

const notImplemented = (): z.ZodTypeAny =>
  z.any().superRefine(() => {
    throw new Error("not implemented")
  })

export const FILING_NOTE_MAX = 0
export const FILING_REQUEST_TYPE_HINT_MAX = 0
export const FILING_SENDER_DOMAINS_MAX = 0
export const FILING_ROUTES_MAX = 0
export const FILING_LIST_PAGE_MAX = 0
export const FILING_CASE_ID_PATTERN = /(?!)/

export const FilingChannelSchema = z.enum(["not_implemented"])
export const FilingStatusSchema = z.enum(["not_implemented"])
export const FilingMethodSchema = z.enum(["not_implemented"])
export const FilingGroupSchema = z.enum(["not_implemented"])
export const FilingEvidenceKindSchema = z.enum(["not_implemented"])
export const FilingReasonSchema = z.enum(["not_implemented"])

export const FilingEvidenceDTOSchema = notImplemented()
export const AdminFilingDTOSchema = notImplemented()
export const FilingRouteInputSchema = notImplemented()
export const FilingRouteDTOSchema = notImplemented()
export const FilingSettingsDTOSchema = notImplemented()

export const FileReportRequestSchema = notImplemented()
export const FileReportResponseSchema = notImplemented()
export const ListFilingsRequestSchema = notImplemented()
export const ListFilingsResponseSchema = notImplemented()
export const GetFilingRequestSchema = notImplemented()
export const GetFilingResponseSchema = notImplemented()
export const RetryFilingRequestSchema = notImplemented()
export const RetryFilingResponseSchema = notImplemented()
export const CancelFilingRequestSchema = notImplemented()
export const CancelFilingResponseSchema = notImplemented()
export const RecordManualFilingRequestSchema = notImplemented()
export const RecordManualFilingResponseSchema = notImplemented()
export const GetFilingSettingsRequestSchema = notImplemented()
export const GetFilingSettingsResponseSchema = notImplemented()
export const SetFilingSettingsRequestSchema = notImplemented()
export const SetFilingSettingsResponseSchema = notImplemented()
export const ListFilingRoutesRequestSchema = notImplemented()
export const ListFilingRoutesResponseSchema = notImplemented()
export const SaveFilingRoutesRequestSchema = notImplemented()
export const SaveFilingRoutesResponseSchema = notImplemented()
