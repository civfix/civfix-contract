import { describe, it, expect, vi } from "vitest"
import type { z } from "zod"
import * as root from "../src/index.js"
import { createApiClient } from "../src/client/client.js"
import { endpoints } from "../src/client/endpoints.js"
import { RUNTIME_FLAGS, runtimeFlagValueSchema } from "../src/flags/runtime-flags.js"
import { AppConfigResponseSchema } from "../src/schemas/app-config.js"
import {
  AdminDevForceUpdateListResponseSchema,
  AdminDevJobsResponseSchema,
  AdminDevOverviewResponseSchema,
  AdminDevResetFirstRunRequestSchema,
  AdminDevResetFirstRunResponseSchema,
  AdminDevRunJobResponseSchema,
  AdminDevSetForceUpdateRequestSchema,
  AdminDevTestEmailRequestSchema,
  AdminDevTestEmailResponseSchema,
  AdminDevTestPushRequestSchema,
  AdminDevTestPushResponseSchema,
  AdminListRuntimeFlagsResponseSchema,
  AdminSetRuntimeFlagRequestSchema,
  RuntimeFlagStateDTOSchema,
} from "../src/schemas/admin/dev.js"

const UUID = "123e4567-e89b-12d3-a456-426614174000"
const T = "2026-10-25T05:00:00.000Z"
const PLAY = "https://play.google.com/store/apps/details?id=org.civfix.community"

// Indexed by name so a missing endpoint fails its assertion instead of the type check.
const registry = endpoints as Record<
  string,
  | {
      method: string
      path: string
      request: unknown
      response: unknown
      auth: string
      csrf: boolean
      version: string
    }
  | undefined
>

function accepts(schema: z.ZodType, input: unknown): unknown {
  const r = schema.safeParse(input)
  expect(r.success, JSON.stringify(input)).toBe(true)
  return r.data
}

function rejects(schema: z.ZodType, input: unknown): void {
  expect(schema.safeParse(input).success, JSON.stringify(input)).toBe(false)
}

function flag(key: string) {
  const f = RUNTIME_FLAGS.find((x) => x.key === key)
  expect(f, key).toBeDefined()
  return f as Record<string, unknown>
}

describe("runtime flag registry", () => {
  it("T1: lists exactly the eight flags in order", () => {
    expect(RUNTIME_FLAGS.map((f) => f.key)).toEqual([
      "host_messaging_kill_switch",
      "outreach_digest_enabled",
      "report_autoforward_enabled",
      "min_app_version_ios",
      "min_app_version_android",
      "app_store_url_ios",
      "announcement_text",
      "announcement_level",
    ])
  })

  it("T2: gives each flag its type, default, env fallback and public value", () => {
    expect(RUNTIME_FLAGS.map((f) => [f.type, f.default, f.envFallback, f.public])).toEqual([
      ["boolean", false, "HOST_MESSAGING_KILL_SWITCH", false],
      ["boolean", false, "OUTREACH_DIGEST_ENABLED", false],
      ["boolean", false, "REPORT_AUTOFORWARD_ENABLED", false],
      ["semver", null, null, true],
      ["semver", null, null, true],
      ["url", null, null, true],
      ["text", null, null, true],
      ["choice", "info", null, true],
    ])
  })

  it("T3: gives each flag its label and description", () => {
    expect(RUNTIME_FLAGS.map((f) => [f.label, f.description])).toEqual([
      [
        "Host messaging kill switch",
        "Stops every message organizers send to their guests, including ones already sending.",
      ],
      ["Outreach digest", "Sends the daily digest of new reports to city contacts."],
      [
        "Report auto-forward",
        "Forwards new reports to the city contact automatically when they are filed.",
      ],
      [
        "Minimum iOS version",
        "iPhones below this version are asked to update before using civfix.",
      ],
      [
        "Minimum Android version",
        "Android phones below this version are asked to update before using civfix.",
      ],
      ["App Store link (iOS)", "The App Store page the update screen opens on iPhones."],
      [
        "Announcement text",
        "A short message shown at the top of the website and the phone app for everyone. Empty shows nothing.",
      ],
      ["Announcement style", "Info is blue, Warning is yellow."],
    ])
  })

  it("T4: carries the choices, max length and URL prefix", () => {
    expect(flag("announcement_level").choices).toEqual([
      { value: "info", label: "Info" },
      { value: "warning", label: "Warning" },
    ])
    expect(flag("announcement_text").maxLength).toBe(200)
    expect(flag("app_store_url_ios").urlPrefix).toBe("https://apps.apple.com/")
  })
})

