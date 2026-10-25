import { z } from "zod"

export const RuntimeFlagValueSchema = z.never()

export const RUNTIME_FLAGS: ReadonlyArray<{
  key: string
  label: string
  description: string
  type: string
  default: unknown
  envFallback: string | null
  public: boolean
}> = []

export function runtimeFlagValueSchema(_key: string): z.ZodTypeAny {
  throw new Error("not implemented")
}
