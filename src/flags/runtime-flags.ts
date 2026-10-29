import { z } from "zod"

/**
 * Runtime flags: operator-set values the backend reads at the moment it acts (DECISIONS §65). The list is
 * fixed here so every flag, its type and its fallback is reviewed in the contract; the backend stores
 * only overrides and resolves each value against this registry.
 */

/** A flag value as stored and sent: JSON. Which of these a key takes is `runtimeFlagValueSchema(key)`. */
export const RuntimeFlagValueSchema = z.union([z.boolean(), z.string(), z.null()])
export type RuntimeFlagValue = z.infer<typeof RuntimeFlagValueSchema>

export type RuntimeFlagType = "boolean" | "semver" | "url" | "text" | "choice"

export interface RuntimeFlagChoice {
  value: string
  label: string
}

interface RuntimeFlagBase {
  key: string
  label: string
  description: string
  /** The backend env var used when there is no override, or null. */
  envFallback: string | null
  /** Included in `GET /app/config`. */
  public: boolean
}

export type RuntimeFlagDef = RuntimeFlagBase &
  (
    | { type: "boolean"; default: boolean }
    | { type: "semver"; default: string | null }
    | { type: "url"; default: string | null; urlPrefix: string }
    | { type: "text"; default: string | null; maxLength: number }
    | { type: "choice"; default: string; choices: readonly RuntimeFlagChoice[] }
  )

export const RUNTIME_FLAGS = [
  {
    key: "host_messaging_kill_switch",
    label: "Host messaging kill switch",
    description:
      "Stops every message organizers send to their guests, including ones already sending.",
    type: "boolean",
    default: false,
    envFallback: "HOST_MESSAGING_KILL_SWITCH",
    public: false,
  },
  {
    key: "outreach_digest_enabled",
    label: "Outreach digest",
    description: "Sends the daily digest of new reports to city contacts.",
    type: "boolean",
    default: false,
    envFallback: "OUTREACH_DIGEST_ENABLED",
    public: false,
  },
  {
    key: "report_autoforward_enabled",
    label: "Report auto-forward",
    description: "Forwards new reports to the city contact automatically when they are filed.",
    type: "boolean",
    default: false,
    envFallback: "REPORT_AUTOFORWARD_ENABLED",
    public: false,
  },
  {
    key: "min_app_version_ios",
    label: "Minimum iOS version",
    description: "iPhones below this version are asked to update before using civfix.",
    type: "semver",
    default: null,
    envFallback: null,
    public: true,
  },
  {
    key: "min_app_version_android",
    label: "Minimum Android version",
    description: "Android phones below this version are asked to update before using civfix.",
    type: "semver",
    default: null,
    envFallback: null,
    public: true,
  },
  {
    key: "app_store_url_ios",
    label: "App Store link (iOS)",
    description: "The App Store page the update screen opens on iPhones.",
    type: "url",
    default: null,
    urlPrefix: "https://apps.apple.com/",
    envFallback: null,
    public: true,
  },
  {
    key: "announcement_text",
    label: "Announcement text",
    description:
      "A short message shown at the top of the website and the phone app for everyone. Empty shows nothing.",
    type: "text",
    default: null,
    maxLength: 200,
    envFallback: null,
    public: true,
  },
  {
    key: "announcement_level",
    label: "Announcement style",
    description: "Info is blue, Warning is yellow.",
    type: "choice",
    default: "info",
    choices: [
      { value: "info", label: "Info" },
      { value: "warning", label: "Warning" },
    ],
    envFallback: null,
    public: true,
  },
] as const satisfies readonly RuntimeFlagDef[]

export type RuntimeFlagKey = (typeof RUNTIME_FLAGS)[number]["key"]

const SEMVER_RE = /^\d+\.\d+\.\d+$/

// Strings are trimmed and must be non-empty, so "not set" always travels as null and never as "".
function valueSchema(flag: RuntimeFlagDef): z.ZodType<RuntimeFlagValue, unknown> {
  switch (flag.type) {
    case "boolean":
      return z.boolean()
    case "semver":
      return z.string().trim().regex(SEMVER_RE).nullable()
    case "url":
      return z.string().trim().check(z.url()).startsWith(flag.urlPrefix).nullable()
    case "text":
      return z.string().trim().min(1).max(flag.maxLength).nullable()
    case "choice":
      return z
        .string()
        .trim()
        .pipe(z.enum(flag.choices.map((c) => c.value) as [string, ...string[]]))
  }
}

/** The value check for one flag. An unknown key accepts nothing, null included. */
export function runtimeFlagValueSchema(key: string): z.ZodType<RuntimeFlagValue, unknown> {
  const flag = (RUNTIME_FLAGS as readonly RuntimeFlagDef[]).find((f) => f.key === key)
  return flag ? valueSchema(flag) : z.never()
}