describe("runtimeFlagValueSchema", () => {
  it("T5: boolean flags take a boolean and nothing else", () => {
    for (const key of [
      "host_messaging_kill_switch",
      "outreach_digest_enabled",
      "report_autoforward_enabled",
    ]) {
      const s = runtimeFlagValueSchema(key)
      expect(accepts(s, true)).toBe(true)
      expect(accepts(s, false)).toBe(false)
      for (const bad of [null, "true", 1]) rejects(s, bad)
    }
  })

  it("T6: semver flags take trimmed MAJOR.MINOR.PATCH digits or null", () => {
    for (const key of ["min_app_version_ios", "min_app_version_android"]) {
      const s = runtimeFlagValueSchema(key)
      expect(accepts(s, "1.2.3")).toBe("1.2.3")
      expect(accepts(s, " 10.0.12 ")).toBe("10.0.12")
      expect(accepts(s, null)).toBe(null)
      for (const bad of ["", "   ", "1.2", "1.2.3.4", "v1.2.3", "1.2.3-beta.1", "1.x.3", 123, true])
        rejects(s, bad)
    }
  })

  it("T7: the App Store URL takes a trimmed App Store link or null", () => {
    const s = runtimeFlagValueSchema("app_store_url_ios")
    const url = "https://apps.apple.com/us/app/civfix/id1234567890"
    expect(accepts(s, url)).toBe(url)
    expect(accepts(s, ` ${url} `)).toBe(url)
    expect(accepts(s, null)).toBe(null)
    for (const bad of [
      "",
      "http://apps.apple.com/us/app/civfix/id1",
      "https://apps.apple.com.evil.example/x",
      PLAY,
      true,
    ])
      rejects(s, bad)
  })

  it("T8: the announcement text takes trimmed text up to 200 characters or null", () => {
    const s = runtimeFlagValueSchema("announcement_text")
    const a200 = "a".repeat(200)
    expect(accepts(s, "Maintenance tonight")).toBe("Maintenance tonight")
    expect(accepts(s, "  hi  ")).toBe("hi")
    expect(accepts(s, a200)).toBe(a200)
    expect(accepts(s, ` ${a200} `)).toBe(a200)
    expect(accepts(s, null)).toBe(null)
    for (const bad of ["a".repeat(201), "", "   ", false]) rejects(s, bad)
  })

  it("T9: the announcement level takes one of its trimmed choices", () => {
    const s = runtimeFlagValueSchema("announcement_level")
    expect(accepts(s, "info")).toBe("info")
    expect(accepts(s, "warning")).toBe("warning")
    expect(accepts(s, " warning ")).toBe("warning")
    for (const bad of ["Info", "error", "", null, true]) rejects(s, bad)
  })

  it("T10: an unknown key takes no value at all", () => {
    expect.hasAssertions()
    const s = runtimeFlagValueSchema("not_a_flag")
    for (const bad of [true, "x", null]) rejects(s, bad)
  })
})

