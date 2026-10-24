import { describe, it, expect, vi } from "vitest"
import {
  createApiClient,
  decodePushMessageData,
  encodePushMessageData,
  endpoints,
  GetNotificationPrefsResponseSchema,
  NOTIFICATION_CATEGORY_DEFAULTS,
  NOTIFICATION_SECTIONS,
  NotificationCategorySchema,
  NotificationCategorySettingSchema,
  NotificationPrefsDTOSchema,
  NotificationSettingsDTOSchema,
  NotificationTypeSchema,
  NotificationUnreadResponseSchema,
  OpenUnsubscribeNotificationEmailRequestSchema,
  PushMessageDataSchema,
  PushWebConfigResponseSchema,
  UnsubscribeNotificationEmailRequestSchema,
  UnsubscribeNotificationEmailResponseSchema,
  UpdateNotificationPrefsRequestSchema,
  UpdateNotificationSettingsRequestSchema,
  type PushMessageData,
} from "../src/index.js"
import { OkResponseSchema } from "../src/schemas/internal-fields.js"

const U1 = "123e4567-e89b-12d3-a456-426614174000"
const U2 = "123e4567-e89b-12d3-a456-426614174001"
const TOK = (n: number) => "a".repeat(n)
const uuids = (n: number) =>
  Array.from({ length: n }, (_, i) => `123e4567-e89b-12d3-a456-${String(i).padStart(12, "0")}`)

const CATEGORIES = [
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
]

const fails = (schema: { safeParse: (v: unknown) => { success: boolean } }, v: unknown) =>
  expect(schema.safeParse(v).success, JSON.stringify(v)).toBe(false)

describe("notification categories", () => {
  it("T1: NotificationCategorySchema lists the eleven categories in order", () => {
    expect(NotificationCategorySchema.options).toEqual(CATEGORIES)
  })

  it("T2: NOTIFICATION_SECTIONS lists the five sections and their categories in order", () => {
    expect(NOTIFICATION_SECTIONS).toEqual([
      { id: "reports", categories: ["reportUpdates", "reportDiscussions"] },
      { id: "messages", categories: ["directMessages", "mentions", "groupChats"] },
      { id: "events", categories: ["events", "hostAnnouncements", "eventTeam"] },
      { id: "social", categories: ["followers", "likesAndReposts"] },
      { id: "organizations", categories: ["organizations"] },
    ])
  })

  it("T3: every category appears in exactly one section", () => {
    const flat: string[] = NOTIFICATION_SECTIONS.flatMap((s) => [...s.categories])
    expect(flat).toHaveLength(11)
    for (const c of NotificationCategorySchema.options) {
      expect(flat.filter((x) => x === c), c).toHaveLength(1)
    }
    for (const c of flat) expect(NotificationCategorySchema.options as readonly string[]).toContain(c)
  })

  it("T4: NOTIFICATION_CATEGORY_DEFAULTS holds D1's defaults", () => {
    expect(NOTIFICATION_CATEGORY_DEFAULTS).toEqual({
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
    })
    for (const v of Object.values(NOTIFICATION_CATEGORY_DEFAULTS)) {
      expect(NotificationCategorySettingSchema.safeParse(v).success).toBe(true)
    }
  })

  it("T5: every new name is exported from the package root", () => {
    for (const v of [
      NotificationCategorySchema,
      NotificationCategorySettingSchema,
      NOTIFICATION_SECTIONS,
      NOTIFICATION_CATEGORY_DEFAULTS,
      NotificationSettingsDTOSchema,
      UpdateNotificationSettingsRequestSchema,
      NotificationUnreadResponseSchema,
      PushWebConfigResponseSchema,
      UnsubscribeNotificationEmailRequestSchema,
      UnsubscribeNotificationEmailResponseSchema,
      OpenUnsubscribeNotificationEmailRequestSchema,
      PushMessageDataSchema,
      encodePushMessageData,
      decodePushMessageData,
    ]) {
      expect(v).toBeDefined()
    }
  })
})

