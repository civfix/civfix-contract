import { z } from "zod"
import { ISODateSchema } from "./common.js"
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

const notImplemented = z.custom<never>(() => {
  throw new Error("not implemented")
})
export const LEGAL_VERSION_OUTDATED = "not implemented"
export const LegalDocumentDTOSchema = notImplemented
export const GetLegalDocumentsResponseSchema = notImplemented
export const GetLegalDocumentRequestSchema = notImplemented
export const GetLegalDocumentResponseSchema = notImplemented
export const MyLegalStatusResponseSchema = notImplemented
export const AcceptLegalRequestSchema = notImplemented
export const AcceptLegalResponseSchema = notImplemented
export const LegalVersionOutdatedDetailsSchema = notImplemented