describe("app config", () => {
  it("T11: parses the app config and rejects a bad level, a missing Android link or version", () => {
    const sample = {
      minAppVersion: { ios: "1.4.0", android: null },
      storeUrl: { ios: null, android: PLAY },
      announcement: { text: "Hi", level: "warning" },
    }
    expect(accepts(AppConfigResponseSchema, sample)).toEqual(sample)
    const noAnnouncement = { ...sample, announcement: null }
    expect(accepts(AppConfigResponseSchema, noAnnouncement)).toEqual(noAnnouncement)
    rejects(AppConfigResponseSchema, { ...sample, announcement: { text: "Hi", level: "error" } })
    rejects(AppConfigResponseSchema, { ...sample, storeUrl: { ios: null, android: null } })
    rejects(AppConfigResponseSchema, { ...sample, minAppVersion: { ios: "1.4.0" } })
  })
})

describe("runtime flag admin schemas", () => {
  const A = {
    key: "host_messaging_kill_switch",
    value: true,
    override: true,
    fallback: false,
    fallbackSource: "env",
    updatedAt: T,
    updatedBy: { id: UUID, email: "op@civfix.org" },
  }
  const B = {
    key: "min_app_version_ios",
    value: null,
    override: null,
    fallback: null,
    fallbackSource: "default",
    updatedAt: null,
    updatedBy: null,
  }

  it("T12: parses the flag list and rejects a bad source, value or operator", () => {
    expect(accepts(AdminListRuntimeFlagsResponseSchema, { flags: [A, B] })).toEqual({
      flags: [A, B],
    })
    rejects(RuntimeFlagStateDTOSchema, { ...A, fallbackSource: "override" })
    rejects(RuntimeFlagStateDTOSchema, { ...A, value: 3 })
    rejects(RuntimeFlagStateDTOSchema, { ...A, updatedBy: { id: UUID } })
  })

  it("T13: takes a key and a JSON value, unknown keys included, and nothing else", () => {
    for (const ok of [
      { key: "announcement_text", value: "Hi" },
      { key: "announcement_text", value: null },
      { key: "not_a_flag", value: true },
    ])
      expect(accepts(AdminSetRuntimeFlagRequestSchema, ok)).toEqual(ok)
    rejects(AdminSetRuntimeFlagRequestSchema, { key: "announcement_text", value: "Hi", extra: 1 })
    rejects(AdminSetRuntimeFlagRequestSchema, { key: "announcement_text" })
    rejects(AdminSetRuntimeFlagRequestSchema, { key: "announcement_text", value: 3 })
  })
})

describe("developer overview", () => {
  const full = {
    environment: "staging",
    devToolsEnabled: true,
    api: {
      commit: "3f9c2ab01d4e5f6a7b8c9d0e1f2a3b4c5d6e7f80",
      releaseRef: "main",
      image: "ghcr.io/civfix/api@sha256:" + "a".repeat(64),
      startedAt: T,
      contractVersion: "0.65.0",
      nodeVersion: "v22.11.0",
    },
    worker: {
      image: "ghcr.io/civfix/media-worker@sha256:" + "b".repeat(64),
      lastJobCompletedAt: T,
    },
    seams: [
      { name: "storage", mode: "fake" },
      { name: "push", mode: "real" },
    ],
    settings: [{ key: "SMS_DAILY_CAP", value: "500" }],
    testAccounts: ["tester1@civfix.org"],
  }
  const empty = {
    environment: "unknown",
    devToolsEnabled: false,
    api: {
      commit: null,
      releaseRef: null,
      image: null,
      startedAt: T,
      contractVersion: "0.65.0",
      nodeVersion: "v22.11.0",
    },
    worker: { image: null, lastJobCompletedAt: null },
    seams: [],
    settings: [],
    testAccounts: [],
  }

  it("T14: parses a full and an empty overview, in every environment", () => {
    expect(accepts(AdminDevOverviewResponseSchema, full)).toEqual(full)
    expect(accepts(AdminDevOverviewResponseSchema, empty)).toEqual(empty)
    for (const environment of ["prod", "local"])
      expect(accepts(AdminDevOverviewResponseSchema, { ...full, environment })).toEqual({
        ...full,
        environment,
      })
  })

  it("T15: rejects an unknown environment or seam mode, a capitalized seam and a missing API field", () => {
    expect.hasAssertions()
    rejects(AdminDevOverviewResponseSchema, { ...full, environment: "production" })
    rejects(AdminDevOverviewResponseSchema, {
      ...full,
      seams: [{ name: "Storage", mode: "fake" }, full.seams[1]],
    })
    rejects(AdminDevOverviewResponseSchema, {
      ...full,
      seams: [{ name: "storage", mode: "off" }, full.seams[1]],
    })
    for (const field of ["startedAt", "contractVersion", "nodeVersion"])
      rejects(AdminDevOverviewResponseSchema, { ...full, api: { ...full.api, [field]: null } })
  })
})

