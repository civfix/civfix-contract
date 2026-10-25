
export enum ErrorCode {
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  VALIDATION = "VALIDATION",
  RATE_LIMITED = "RATE_LIMITED",
  IDEMPOTENT_REPLAY = "IDEMPOTENT_REPLAY",
  ABUSE_HELD = "ABUSE_HELD",
  TURNSTILE_FAILED = "TURNSTILE_FAILED",
  GPS_IMPLAUSIBLE = "GPS_IMPLAUSIBLE",
  MEDIA_REJECTED = "MEDIA_REJECTED",
  NOT_ROUTABLE = "NOT_ROUTABLE",
  CONFLICT = "CONFLICT",
  UNSUPPORTED_API_VERSION = "UNSUPPORTED_API_VERSION",
  API_VERSION_SUNSET = "API_VERSION_SUNSET",
  INTERNAL = "INTERNAL",
}

export const ERROR_HTTP_STATUS: Record<ErrorCode, number> = {
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.VALIDATION]: 422,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.IDEMPOTENT_REPLAY]: 200,
  [ErrorCode.ABUSE_HELD]: 202,
  [ErrorCode.TURNSTILE_FAILED]: 403,
  [ErrorCode.GPS_IMPLAUSIBLE]: 422,
  [ErrorCode.MEDIA_REJECTED]: 422,
  [ErrorCode.NOT_ROUTABLE]: 422,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.UNSUPPORTED_API_VERSION]: 400,
  [ErrorCode.API_VERSION_SUNSET]: 410,
  [ErrorCode.INTERNAL]: 500,
}

/** Structured context a client acts on, named by the error (e.g. `LegalVersionOutdatedDetails`). */
export type AppErrorDetails = Record<string, unknown>

export interface AppErrorOptions {
  httpStatus?: number
  fields?: Record<string, string>
  details?: AppErrorDetails
  requestId?: string
  cause?: unknown
}

export class AppError extends Error {
  readonly code: ErrorCode
  readonly httpStatus: number
  readonly fields?: Record<string, string>
  // `declare` emits no field, so an error without details has no `details` key at all and serializes as before.
  declare readonly details?: AppErrorDetails
  requestId?: string

  constructor(code: ErrorCode, message: string, opts: AppErrorOptions = {}) {
    super(message, opts.cause !== undefined ? { cause: opts.cause } : undefined)
    this.name = "AppError"
    this.code = code
    this.httpStatus = opts.httpStatus ?? ERROR_HTTP_STATUS[code]
    if (opts.fields !== undefined) this.fields = opts.fields
    if (opts.details !== undefined) this.details = opts.details
    if (opts.requestId !== undefined) this.requestId = opts.requestId
    Object.setPrototypeOf(this, new.target.prototype)
  }

  toJSON(): {
    code: ErrorCode
    message: string
    requestId?: string
    fields?: Record<string, string>
    details?: AppErrorDetails
  } {
    return {
      code: this.code,
      message: this.message,
      ...(this.requestId !== undefined ? { requestId: this.requestId } : {}),
      ...(this.fields !== undefined ? { fields: this.fields } : {}),
      ...(this.details !== undefined ? { details: this.details } : {}),
    }
  }

  static unauthorized(message = "Unauthorized"): AppError {
    return new AppError(ErrorCode.UNAUTHORIZED, message)
  }

  static forbidden(message = "Forbidden"): AppError {
    return new AppError(ErrorCode.FORBIDDEN, message)
  }

  static notFound(message = "Not found"): AppError {
    return new AppError(ErrorCode.NOT_FOUND, message)
  }

  static validation(fields?: Record<string, string>, message = "Validation failed"): AppError {
    return new AppError(ErrorCode.VALIDATION, message, fields ? { fields } : {})
  }

  static rateLimited(message = "Too many requests"): AppError {
    return new AppError(ErrorCode.RATE_LIMITED, message)
  }

  static idempotentReplay(message = "Idempotent replay"): AppError {
    return new AppError(ErrorCode.IDEMPOTENT_REPLAY, message)
  }

  static abuseHeld(message = "Held for review"): AppError {
    return new AppError(ErrorCode.ABUSE_HELD, message)
  }

  static turnstileFailed(message = "Turnstile verification failed"): AppError {
    return new AppError(ErrorCode.TURNSTILE_FAILED, message)
  }

  static gpsImplausible(message = "GPS location implausible"): AppError {
    return new AppError(ErrorCode.GPS_IMPLAUSIBLE, message)
  }