describe("notification settings schemas", () => {
  it("T6: NotificationCategorySettingSchema is three strict booleans", () => {
    const ok = { enabled: true, push: false, email: true }
    expect(NotificationCategorySettingSchema.parse(ok)).toEqual(ok)
    fails(NotificationCategorySettingSchema, { enabled: true, push: false })
    fails(NotificationCategorySettingSchema, { ...ok, sms: true })
    fails(NotificationCategorySettingSchema, { ...ok, push: "yes" })
  })

  it("T7: NotificationSettingsDTOSchema requires every category and emailAvailable", () => {
    const dto = { categories: NOTIFICATION_CATEGORY_DEFAULTS, emailAvailable: false }
    expect(NotificationSettingsDTOSchema.safeParse(dto).success).toBe(true)
    for (const c of CATEGORIES) {
      const categories: Record<string, unknown> = { ...NOTIFICATION_CATEGORY_DEFAULTS }
      delete categories[c]
      fails(NotificationSettingsDTOSchema, { categories, emailAvailable: false })
    }
    fails(NotificationSettingsDTOSchema, { categories: NOTIFICATION_CATEGORY_DEFAULTS })
  })

  it("T8: UpdateNotificationSettingsRequestSchema takes partial categories", () => {
    for (const body of [
      { categories: { events: { enabled: false } } },
      { categories: { mentions: { push: true, email: false }, followers: { enabled: true } } },
    ]) {
      expect(UpdateNotificationSettingsRequestSchema.parse(body)).toEqual(body)
    }
  })

  it("T9: UpdateNotificationSettingsRequestSchema rejects empty, unknown and non-boolean input", () => {
    for (const body of [
      {},
      { categories: {} },
      { categories: { events: {} } },
      { categories: { events: {}, mentions: { push: true } } },
      { categories: { sms: { push: true } } },
      { categories: { events: { sms: true } } },
      { categories: { events: { push: true } }, extra: 1 },
      { categories: { events: { push: null } } },
    ]) {
      fails(UpdateNotificationSettingsRequestSchema, body)
    }
  })

  it("T10: NotificationUnreadResponseSchema is { hasUnread: boolean }", () => {
    expect(NotificationUnreadResponseSchema.safeParse({ hasUnread: true }).success).toBe(true)
    fails(NotificationUnreadResponseSchema, {})
    fails(NotificationUnreadResponseSchema, { hasUnread: "true" })
  })

  it("T11: PushWebConfigResponseSchema is { vapidPublicKey: string | null }", () => {
    expect(PushWebConfigResponseSchema.safeParse({ vapidPublicKey: "BExampleKey" }).success).toBe(true)
    expect(PushWebConfigResponseSchema.safeParse({ vapidPublicKey: null }).success).toBe(true)
    fails(PushWebConfigResponseSchema, {})
  })

  it("T12: UnsubscribeNotificationEmailRequestSchema bounds token like UnsubscribeTokenSchema", () => {
    expect(UnsubscribeNotificationEmailRequestSchema.safeParse({ token: TOK(20) }).success).toBe(true)
    expect(UnsubscribeNotificationEmailRequestSchema.safeParse({ token: TOK(512) }).success).toBe(true)
    fails(UnsubscribeNotificationEmailRequestSchema, { token: TOK(19) })
    fails(UnsubscribeNotificationEmailRequestSchema, { token: TOK(513) })
    fails(UnsubscribeNotificationEmailRequestSchema, { token: TOK(20), extra: 1 })
  })

  it("T13: OpenUnsubscribeNotificationEmailRequestSchema bounds t like UnsubscribeTokenSchema", () => {
    expect(OpenUnsubscribeNotificationEmailRequestSchema.safeParse({ t: TOK(20) }).success).toBe(true)
    expect(OpenUnsubscribeNotificationEmailRequestSchema.safeParse({ t: TOK(512) }).success).toBe(true)
    fails(OpenUnsubscribeNotificationEmailRequestSchema, { t: TOK(19) })
    fails(OpenUnsubscribeNotificationEmailRequestSchema, { t: TOK(513) })
    fails(OpenUnsubscribeNotificationEmailRequestSchema, {})
    fails(OpenUnsubscribeNotificationEmailRequestSchema, { token: TOK(20) })
  })

  it("T14: UnsubscribeNotificationEmailResponseSchema is { ok: true, category | null }", () => {
    const s = UnsubscribeNotificationEmailResponseSchema
    expect(s.safeParse({ ok: true, category: "events" }).success).toBe(true)
    expect(s.safeParse({ ok: true, category: null }).success).toBe(true)
    fails(s, { ok: false, category: null })
    fails(s, { ok: true, category: "sms" })
    fails(s, { ok: true })
  })

  it("T15: openUnsubscribeNotificationEmail answers an empty strict object", () => {
    const res = endpoints.openUnsubscribeNotificationEmail.response
    expect(res.safeParse({}).success).toBe(true)
    fails(res, { x: 1 })
  })
})