describe("developer jobs", () => {
  const q1 = {
    name: "inbound.sweep",
    owner: "api",
    schedule: "*/5 * * * *",
    counts: { created: 1, retry: 0, active: 0, failed: 2 },
    failedLast24h: 3,
    oldestPendingSeconds: 42,
    lastCompletedAt: T,
    runnable: true,
  }
  const q2 = {
    name: "media.checks",
    owner: "worker",
    schedule: null,
    counts: { created: 0, retry: 0, active: 0, failed: 0 },
    failedLast24h: 0,
    oldestPendingSeconds: 0,
    lastCompletedAt: null,
    runnable: false,
  }

  it("T16: parses the queue list and rejects a bad owner, count, age or a missing runnable", () => {
    expect(accepts(AdminDevJobsResponseSchema, { queues: [q1, q2] })).toEqual({ queues: [q1, q2] })
    const { runnable: _runnable, ...noRunnable } = q1
    for (const bad of [
      { ...q1, owner: "scheduler" },
      { ...q1, counts: { ...q1.counts, failed: -1 } },
      { ...q1, oldestPendingSeconds: 1.5 },
      noRunnable,
    ])
      rejects(AdminDevJobsResponseSchema, { queues: [bad, q2] })
  })

  it("T17: a run says whether it enqueued", () => {
    expect(accepts(AdminDevRunJobResponseSchema, { enqueued: true })).toEqual({ enqueued: true })
    expect(accepts(AdminDevRunJobResponseSchema, { enqueued: false })).toEqual({ enqueued: false })
    rejects(AdminDevRunJobResponseSchema, {})
    rejects(AdminDevRunJobResponseSchema, { enqueued: "yes" })
  })
})

