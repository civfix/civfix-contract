import { z } from "zod"
import { def } from "./def.js"
import {
  GetLegalDocumentRequestSchema,
  GetLegalDocumentResponseSchema,
  GetLegalDocumentsResponseSchema,
  GetLegalVersionsResponseSchema,
} from "../../schemas/legal.js"

const HealthzResponseSchema = z.object({ ok: z.literal(true) }).passthrough()

export const systemEndpoints = {
  health: def({
    method: "GET",
    path: "/healthz",
    request: null,
    response: HealthzResponseSchema,
    auth: "public",
    csrf: false,
    version: "unversioned",
  }),
  getLegalVersions: def({
    method: "GET",
    path: "/legal/versions",
    request: null,
    response: GetLegalVersionsResponseSchema,
    auth: "public",
    csrf: false,
    version: "v1",
  }),
  getLegalDocuments: def({
    method: "GET",
    path: "/legal/documents",
    request: null,
    response: GetLegalDocumentsResponseSchema,
    auth: "public",
    csrf: false,
    version: "v1",
  }),
  getLegalDocument: def({
    method: "GET",
    path: "/legal/documents/:type/:version",
    request: GetLegalDocumentRequestSchema,
    response: GetLegalDocumentResponseSchema,
    auth: "public",
    csrf: false,
    version: "v1",
  }),
} as const