  static mediaRejected(message = "Media rejected"): AppError {
    return new AppError(ErrorCode.MEDIA_REJECTED, message)
  }

  static notRoutable(message = "No routing contact on file"): AppError {
    return new AppError(ErrorCode.NOT_ROUTABLE, message)
  }

  static conflict(message = "Conflict"): AppError {
    return new AppError(ErrorCode.CONFLICT, message)
  }

  static unsupportedApiVersion(message = "Unsupported API version"): AppError {
    return new AppError(ErrorCode.UNSUPPORTED_API_VERSION, message)
  }

  static apiVersionSunset(message = "API version sunset"): AppError {
    return new AppError(ErrorCode.API_VERSION_SUNSET, message)
  }

  static internal(message = "Internal error"): AppError {
    return new AppError(ErrorCode.INTERNAL, message)
  }
}

export interface AppErrorLike {
  code: ErrorCode
  message: string
  httpStatus?: unknown
  fields?: unknown
  details?: unknown
  requestId?: unknown
}

const ERROR_CODE_VALUES: ReadonlySet<string> = new Set<string>(Object.values(ErrorCode))

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === "string" && ERROR_CODE_VALUES.has(value)
}

export function isAppErrorLike(value: unknown): value is AppErrorLike {
  if (typeof value !== "object" || value === null) return false
  const candidate = value as { code?: unknown; message?: unknown }
  return isErrorCode(candidate.code) && typeof candidate.message === "string"
}

function stringFields(fields: unknown): Record<string, string> | undefined {
  if (typeof fields !== "object" || fields === null || Array.isArray(fields)) return undefined
  const named = Object.entries(fields).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  )
  return named.length > 0 ? Object.fromEntries(named) : undefined
}

function objectDetails(details: unknown): AppErrorDetails | undefined {
  if (typeof details !== "object" || details === null || Array.isArray(details)) return undefined
  return details as AppErrorDetails
}

export interface ToAppErrorOptions {
  /** Message for a value that carries none of its own (an empty message, or a non-Error throw). */
  fallbackMessage?: string
}

const UNKNOWN_ERROR_MESSAGE = "Unknown error"

export function toAppError(value: unknown, opts: ToAppErrorOptions = {}): AppError {
  if (value instanceof AppError) return value
  const fallbackMessage = opts.fallbackMessage ?? UNKNOWN_ERROR_MESSAGE

  if (isAppErrorLike(value)) {
    const { httpStatus, requestId } = value
    const fields = stringFields(value.fields)
    const details = objectDetails(value.details)
    return new AppError(value.code, value.message || fallbackMessage, {
      ...(typeof httpStatus === "number" ? { httpStatus } : {}),
      ...(fields !== undefined ? { fields } : {}),
      ...(details !== undefined ? { details } : {}),
      ...(typeof requestId === "string" ? { requestId } : {}),
      cause: value,
    })
  }

  if (value instanceof Error) {
    return new AppError(ErrorCode.INTERNAL, value.message || fallbackMessage, { cause: value })
  }

  return new AppError(ErrorCode.INTERNAL, fallbackMessage)
}

/**
 * An error from another copy of this package (a second install, a test realm) is never `instanceof` the
 * caller's AppError; recognition is structural, by `isAppErrorLike`.
 */
export function appErrorCode(err: unknown): ErrorCode | undefined {
  return isAppErrorLike(err) ? err.code : undefined
}

/**
 * The server names the offending key in `fields`, which is how a refusal is told apart from a generic
 * failure of the same code.
 */
export function appErrorFields(err: unknown): Record<string, string> | undefined {
  return isAppErrorLike(err) ? stringFields(err.fields) : undefined
}

export type ErrorCodeTable<Value> = Readonly<Partial<Record<ErrorCode, Value>>>

/**
 * Copy is chosen by code alone and the server's message text is never shown: it is English-only and
 * written for diagnostics. An unknown or missing code reads as `fallback`.
 */
export function byErrorCode<Value>(
  code: string | undefined,
  table: ErrorCodeTable<Value>,
  fallback: Value,
): Value {
  if (!isErrorCode(code)) return fallback
  const value = table[code]
  return value === undefined ? fallback : value
}

export function errorCopyKey<Value>(
  err: unknown,
  table: ErrorCodeTable<Value>,
  fallback: Value,
): Value {
  return byErrorCode(appErrorCode(err), table, fallback)
}
