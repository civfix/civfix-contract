import { z } from "zod"

/**
 * `GET /app/config`: what a phone needs before it shows anything (DECISIONS §66). Built from the public
 * runtime flags; not strict, so an older app still parses a response that gained a field.
 */
export const AppAnnouncementLevelSchema = z.enum(["info", "warning"])
export type AppAnnouncementLevel = z.infer<typeof AppAnnouncementLevelSchema>

export const AppConfigResponseSchema = z.object({
  minAppVersion: z.object({ ios: z.string().nullable(), android: z.string().nullable() }),
  storeUrl: z.object({ ios: z.string().nullable(), android: z.string() }),
  /** Null when no announcement text is set. */
  announcement: z.object({ text: z.string(), level: AppAnnouncementLevelSchema }).nullable(),
})
export type AppConfigResponse = z.infer<typeof AppConfigResponseSchema>