describe("developer test tools", () => {
  it("T18: force update takes a trimmed valid email and a boolean, nothing else", () => {
    expect(
      accepts(AdminDevSetForceUpdateRequestSchema, {
        email: "  tester1@civfix.org ",
        enabled: true,
      }),
    ).toEqual({ email: "tester1@civfix.org", enabled: true })
    for (const bad of [
      { email: "not-an-email", enabled: true },
      { email: "tester1@civfix.org", enabled: "yes" },
      { email: "tester1@civfix.org" },
      { email: "tester1@civfix.org", enabled: false, userId: UUID },
    ])
      rejects(AdminDevSetForceUpdateRequestSchema, bad)
  })

  it("T19: both force update endpoints answer with the account list", () => {
    const one = { accounts: [{ userId: UUID, email: "tester1@civfix.org", expiresAt: T }] }
    expect(accepts(AdminDevForceUpdateListResponseSchema, one)).toEqual(one)
    expect(accepts(AdminDevForceUpdateListResponseSchema, { accounts: [] })).toEqual({
      accounts: [],
    })
    expect(registry.adminDevListForceUpdate?.response).toBe(AdminDevForceUpdateListResponseSchema)
    expect(registry.adminDevSetForceUpdate?.response).toBe(AdminDevForceUpdateListResponseSchema)
    rejects(AdminDevForceUpdateListResponseSchema, {
      accounts: [{ userId: "abc", email: "tester1@civfix.org", expiresAt: T }],
    })
    rejects(AdminDevForceUpdateListResponseSchema, {
      accounts: [{ userId: UUID, email: "tester1@civfix.org" }],
    })
  })

  it("T20: a test push takes a trimmed email and an optional title and body within their limits", () => {
    expect(accepts(AdminDevTestPushRequestSchema, { email: " tester1@civfix.org" })).toEqual({
      email: "tester1@civfix.org",
    })
    const full = { email: "tester1@civfix.org", title: "t".repeat(80), body: "b".repeat(200) }
    expect(accepts(AdminDevTestPushRequestSchema, full)).toEqual(full)
    for (const bad of [
      { email: "tester1@civfix.org", title: "t".repeat(81) },
      { email: "tester1@civfix.org", body: "b".repeat(201) },
      { email: "nope" },
      { email: "tester1@civfix.org", data: {} },
    ])
      rejects(AdminDevTestPushRequestSchema, bad)
  })

  it("T21: a test push answers with a whole, non-negative device count", () => {
    expect(accepts(AdminDevTestPushResponseSchema, { devices: 0 })).toEqual({ devices: 0 })
    expect(accepts(AdminDevTestPushResponseSchema, { devices: 3 })).toEqual({ devices: 3 })
    rejects(AdminDevTestPushResponseSchema, { devices: -1 })
    rejects(AdminDevTestPushResponseSchema, { devices: 1.5 })
  })

  it("T22: a test email names no recipient and answers with the operator's address", () => {
    expect(accepts(AdminDevTestEmailRequestSchema, {})).toEqual({})
    rejects(AdminDevTestEmailRequestSchema, { to: "someone@civfix.org" })
    expect(accepts(AdminDevTestEmailResponseSchema, { to: "op@civfix.org" })).toEqual({
      to: "op@civfix.org",
    })
    rejects(AdminDevTestEmailResponseSchema, {})
  })

  it("T23: reset first run takes a trimmed email and answers with the account id", () => {
    expect(accepts(AdminDevResetFirstRunRequestSchema, { email: "tester1@civfix.org " })).toEqual({
      email: "tester1@civfix.org",
    })
    rejects(AdminDevResetFirstRunRequestSchema, {})
    rejects(AdminDevResetFirstRunRequestSchema, { email: "tester1@civfix.org", userId: UUID })
    expect(accepts(AdminDevResetFirstRunResponseSchema, { userId: UUID })).toEqual({ userId: UUID })
    rejects(AdminDevResetFirstRunResponseSchema, { userId: "abc" })
  })
})

describe("developer console endpoints", () => {
  it("T24: registers each new endpoint with its method, path, auth, csrf and schemas", () => {
    const expected: Array<[string, string, string, unknown, string, boolean, unknown]> = [
      ["getAppConfig", "GET", "/app/config", null, "optional", false, AppConfigResponseSchema],
      [
        "adminListRuntimeFlags",
        "GET",
        "/admin/dev/flags",
        null,
        "required",
        false,
        AdminListRuntimeFlagsResponseSchema,
      ],
      [
        "adminSetRuntimeFlag",
        "PUT",
        "/admin/dev/flags/:key",
        AdminSetRuntimeFlagRequestSchema,
        "required",
        true,
        RuntimeFlagStateDTOSchema,
      ],
      [
        "adminDevOverview",
        "GET",
        "/admin/dev/overview",
        null,
        "required",
        false,
        AdminDevOverviewResponseSchema,
      ],
      [
        "adminDevJobs",
        "GET",
        "/admin/dev/jobs",
        null,
        "required",
        false,
        AdminDevJobsResponseSchema,
      ],
      [
        "adminDevRunJob",
        "POST",
        "/admin/dev/jobs/:name/run",
        null,
        "required",
        true,
        AdminDevRunJobResponseSchema,
      ],
      [
        "adminDevListForceUpdate",
        "GET",
        "/admin/dev/test/force-update",
        null,
        "required",
        false,
        AdminDevForceUpdateListResponseSchema,
      ],
      [
        "adminDevSetForceUpdate",
        "PUT",
        "/admin/dev/test/force-update",
        AdminDevSetForceUpdateRequestSchema,
        "required",
        true,
        AdminDevForceUpdateListResponseSchema,
      ],
      [
        "adminDevTestPush",
        "POST",
        "/admin/dev/test/push",
        AdminDevTestPushRequestSchema,
        "required",
        true,
        AdminDevTestPushResponseSchema,
      ],
      [
        "adminDevTestEmail",
        "POST",
        "/admin/dev/test/email",
        AdminDevTestEmailRequestSchema,
        "required",
        true,
        AdminDevTestEmailResponseSchema,
      ],
      [
        "adminDevResetFirstRun",
        "POST",
        "/admin/dev/test/reset-first-run",
        AdminDevResetFirstRunRequestSchema,
        "required",
        true,
        AdminDevResetFirstRunResponseSchema,
      ],
    ]
    for (const [name, method, path, request, auth, csrf, response] of expected) {
      const e = registry[name]
      expect(e, name).toBeDefined()
      expect(
        { method: e!.method, path: e!.path, auth: e!.auth, csrf: e!.csrf, version: e!.version },
        name,
      ).toEqual({
        method,
        path,
        auth,
        csrf,
        version: "v1",
      })
      expect(e!.request, name).toBe(request)
      expect(e!.response, name).toBe(response)
    }
  })
})

