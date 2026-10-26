import { z } from "zod"
import { LegalBlockSchema } from "../legal/blocks.js"
import { ISODateSchema, LegalDocumentTypeSchema } from "./common.js"
import { LegalDocumentVersionDTOSchema } from "./entities.js"


export { LegalDocumentVersionDTOSchema } from "./entities.js"
export type { LegalDocumentVersionDTO } from "./entities.js"
export { LegalDocumentTypeSchema, ConsentSurfaceSchema } from "./common.js"
export type { LegalDocumentType, ConsentSurface } from "./common.js"

const GetLegalVersionsResponseObjectSchema = z.object({
  documents: z.array(LegalDocumentVersionDTOSchema),
  generatedAt: ISODateSchema,
})
export type GetLegalVersionsResponse = z.infer<typeof GetLegalVersionsResponseObjectSchema>
export const GetLegalVersionsResponseSchema: z.ZodType<GetLegalVersionsResponse, unknown> =
  GetLegalVersionsResponseObjectSchema

// YYYY-MM-DD, then YYYY-MM-DD-2, -3, ... for a further version written the same day (DECISIONS §66).
export const LegalVersionSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}(?:-[2-9]|-[1-9]\d+)?$/u)

const Sha256HexSchema = z.string().regex(/^[0-9a-f]{64}$/u)

// `title`, `summary`, `material` and `blocks` are null on versions from before DECISIONS §66, which have
// no text to show.
const LegalDocumentDTOObjectSchema = z.object({
  type: LegalDocumentTypeSchema,
  version: LegalVersionSchema,
  effectiveAt: ISODateSchema,
  url: z.string(),
  title: z.string().nullable(),
  summary: z.string().nullable(),
  material: z.boolean().nullable(),
  sha256: Sha256HexSchema,
  blocks: z.array(LegalBlockSchema).min(1).nullable(),
})
export type LegalDocumentDTO = z.infer<typeof LegalDocumentDTOObjectSchema>
export const LegalDocumentDTOSchema: z.ZodType<LegalDocumentDTO, unknown> = LegalDocumentDTOObjectSchema

const LegalDocumentMetaDTOObjectSchema = LegalDocumentDTOObjectSchema.omit({ blocks: true })
export type LegalDocumentMetaDTO = z.infer<typeof LegalDocumentMetaDTOObjectSchema>
export const LegalDocumentMetaDTOSchema: z.ZodType<LegalDocumentMetaDTO, unknown> = LegalDocumentMetaDTOObjectSchema

const GetLegalDocumentsResponseObjectSchema = z.object({
  documents: z.array(LegalDocumentDTOSchema),
})
export type GetLegalDocumentsResponse = z.infer<typeof GetLegalDocumentsResponseObjectSchema>
export const GetLegalDocumentsResponseSchema: z.ZodType<GetLegalDocumentsResponse, unknown> =
  GetLegalDocumentsResponseObjectSchema

export const GetLegalDocumentRequestSchema = z
  .object({
    type: LegalDocumentTypeSchema,
    version: LegalVersionSchema,
  })
  .strict()
export type GetLegalDocumentRequest = z.infer<typeof GetLegalDocumentRequestSchema>

const GetLegalDocumentResponseObjectSchema = z.object({
  document: LegalDocumentDTOSchema,
})
export type GetLegalDocumentResponse = z.infer<typeof GetLegalDocumentResponseObjectSchema>
export const GetLegalDocumentResponseSchema: z.ZodType<GetLegalDocumentResponse, unknown> =
  GetLegalDocumentResponseObjectSchema

export const LegalAcceptActionSchema = z.enum(["accepted", "acknowledged"])
export type LegalAcceptAction = z.infer<typeof LegalAcceptActionSchema>

// Its own enum, not ConsentSurfaceSchema: that one is also event registration's surface.
export const LegalAcceptSurfaceSchema = z.enum(["signup", "prompt", "notice"])
export type LegalAcceptSurface = z.infer<typeof LegalAcceptSurfaceSchema>

const LegalAcceptanceDTOObjectSchema = z.object({
  version: LegalVersionSchema,
  action: LegalAcceptActionSchema,
  at: ISODateSchema,
})
export type LegalAcceptanceDTO = z.infer<typeof LegalAcceptanceDTOObjectSchema>
export const LegalAcceptanceDTOSchema: z.ZodType<LegalAcceptanceDTO, unknown> = LegalAcceptanceDTOObjectSchema

const MyLegalStatusResponseObjectSchema = z.object({
  required: z.array(LegalDocumentMetaDTOSchema),
  notices: z.array(LegalDocumentMetaDTOSchema),
  // zod 4's z.record with an enum key requires every key; a person may have accepted none.
  accepted: z.partialRecord(LegalDocumentTypeSchema, LegalAcceptanceDTOSchema),
})
export type MyLegalStatusResponse = z.infer<typeof MyLegalStatusResponseObjectSchema>
export const MyLegalStatusResponseSchema: z.ZodType<MyLegalStatusResponse, unknown> =
  MyLegalStatusResponseObjectSchema

const AcceptLegalItemSchema = z
  .object({
    type: LegalDocumentTypeSchema,
    version: LegalVersionSchema,
    sha256: Sha256HexSchema,
    action: LegalAcceptActionSchema,
  })
  .strict()

export const AcceptLegalRequestSchema = z
  .object({
    items: z
      .array(AcceptLegalItemSchema)
      .min(1)
      .max(LegalDocumentTypeSchema.options.length)
      .superRefine((items, ctx) => {
        const seen = new Set<string>()
        items.forEach((item, index) => {
          if (seen.has(item.type)) {
            ctx.addIssue({ code: "custom", path: [index, "type"], message: `More than one ${item.type} item` })
          }
          seen.add(item.type)
        })
      }),
    surface: LegalAcceptSurfaceSchema.optional(),
  })
  .strict()
export type AcceptLegalRequest = z.infer<typeof AcceptLegalRequestSchema>

export const AcceptLegalResponseSchema = MyLegalStatusResponseSchema
export type AcceptLegalResponse = MyLegalStatusResponse

/** The `details.reason` of the CONFLICT sent for a legal version that is not, or no longer, current. */
export const LEGAL_VERSION_OUTDATED = "legal_version_outdated"

const LegalVersionOutdatedDetailsObjectSchema = z.object({
  reason: z.literal(LEGAL_VERSION_OUTDATED),
  current: z
    .array(
      z.object({
        type: LegalDocumentTypeSchema,
        version: LegalVersionSchema,
        sha256: Sha256HexSchema,
      }),
    )
    .min(1),
})
export type LegalVersionOutdatedDetails = z.infer<typeof LegalVersionOutdatedDetailsObjectSchema>
export const LegalVersionOutdatedDetailsSchema: z.ZodType<LegalVersionOutdatedDetails, unknown> =
  LegalVersionOutdatedDetailsObjectSchema