describe("PushMessageData", () => {
  const notification = {
    kind: "notification",
    notificationId: U1,
    type: "chat_mention",
    category: "mentions",
    link: "/notifications",
  }

  it("T16: parses the notification kind, with nullable category and link", () => {
    const bare = { ...notification, category: null, link: null }
    expect(PushMessageDataSchema.parse(notification)).toEqual(notification)
    expect(PushMessageDataSchema.parse(bare)).toEqual(bare)
    fails(PushMessageDataSchema, { ...notification, notificationId: "abc" })
    fails(PushMessageDataSchema, { ...notification, type: "bogus" })
    fails(PushMessageDataSchema, { ...notification, category: "sms" })
    const { category: _c, ...noCategory } = notification
    fails(PushMessageDataSchema, noCategory)
    const { link: _l, ...noLink } = notification
    fails(PushMessageDataSchema, noLink)
  })

  it("T17: parses the clear kind with exactly one of 1 to 100 ids or all", () => {
    for (const v of [
      { kind: "clear", ids: [U1] },
      { kind: "clear", ids: uuids(100) },
      { kind: "clear", all: true },
    ]) {
      expect(PushMessageDataSchema.safeParse(v).success, JSON.stringify(v)).toBe(true)
    }
    for (const v of [
      { kind: "clear", ids: [] },
      { kind: "clear", ids: uuids(101) },
      { kind: "clear", ids: ["abc"] },
      { kind: "clear" },
      { kind: "clear", ids: [U1], all: true },
      { kind: "clear", all: false },
      { kind: "other" },
    ]) {
      fails(PushMessageDataSchema, v)
    }
  })

  const t18: PushMessageData = {
    kind: "notification",
    notificationId: U1,
    type: "dm",
    category: "directMessages",
    link: "/messages/x",
  }
  const t19: PushMessageData = {
    kind: "notification",
    notificationId: U1,
    type: "system",
    category: null,
    link: null,
  }

  it("T18: encodes a notification as a flat string map", () => {
    const encoded = encodePushMessageData(t18)
    expect(encoded).toStrictEqual({
      kind: "notification",
      notificationId: U1,
      type: "dm",
      category: "directMessages",
      link: "/messages/x",
    })
    for (const v of Object.values(encoded)) expect(typeof v).toBe("string")
  })

  it("T19: omits a null category and link", () => {
    expect(encodePushMessageData(t19)).toStrictEqual({
      kind: "notification",
      notificationId: U1,
      type: "system",
    })
  })

  it("T20: encodes clear ids as JSON and all as \"true\"", () => {
    expect(encodePushMessageData({ kind: "clear", ids: [U1, U2] })).toStrictEqual({
      kind: "clear",
      ids: JSON.stringify([U1, U2]),
    })
    expect(encodePushMessageData({ kind: "clear", all: true })).toStrictEqual({
      kind: "clear",
      all: "true",
    })
  })

  it("T21: decode(encode(v)) returns v", () => {
    const values: PushMessageData[] = [
      t18,
      t19,
      { kind: "clear", ids: [U1] },
      { kind: "clear", ids: uuids(100) },
      { kind: "clear", all: true },
    ]
    for (const v of values) {
      expect(decodePushMessageData(encodePushMessageData(v))).toStrictEqual(v)
    }
  })

  it("T22: decodes a malformed map to null without throwing", () => {
    for (const map of [
      {},
      { kind: "bogus" },
      { kind: "notification", type: "dm" },
      { kind: "notification", notificationId: "abc", type: "dm" },
      { kind: "notification", notificationId: U1, type: "bogus" },
      { kind: "notification", notificationId: U1, type: "dm", category: "sms" },
      { kind: "clear", ids: "not json" },
      { kind: "clear", ids: "[]" },
      { kind: "clear", ids: '{"a":1}' },
      { kind: "clear", all: "false" },
      { kind: "clear", ids: JSON.stringify([U1]), all: "true" },
      { kind: "clear" },
    ]) {
      let out: unknown = "threw"
      expect(() => {
        out = decodePushMessageData(map)
      }, JSON.stringify(map)).not.toThrow()
      expect(out, JSON.stringify(map)).toBeNull()
    }
  })
})