describe("developer console client", () => {
  it("T26: fills the flag key and job name into the path and sends the flag value", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = []
    // Each call answers with a body its response schema accepts, so the client logs no mismatch warning.
    const bodies: Record<string, unknown> = {
      "/v1/admin/dev/flags/announcement_text": {
        key: "announcement_text",
        value: null,
        override: null,
        fallback: null,
        fallbackSource: "default",
        updatedAt: null,
        updatedBy: null,
      },
      "/v1/admin/dev/jobs/inbound.sweep/run": { enqueued: true },
      "/v1/app/config": {
        minAppVersion: { ios: null, android: null },
        storeUrl: { ios: null, android: PLAY },
        announcement: null,
      },
    }
    const fetchImpl = vi.fn(async (url: string | URL, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} })
      return new Response(JSON.stringify(bodies[new URL(url).pathname]), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    }) as unknown as typeof fetch
    const client = createApiClient({
      baseURL: "https://api.civfix.test",
      fetchImpl,
      getCsrfToken: () => "csrf-1",
    }) as unknown as Record<string, (input?: unknown) => Promise<unknown>>

    await client.adminSetRuntimeFlag!({ key: "announcement_text", value: null })
    await client.adminDevRunJob!({ name: "inbound.sweep" })
    await client.getAppConfig!()

    expect(calls[0]!.init.method).toBe("PUT")
    expect(calls[0]!.url).toBe("https://api.civfix.test/v1/admin/dev/flags/announcement_text")
    expect(JSON.parse(calls[0]!.init.body as string)).toHaveProperty("value", null)
    expect(calls[1]!.init.method).toBe("POST")
    expect(calls[1]!.url).toBe("https://api.civfix.test/v1/admin/dev/jobs/inbound.sweep/run")
    expect(calls[1]!.init.body).toBeUndefined()
    expect(calls[2]!.init.method).toBe("GET")
    expect(calls[2]!.url).toBe("https://api.civfix.test/v1/app/config")
  })
})

describe("package root", () => {
  it("T27: exports the registry, the value check and the new schemas", () => {
    const names = [
      "RUNTIME_FLAGS",
      "runtimeFlagValueSchema",
      "AppConfigResponseSchema",
      "RuntimeFlagStateDTOSchema",
      "AdminSetRuntimeFlagRequestSchema",
      "AdminDevOverviewResponseSchema",
      "AdminDevJobsResponseSchema",
      "AdminDevSetForceUpdateRequestSchema",
      "AdminDevTestPushRequestSchema",
      "AdminDevTestEmailRequestSchema",
      "AdminDevResetFirstRunRequestSchema",
    ]
    for (const name of names) expect((root as Record<string, unknown>)[name], name).toBeDefined()
  })
})
