import { describe, expect, it } from "vitest"
import { LegalBlockSchema } from "../blocks.js"

const ok = (value: unknown): boolean => LegalBlockSchema.safeParse(value).success

// Each inline string is tried in every place inline text lives: a paragraph, a list item and a table cell.
function inlinePlaces(text: string): unknown[] {
  return [
    { kind: "paragraph", text },
    { kind: "list", ordered: false, items: [text] },
    { kind: "table", columns: ["Name"], rows: [[text]] },
  ]
}

describe("LegalBlockSchema", () => {
  it("T1: takes heading levels 2 and 3 unchanged and refuses 1 and 4", () => {
    const h2 = { kind: "heading", level: 2, text: "Your data" }
    const h3 = { kind: "heading", level: 3, text: "Your data" }
    expect(LegalBlockSchema.parse(h2)).toEqual(h2)
    expect(LegalBlockSchema.parse(h3)).toEqual(h3)
    expect(ok({ ...h2, level: 1 })).toBe(false)
    expect(ok({ ...h2, level: 4 })).toBe(false)
  })

  it("T2: parses a paragraph with bold, italic and a safe link, output equal to input", () => {
    const block = {
      kind: "paragraph",
      text: "We keep **reports** *indefinitely*, see [the list](https://civfix.org/legal/subprocessors).",
    }
    expect(LegalBlockSchema.parse(block)).toEqual(block)
  })

  it("T3: takes ordered and unordered lists, refuses an empty one or one without ordered", () => {
    expect(ok({ kind: "list", ordered: false, items: ["a", "b"] })).toBe(true)
    expect(ok({ kind: "list", ordered: true, items: ["a"] })).toBe(true)
    expect(ok({ kind: "list", ordered: false, items: [] })).toBe(false)
    expect(ok({ kind: "list", items: ["a"] })).toBe(false)
  })

  it("T4: takes a table whose rows match its columns and refuses ragged or empty ones", () => {
    const table = { kind: "table", columns: ["Name", "Purpose"], rows: [["Cloudflare", "CDN"]] }
    expect(ok(table)).toBe(true)
    expect(ok({ ...table, rows: [["Cloudflare"]] })).toBe(false)
    expect(ok({ ...table, rows: [["Cloudflare", "CDN", "US"]] })).toBe(false)
    expect(ok({ ...table, columns: [] })).toBe(false)
    expect(ok({ ...table, rows: [] })).toBe(false)
  })

  it("T5: refuses unknown kinds and extra keys", () => {
    expect(ok({ kind: "image", text: "x" })).toBe(false)
    expect(ok({ kind: "html", text: "x" })).toBe(false)
    expect(ok({ kind: "paragraph", text: "x", id: "a" })).toBe(false)
    expect(ok({ kind: "heading", level: 2, text: "x", anchor: "y" })).toBe(false)
  })

  it("T6: refuses a link that is not a safe https URL in every inline place", () => {
    for (const text of [
      "[x](http://civfix.org)",
      "[x](javascript:alert(1))",
      "[x](https://127.0.0.1/)",
      "[x](mailto:a@civfix.org)",
    ]) {
      for (const block of inlinePlaces(text)) expect(ok(block), JSON.stringify(block)).toBe(false)
    }
  })

  it("T7: refuses an image in every inline place", () => {
    for (const block of inlinePlaces("![logo](https://civfix.org/a.png)")) {
      expect(ok(block), JSON.stringify(block)).toBe(false)
    }
  })

  it("T8: refuses HTML but takes a bare less-than sign", () => {
    for (const text of ["<b>x</b>", "<script>alert(1)</script>", "a <br/> b", "<!-- c -->"]) {
      for (const block of inlinePlaces(text)) expect(ok(block), JSON.stringify(block)).toBe(false)
    }
    for (const text of ["a < b", "under 13 (<13)"]) {
      for (const block of inlinePlaces(text)) expect(ok(block), JSON.stringify(block)).toBe(true)
    }
  })

  it("T9: takes only one non-blank line that reads as one paragraph", () => {
    for (const block of inlinePlaces("1\\. Definitions")) expect(ok(block), JSON.stringify(block)).toBe(true)
    for (const text of ["line one\nline two", "- item", "1. item", "", "   "]) {
      for (const block of inlinePlaces(text)) expect(ok(block), JSON.stringify(block)).toBe(false)
    }
  })
})
