import { describe, expect, it } from "vitest"
import {
  EventPageBlockSchema,
  MARKDOWN_SUBSET_MAX_CHARS,
  MAX_BROADCAST_BODY,
  markdownToPlainText,
  parseMarkdownSubset,
} from "../src/index.js"

type Def = {
  type?: string
  shape?: Record<string, unknown>
  element?: unknown
  innerType?: unknown
  in?: unknown
  out?: unknown
  options?: unknown[]
}

function stringMaxima(schema: unknown, path: string, out: Record<string, number>): void {
  const def = (schema as { _zod?: { def?: Def } } | null)?._zod?.def
  if (!def) return
  switch (def.type) {
    case "string": {
      const max = (schema as { maxLength: number | null }).maxLength
      if (max !== null) out[path] = max
      return
    }
    case "object":
      for (const [key, value] of Object.entries(def.shape ?? {})) stringMaxima(value, `${path}.${key}`, out)
      return
    case "array":
      stringMaxima(def.element, `${path}[]`, out)
      return
    case "optional":
    case "nullable":
    case "default":
      stringMaxima(def.innerType, path, out)
      return
    case "pipe":
      stringMaxima(def.in, path, out)
      stringMaxima(def.out, path, out)
      return
    case "union":
      ;(def.options ?? []).forEach((option, index) => stringMaxima(option, `${path}<${index}>`, out))
      return
    default:
      return
  }
}

describe("markdown body maxima", () => {
  it("has exactly one source of truth, and the page/broadcast fields reference it", () => {
    expect(MARKDOWN_SUBSET_MAX_CHARS).toBe(8000)
    expect(MAX_BROADCAST_BODY).toBe(MARKDOWN_SUBSET_MAX_CHARS)
  })

  it("caps every page-block string at or below the parser default", () => {
    const maxima: Record<string, number> = {}
    stringMaxima(EventPageBlockSchema, "block", maxima)
    const entries = Object.entries(maxima)
    expect(entries.length).toBeGreaterThan(10)
    const over = entries.filter(([, max]) => max > MARKDOWN_SUBSET_MAX_CHARS)
    expect(over).toEqual([])
    expect(entries.some(([path, max]) => path.endsWith(".body") && max === MARKDOWN_SUBSET_MAX_CHARS)).toBe(
      true,
    )
  })

  it("parses a body of the maximum accepted length without truncating it", () => {
    const body = "a".repeat(MARKDOWN_SUBSET_MAX_CHARS)
    expect(markdownToPlainText(parseMarkdownSubset(body))).toHaveLength(MARKDOWN_SUBSET_MAX_CHARS)

    const parsed = EventPageBlockSchema.parse({ id: "b1", kind: "about", body })
    expect((parsed as { body: string }).body).toHaveLength(MARKDOWN_SUBSET_MAX_CHARS)
    expect(() => EventPageBlockSchema.parse({ id: "b1", kind: "about", body: `${body}a` })).toThrow()
  })

  it("stays fast on a pathological body of the maximum accepted length", () => {
    const started = Date.now()
    parseMarkdownSubset("[a](".repeat(MARKDOWN_SUBSET_MAX_CHARS / 4))
    parseMarkdownSubset("**a".repeat(MARKDOWN_SUBSET_MAX_CHARS / 3))
    parseMarkdownSubset("*".repeat(MARKDOWN_SUBSET_MAX_CHARS))
    expect(Date.now() - started).toBeLessThan(1000)
  })
})