describe("NotificationTypeSchema", () => {
  it("T23: appends chat_mention after today's 21 types", () => {
    const options = NotificationTypeSchema.options
    expect(options).toHaveLength(22)
    expect(options.slice(0, 21)).toEqual([
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
    ])
    expect(options[21]).toBe("chat_mention")
  })
})

describe("notification center endpoints", () => {
  it("T24: registers the eight endpoints with D5's method, path, auth, csrf and schemas", () => {
    const expected = {
      getNotificationSettings: ["GET", "/notifications/settings", "required", false, null, NotificationSettingsDTOSchema],
      updateNotificationSettings: [
        "PATCH",
        "/notifications/settings",
        "required",
        true,
        UpdateNotificationSettingsRequestSchema,
        NotificationSettingsDTOSchema,
      ],
      getNotificationUnread: ["GET", "/notifications/unread", "required", false, null, NotificationUnreadResponseSchema],
      markAllNotificationsRead: ["POST", "/notifications/read-all", "required", true, null, OkResponseSchema],
      dismissNotification: ["DELETE", "/notifications/:id", "required", true, null, OkResponseSchema],
      getPushWebConfig: ["GET", "/push/web-config", "required", false, null, PushWebConfigResponseSchema],
      unsubscribeNotificationEmail: [
        "POST",
        "/notifications/email-unsubscribe",
        "public",
        false,
        UnsubscribeNotificationEmailRequestSchema,
        UnsubscribeNotificationEmailResponseSchema,
      ],
      openUnsubscribeNotificationEmail: [
        "GET",
        "/notifications/email-unsubscribe",
        "public",
        false,
        OpenUnsubscribeNotificationEmailRequestSchema,
        undefined,
      ],
    } as const
    for (const [name, [method, path, auth, csrf, request, response]] of Object.entries(expected)) {
      const e = (endpoints as Record<string, (typeof endpoints)[keyof typeof endpoints]>)[name]
      expect(e, name).toMatchObject({ method, path, auth, csrf, version: "v1" })
      expect(e?.request, name).toBe(request)
      if (response) expect(e?.response, name).toBe(response)
    }
  })

  it("T26: the typed client calls the new endpoints with csrf only on mutations", async () => {
    const calls: Array<{ url: string; method: string | undefined; csrf: string | null }> = []
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({
        url: String(url),
        method: init?.method,
        csrf: new Headers(init?.headers).get("x-csrf-token"),
      })
      const body =
        init?.method === "GET"
          ? { categories: NOTIFICATION_CATEGORY_DEFAULTS, emailAvailable: true }
          : { ok: true }
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    }) as unknown as typeof fetch
    const client = createApiClient({
      baseURL: "https://api.civfix.test",
      fetchImpl,
      getCsrfToken: () => "csrf-1",
    })

    await client.getNotificationSettings()
    await client.dismissNotification({ id: U1 })
    await client.markAllNotificationsRead()

    expect(calls).toEqual([
      { url: "https://api.civfix.test/v1/notifications/settings", method: "GET", csrf: null },
      { url: `https://api.civfix.test/v1/notifications/${U1}`, method: "DELETE", csrf: "csrf-1" },
      { url: "https://api.civfix.test/v1/notifications/read-all", method: "POST", csrf: "csrf-1" },
    ])
  })

  it("T27: the old prefs endpoints and NotificationPrefsDTO are unchanged", () => {
    expect(endpoints.getNotificationPrefs).toMatchObject({
      method: "GET",
      path: "/notifications/prefs",
      auth: "required",
      csrf: false,
      request: null,
    })
    expect(endpoints.getNotificationPrefs.response).toBe(GetNotificationPrefsResponseSchema)
    expect(endpoints.updateNotificationPrefs).toMatchObject({
      method: "PUT",
      path: "/notifications/prefs",
      auth: "required",
      csrf: true,
    })
    expect(endpoints.updateNotificationPrefs.request).toBe(UpdateNotificationPrefsRequestSchema)
    expect(Object.keys(NotificationPrefsDTOSchema.shape)).toEqual([
      "push",
      "cleanupChat",
      "reportUpdates",
      "follows",
      "mentions",
      "postInteractions",
      "hostBroadcasts",
      "quietHours",
    ])
  })
})
