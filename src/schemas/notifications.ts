import { z } from "zod"
import { IdSchema, ISODateSchema, pageResponse, PushPlatformSchema } from "./common.js"
import { OkResponseSchema } from "./internal-fields.js"
import { UnsubscribeTokenSchema } from "./host/broadcasts.js"


export const NotificationTypeSchema = z.enum([
  "report_update",
  "cleanup_chat",
  "cleanup_reminder",
  "cleanup_cancelled",
  "new_follower",
  "claim_available",
  "dm",
  "system",
  "report_chat",
  "group_chat",
  "cleanup_role",
  "post_like",
  "post_repost",
  "post_reply",
  "post_quote",
  "post_mention",
  "cleanup_slot",
  "hours_logged",
  "event_broadcast",
  "event_team_invite",
  "org_invite",
  "chat_mention",
])
export type NotificationType = z.infer<typeof NotificationTypeSchema>

export const NotificationDTOSchema = z.object({
  id: IdSchema,
  type: NotificationTypeSchema,
  title: z.string(),
  body: z.string().nullable().optional(),
  read: z.boolean(),
  createdAt: ISODateSchema,
  link: z.string().nullable().optional(),
})
export type NotificationDTO = z.infer<typeof NotificationDTOSchema>

export const ListNotificationsResponseSchema = pageResponse(NotificationDTOSchema)
export type ListNotificationsResponse = z.infer<typeof ListNotificationsResponseSchema>

export const MarkReadRequestSchema = z
  .object({
    ids: z.array(IdSchema),
  })
  .strict()
export type MarkReadRequest = z.infer<typeof MarkReadRequestSchema>

export const MarkReadResponseSchema = OkResponseSchema
export type MarkReadResponse = z.infer<typeof MarkReadResponseSchema>

export const QuietHoursSchema = z.object({
  start: z.string(),
  end: z.string(),
  tz: z.string().min(1).max(64).nullable().optional(),
})
export type QuietHours = z.infer<typeof QuietHoursSchema>

export const NotificationPrefsDTOSchema = z.object({
  push: z.boolean(),
  cleanupChat: z.boolean(),
  reportUpdates: z.boolean(),
  follows: z.boolean(),
  mentions: z.boolean(),
  postInteractions: z.boolean(),
  hostBroadcasts: z.boolean().default(true),
  quietHours: QuietHoursSchema.nullable().optional(),
})
export type NotificationPrefsDTO = z.infer<typeof NotificationPrefsDTOSchema>

export const GetNotificationPrefsResponseSchema = NotificationPrefsDTOSchema
export type GetNotificationPrefsResponse = z.infer<typeof GetNotificationPrefsResponseSchema>

export const UpdateNotificationPrefsRequestSchema = NotificationPrefsDTOSchema.partial().strict()
export type UpdateNotificationPrefsRequest = z.infer<typeof UpdateNotificationPrefsRequestSchema>

export const RegisterPushTokenRequestSchema = z
  .object({
    platform: PushPlatformSchema,
    token: z.string().min(1).max(2048),
    deviceId: z.string().optional(),
  })
  .strict()
export type RegisterPushTokenRequest = z.infer<typeof RegisterPushTokenRequestSchema>

export const RegisterPushTokenResponseSchema = OkResponseSchema
export type RegisterPushTokenResponse = z.infer<typeof RegisterPushTokenResponseSchema>

export const UnregisterPushTokenRequestSchema = z
  .object({
    platform: PushPlatformSchema,
    token: z.string().min(1).max(2048),
  })
  .strict()
export type UnregisterPushTokenRequest = z.infer<typeof UnregisterPushTokenRequestSchema>

export const NotificationCategorySchema = z.enum([
  "reportUpdates",
  "reportDiscussions",
  "directMessages",
  "mentions",
  "groupChats",
  "events",
  "hostAnnouncements",
  "eventTeam",
  "followers",
  "likesAndReposts",
  "organizations",
])
export type NotificationCategory = z.infer<typeof NotificationCategorySchema>

export const NotificationCategorySettingSchema = z
  .object({
    enabled: z.boolean(),
    push: z.boolean(),
    email: z.boolean(),
  })
  .strict()
export type NotificationCategorySetting = z.infer<typeof NotificationCategorySettingSchema>

// Section ids are also the Android notification channel ids, so renaming one orphans that channel on
// every installed device.
export const NOTIFICATION_SECTIONS = [
  { id: "reports", categories: ["reportUpdates", "reportDiscussions"] },
  { id: "messages", categories: ["directMessages", "mentions", "groupChats"] },
  { id: "events", categories: ["events", "hostAnnouncements", "eventTeam"] },
  { id: "social", categories: ["followers", "likesAndReposts"] },
  { id: "organizations", categories: ["organizations"] },
] as const satisfies readonly { id: string; categories: readonly NotificationCategory[] }[]

export const NOTIFICATION_CATEGORY_DEFAULTS: Readonly<
  Record<NotificationCategory, Readonly<NotificationCategorySetting>>
> = {
  reportUpdates: { enabled: true, push: true, email: false },
  reportDiscussions: { enabled: true, push: false, email: false },
  directMessages: { enabled: true, push: true, email: false },
  mentions: { enabled: true, push: true, email: false },
  groupChats: { enabled: true, push: false, email: false },
  events: { enabled: true, push: true, email: true },
  hostAnnouncements: { enabled: true, push: true, email: false },
  eventTeam: { enabled: true, push: true, email: false },
  followers: { enabled: true, push: false, email: false },
  likesAndReposts: { enabled: true, push: false, email: false },
  organizations: { enabled: true, push: false, email: true },
}

