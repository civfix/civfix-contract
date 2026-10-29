import { z } from "zod"
import { EMAIL_MAX_LENGTH, IdSchema, ISODateSchema } from "../common.js"
import { RuntimeFlagValueSchema } from "../../flags/runtime-flags.js"

/** The developer console: runtime flags, what is running, the job queues and the staging test tools. */

const CountSchema = z.number().int().nonnegative()

export const RuntimeFlagStateDTOSchema = z
  .object({
    key: z.string(),
    /** The effective value: the override when there is one, otherwise `fallback`. */
    value: RuntimeFlagValueSchema,
    override: RuntimeFlagValueSchema,
    fallback: RuntimeFlagValueSchema,
    fallbackSource: z.enum(["env", "default"]),
    updatedAt: ISODateSchema.nullable(),
    /** Null when there is no override or the operator's account no longer exists. */
    updatedBy: z.object({ id: IdSchema, email: z.string() }).strict().nullable(),
  })
  .strict()
export type RuntimeFlagStateDTO = z.infer<typeof RuntimeFlagStateDTOSchema>

export const AdminListRuntimeFlagsResponseSchema = z
  .object({ flags: z.array(RuntimeFlagStateDTOSchema) })
  .strict()
export type AdminListRuntimeFlagsResponse = z.infer<typeof AdminListRuntimeFlagsResponseSchema>

/**
 * `key` is the `:key` path param (the typed client fills the path from it); the server reads it from
 * the path. It is any string so an unknown key is the server's NOT_FOUND, not a parse error. The
 * per-key value check is `runtimeFlagValueSchema(key)`; `value: null` clears the override.
 */
export const AdminSetRuntimeFlagRequestSchema = z
  .object({ key: z.string(), value: RuntimeFlagValueSchema })
  .strict()
export type AdminSetRuntimeFlagRequest = z.infer<typeof AdminSetRuntimeFlagRequestSchema>

export const AdminDevEnvironmentSchema = z.enum(["prod", "staging", "local", "unknown"])
export type AdminDevEnvironment = z.infer<typeof AdminDevEnvironmentSchema>

export const AdminDevOverviewResponseSchema = z
  .object({
    environment: AdminDevEnvironmentSchema,
    devToolsEnabled: z.boolean(),
    api: z
      .object({
        commit: z.string().nullable(),
        releaseRef: z.string().nullable(),
        image: z.string().nullable(),
        startedAt: ISODateSchema,
        contractVersion: z.string(),
        nodeVersion: z.string(),
      })
      .strict(),
    worker: z
      .object({
        image: z.string().nullable(),
        lastJobCompletedAt: ISODateSchema.nullable(),
      })
      .strict(),
    /** One per fake-seam flag, named by the flag without `USE_FAKE_`, lowercased. */
    seams: z.array(
      z
        .object({
          name: z.string().regex(/^[a-z][a-z0-9_]*$/),
          mode: z.enum(["real", "fake"]),
        })
        .strict(),
    ),
    /** Env-only settings, shown read-only. Never a secret, code, key, account id or credentialed URL. */
    settings: z.array(z.object({ key: z.string(), value: z.string() }).strict()),
    /** Empty when dev tools are off. */
    testAccounts: z.array(z.string()),
  })
  .strict()
export type AdminDevOverviewResponse = z.infer<typeof AdminDevOverviewResponseSchema>

export const AdminDevQueueSchema = z
  .object({
    name: z.string(),
    owner: z.enum(["api", "worker"]),
    schedule: z.string().nullable(),
    counts: z
      .object({
        created: CountSchema,
        retry: CountSchema,
        active: CountSchema,
        failed: CountSchema,
      })
      .strict(),
    failedLast24h: CountSchema,
    oldestPendingSeconds: CountSchema,
    lastCompletedAt: ISODateSchema.nullable(),
    runnable: z.boolean(),
  })
  .strict()
export type AdminDevQueue = z.infer<typeof AdminDevQueueSchema>

export const AdminDevJobsResponseSchema = z
  .object({ queues: z.array(AdminDevQueueSchema) })
  .strict()
export type AdminDevJobsResponse = z.infer<typeof AdminDevJobsResponseSchema>

export const AdminDevRunJobResponseSchema = z.object({ enqueued: z.boolean() }).strict()
export type AdminDevRunJobResponse = z.infer<typeof AdminDevRunJobResponseSchema>

/** The test tools act only on configured test accounts, named by email, and only while dev tools are on. */
export const DEV_TEST_PUSH_TITLE_MAX_LENGTH = 80
export const DEV_TEST_PUSH_BODY_MAX_LENGTH = 200

const TestAccountEmailSchema = z.string().trim().check(z.email()).max(EMAIL_MAX_LENGTH)

export const AdminDevSetForceUpdateRequestSchema = z
  .object({ email: TestAccountEmailSchema, enabled: z.boolean() })
  .strict()
export type AdminDevSetForceUpdateRequest = z.infer<typeof AdminDevSetForceUpdateRequestSchema>

export const AdminDevForceUpdateAccountSchema = z
  .object({ userId: IdSchema, email: z.string(), expiresAt: ISODateSchema })
  .strict()
export type AdminDevForceUpdateAccount = z.infer<typeof AdminDevForceUpdateAccountSchema>

export const AdminDevForceUpdateListResponseSchema = z
  .object({ accounts: z.array(AdminDevForceUpdateAccountSchema) })
  .strict()
export type AdminDevForceUpdateListResponse = z.infer<typeof AdminDevForceUpdateListResponseSchema>

export const AdminDevTestPushRequestSchema = z
  .object({
    email: TestAccountEmailSchema,
    title: z.string().max(DEV_TEST_PUSH_TITLE_MAX_LENGTH).optional(),
    body: z.string().max(DEV_TEST_PUSH_BODY_MAX_LENGTH).optional(),
  })
  .strict()
export type AdminDevTestPushRequest = z.infer<typeof AdminDevTestPushRequestSchema>

/** The account's active push devices, counted separately from the send; 0 is not an error. */
export const AdminDevTestPushResponseSchema = z.object({ devices: CountSchema }).strict()
export type AdminDevTestPushResponse = z.infer<typeof AdminDevTestPushResponseSchema>

/** Empty and strict: the test email only ever goes to the signed-in operator. */
export const AdminDevTestEmailRequestSchema = z.object({}).strict()
export type AdminDevTestEmailRequest = z.infer<typeof AdminDevTestEmailRequestSchema>

export const AdminDevTestEmailResponseSchema = z.object({ to: z.string() }).strict()
export type AdminDevTestEmailResponse = z.infer<typeof AdminDevTestEmailResponseSchema>

export const AdminDevResetFirstRunRequestSchema = z
  .object({ email: TestAccountEmailSchema })
  .strict()
export type AdminDevResetFirstRunRequest = z.infer<typeof AdminDevResetFirstRunRequestSchema>

export const AdminDevResetFirstRunResponseSchema = z.object({ userId: IdSchema }).strict()
export type AdminDevResetFirstRunResponse = z.infer<typeof AdminDevResetFirstRunResponseSchema>
