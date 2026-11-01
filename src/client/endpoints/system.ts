import { z } from "zod"
import { def } from "./def.js"
import { GetLegalVersionsResponseSchema } from "../../schemas/legal.js"
import { AppConfigResponseSchema } from "../../schemas/app-config.js"

const HealthzResponseSchema = z.looseObject({ ok: z.literal(true) })

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
  getAppConfig: def({
    method: "GET",
    path: "/app/config",
    request: null,
    response: AppConfigResponseSchema,
    auth: "optional",
    csrf: false,
    version: "v1",
  }),
} as const