function perCategory<T extends z.ZodTypeAny>(schema: T): { [C in NotificationCategory]: T } {
  return Object.fromEntries(NotificationCategorySchema.options.map((c) => [c, schema])) as {
    [C in NotificationCategory]: T
  }
}

export const NotificationSettingsDTOSchema = z.object({
  categories: z.object(perCategory(NotificationCategorySettingSchema)),
  emailAvailable: z.boolean(),
})
export type NotificationSettingsDTO = z.infer<typeof NotificationSettingsDTOSchema>

export const UpdateNotificationSettingsRequestSchema = z
  .object({
    categories: z.object(perCategory(NotificationCategorySettingSchema.partial().optional())).strict(),
  })
  .strict()
  .superRefine(({ categories }, ctx) => {
    const patches = Object.entries(categories).filter(([, patch]) => patch !== undefined)
    if (patches.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["categories"], message: "Change at least one category" })
    }
    for (const [category, patch] of patches) {
      if (Object.keys(patch ?? {}).length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["categories", category],
          message: "Change at least one of enabled, push and email",
        })
      }
    }
  })
export type UpdateNotificationSettingsRequest = z.infer<typeof UpdateNotificationSettingsRequestSchema>

export const NotificationUnreadResponseSchema = z.object({
  hasUnread: z.boolean(),
})
export type NotificationUnreadResponse = z.infer<typeof NotificationUnreadResponseSchema>

export const PushWebConfigResponseSchema = z.object({
  vapidPublicKey: z.string().nullable(),
})
export type PushWebConfigResponse = z.infer<typeof PushWebConfigResponseSchema>

export const UnsubscribeNotificationEmailRequestSchema = z
  .object({
    token: UnsubscribeTokenSchema,
  })
  .strict()
export type UnsubscribeNotificationEmailRequest = z.infer<typeof UnsubscribeNotificationEmailRequestSchema>

export const UnsubscribeNotificationEmailResponseSchema = z.object({
  ok: z.literal(true),
  category: NotificationCategorySchema.nullable(),
})
export type UnsubscribeNotificationEmailResponse = z.infer<typeof UnsubscribeNotificationEmailResponseSchema>

export const OpenUnsubscribeNotificationEmailRequestSchema = z
  .object({
    t: UnsubscribeTokenSchema,
  })
  .strict()
export type OpenUnsubscribeNotificationEmailRequest = z.infer<
  typeof OpenUnsubscribeNotificationEmailRequestSchema
>

// The GET answers with a redirect to the web page, which POSTs the token: mail scanners prefetch
// links, so opening one must never unsubscribe.
export const OpenUnsubscribeNotificationEmailResponseSchema = z.object({}).strict()
export type OpenUnsubscribeNotificationEmailResponse = z.infer<
  typeof OpenUnsubscribeNotificationEmailResponseSchema
>

const PUSH_CLEAR_IDS_MAX = 100

export const PushMessageDataSchema = z
  .discriminatedUnion("kind", [
    z.object({
      kind: z.literal("notification"),
      notificationId: IdSchema,
      type: NotificationTypeSchema,
      category: NotificationCategorySchema.nullable(),
      link: z.string().nullable(),
    }),
    z.object({
      kind: z.literal("clear"),
      ids: z.array(IdSchema).min(1).max(PUSH_CLEAR_IDS_MAX).optional(),
      all: z.literal(true).optional(),
    }),
  ])
  .superRefine((data, ctx) => {
    if (data.kind === "clear" && (data.ids === undefined) === (data.all === undefined)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "A clear carries exactly one of ids and all" })
    }
  })
export type PushMessageData = z.infer<typeof PushMessageDataSchema>

// FCM data payloads carry only string values, and APNs gets the same map, so arrays and booleans are
// encoded as strings and null fields are left out.
export function encodePushMessageData(data: PushMessageData): Record<string, string> {
  if (data.kind === "notification") {
    const map: Record<string, string> = {
      kind: data.kind,
      notificationId: data.notificationId,
      type: data.type,
    }
    if (data.category !== null) map.category = data.category
    if (data.link !== null) map.link = data.link
    return map
  }
  const map: Record<string, string> = { kind: data.kind }
  if (data.ids !== undefined) map.ids = JSON.stringify(data.ids)
  if (data.all !== undefined) map.all = "true"
  return map
}

export function decodePushMessageData(map: unknown): PushMessageData | null {
  if (typeof map !== "object" || map === null) return null
  const { kind, notificationId, type, category, link, ids, all } = map as Record<string, unknown>
  let candidate: Record<string, unknown>
  if (kind === "notification") {
    candidate = { kind, notificationId, type, category: category ?? null, link: link ?? null }
  } else if (kind === "clear") {
    if (all !== undefined && all !== "true") return null
    candidate = all === undefined ? { kind } : { kind, all: true }
    if (ids !== undefined) {
      if (typeof ids !== "string") return null
      try {
        candidate.ids = JSON.parse(ids)
      } catch {
        return null
      }
    }
  } else {
    return null
  }
  const parsed = PushMessageDataSchema.safeParse(candidate)
  return parsed.success ? parsed.data : null
}
