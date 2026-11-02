/**
 * Admin schema building blocks shared by several admin schema files. Deliberately not re-exported from
 * the admin barrel: the published surface of @civfix/contract must not grow just because two files share a
 * field.
 */
import { z } from "zod"
import { ReportCategorySchema } from "../common.js"
import { HTTP_URL_MAX_LENGTH, HttpUrlSchema } from "../entities.js"

export const RoutingContactFields = {
  contacts: z.partialRecord(ReportCategorySchema, z.email().nullable()).optional(),
  defaultEmails: z.array(z.email()).optional(),
  formUrl: HttpUrlSchema.max(HTTP_URL_MAX_LENGTH).nullable().optional(),
} as const

export const AdminMediaRefSchema = z
  .object({
    id: z.string(),
    kind: z.enum(["image", "video"]),
    url: z.string(),
    thumbUrl: z.string().nullable().optional(),
  })
  .strict()
