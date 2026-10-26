import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { z } from "zod"
import { COOKIES_2026_10_26 } from "../../legal-texts/cookies.js"
import { LEGAL_TEXTS, legalRecordSha256 } from "../../legal-texts/index.js"
import { PRIVACY_2026_10_26 } from "../../legal-texts/privacy.js"
import { SUBPROCESSORS_2026_10_26 } from "../../legal-texts/subprocessors.js"
import { TERMS_2026_10_26 } from "../../legal-texts/terms.js"
import type { MarkdownInline } from "../../markdown/ast.js"
import { parseMarkdownInline } from "../../markdown/parse.js"
import type { LegalDocumentType } from "../../schemas/common.js"
import { LegalBlockSchema, type LegalBlock } from "../blocks.js"
import { LEGAL_DOCUMENTS } from "../documents.js"
import EMPHASIS from "./fixtures/emphasis.json"
import { PRE_EPIC } from "./pre-epic.js"
import PUBLISHED from "./published-hashes.json"
import { legalRegistryProblems } from "./registry-invariants.js"

const ROOT = fileURLToPath(new URL("../../../", import.meta.url))
const D = "2026-10-26"
const TYPES: readonly LegalDocumentType[] = ["terms", "privacy", "cookies", "subprocessors"]
const TITLES: Record<LegalDocumentType, string> = {
  terms: "Terms of Service",
  privacy: "Privacy Policy",
  cookies: "Cookies & Storage",
  subprocessors: "Sub-processors",
}
const EXPORTS: Record<LegalDocumentType, readonly LegalBlock[]> = {
  terms: TERMS_2026_10_26,
  privacy: PRIVACY_2026_10_26,
  cookies: COOKIES_2026_10_26,
  subprocessors: SUBPROCESSORS_2026_10_26,
}
const keyOf = (entry: { type: string; version: string }): string => `${entry.type}@${entry.version}`
const blocksOf = (type: LegalDocumentType): readonly LegalBlock[] => LEGAL_TEXTS[`${type}@${D}`] ?? []

// The canonical text of each page as the web build served it (`canonicalDocumentText` of its
// `<article class="legal-prose">`), produced from the built export, never retyped.
const fixture = (type: LegalDocumentType): string =>
  readFileSync(join(ROOT, `src/legal/__tests__/fixtures/${type}.txt`), "utf8")

const plainText = (nodes: readonly MarkdownInline[]): string =>
  nodes.map((node) => (node.type === "text" ? node.value : plainText(node.children))).join("")

// The extraction reads every tag as a space, so the page's `Inc.</strong>,` is `Inc. ,` there; whitespace
// next to punctuation is dropped on both sides so only the words and the punctuation are compared.
const normalize = (line: string): string =>
  line
    .replace(/\s+/gu, " ")
    .trim()
    .replace(/ (?=[.,;:!?)])/gu, "")
    .replace(/(?<=\() /gu, "")

/** One line per heading, paragraph and list item; a table is its header line, then one line per row. */
function documentLines(blocks: readonly LegalBlock[]): string[] {
  const line = (cells: readonly string[]): string =>
    normalize(cells.map((cell) => plainText(parseMarkdownInline(cell).nodes)).join(" "))
  return blocks.flatMap((block) => {
    switch (block.kind) {
      case "heading":
      case "paragraph":
        return [line([block.text])]
      case "list":
        return block.items.map((item) => line([item]))
      case "table":
        return [line(block.columns), ...block.rows.map(line)]
    }
  })
}

const fixtureLines = (type: LegalDocumentType): string[] => fixture(type).split("\n").map(normalize)

/** Every inline text of a document, in reading order. */
function inlineTexts(blocks: readonly LegalBlock[]): string[] {
  return blocks.flatMap((block) => {
    switch (block.kind) {
      case "heading":
      case "paragraph":
        return [block.text]
      case "list":
        return block.items
      case "table":
        return [...block.columns, ...block.rows.flat()]
    }
  })
}

function collect(nodes: readonly MarkdownInline[], type: MarkdownInline["type"], out: MarkdownInline[] = []) {
  for (const node of nodes) {
    if (node.type === type) out.push(node)
    if (node.type !== "text") collect(node.children, type, out)
  }
  return out
}

/** The same document with its first inline text rewritten. */
function withFirstText(blocks: readonly LegalBlock[], index: number, edit: (text: string) => string): LegalBlock[] {
  return blocks.map((block, i): LegalBlock => {
    if (i !== index) return block
    switch (block.kind) {
      case "heading":
      case "paragraph":
        return { ...block, text: edit(block.text) }
      case "list":
        return { ...block, items: [edit(block.items[0] as string), ...block.items.slice(1)] }
      case "table":
        return { ...block, columns: [edit(block.columns[0] as string), ...block.columns.slice(1)] }
    }
  })
}

describe("LEGAL_DOCUMENTS", () => {
  it("T1: keeps the pre-epic ten first, then one 2026-10-26 version per type, each the last of its type", () => {
    expect(LEGAL_DOCUMENTS).toHaveLength(14)
    expect(LEGAL_DOCUMENTS.slice(0, 10).map((entry) => ({ ...entry }))).toEqual(PRE_EPIC)
    for (const entry of LEGAL_DOCUMENTS.slice(0, 10)) {
      expect(entry).not.toHaveProperty("title")
      expect(entry).not.toHaveProperty("summary")
      expect(entry).not.toHaveProperty("material")
    }
    const added = LEGAL_DOCUMENTS.slice(10)
    expect(added.map((entry) => ({ ...entry }))).toEqual(
      TYPES.map((type, i) => ({
        type,
        version: D,
        effectiveAt: `${D}T00:00:00.000Z`,
        url: `https://civfix.org/legal/${type}`,
        title: TITLES[type],
        summary: "No change in wording",
        material: false,
        sha256: added[i]?.sha256,
      })),
    )
    for (const entry of added) {
      expect(entry.sha256).toMatch(/^[0-9a-f]{64}$/u)
      expect(LEGAL_DOCUMENTS.filter((other) => other.type === entry.type).at(-1)).toBe(entry)
    }
  })
})

describe("LEGAL_TEXTS", () => {
  it("T2: holds exactly the four 2026-10-26 documents, each its type file's export and valid blocks", () => {
    expect(Object.keys(LEGAL_TEXTS).sort()).toEqual(TYPES.map((type) => `${type}@${D}`).sort())
    for (const type of TYPES) {
      expect(LEGAL_TEXTS[`${type}@${D}`], type).toBe(EXPORTS[type])
      expect(z.array(LegalBlockSchema).min(1).safeParse(EXPORTS[type]).success, type).toBe(true)
    }
  })

  it("T3: the real registry holds every invariant", () => {
    expect(
      legalRegistryProblems({ documents: LEGAL_DOCUMENTS, texts: LEGAL_TEXTS, published: PUBLISHED }),
    ).toEqual([])
  })

  it("T4: every new version's sha256 is its record hash, and pnpm legal:hash finds nothing to write", {
    timeout: 120_000,
  }, () => {
    for (const type of TYPES) {
      const entry = LEGAL_DOCUMENTS.find((candidate) => keyOf(candidate) === `${type}@${D}`)
      expect(entry, type).toBeDefined()
      if (entry === undefined) continue
      expect(legalRecordSha256(entry, blocksOf(type)), type).toBe(entry.sha256)
    }
    const out = execFileSync("node", [join(ROOT, "scripts/legal-hash.mjs")], { cwd: ROOT, encoding: "utf8" })
    expect(out.trim()).toBe("legal:hash: every hash is current")
    expect(execFileSync("git", ["status", "--porcelain"], { cwd: ROOT, encoding: "utf8" })).toBe("")
  })

  it("T5: published-hashes.json keeps the pre-epic ten byte for byte and adds the four new hashes", () => {
    const raw = readFileSync(join(ROOT, "src/legal/__tests__/published-hashes.json"), "utf8")
    expect(raw.split("\n").slice(1, 11)).toEqual(
      PRE_EPIC.map((entry) => `  ${JSON.stringify(keyOf(entry))}: ${JSON.stringify(entry.sha256)},`),
    )
    expect(Object.keys(PUBLISHED)).toHaveLength(14)
    for (const entry of PRE_EPIC) expect(PUBLISHED[keyOf(entry) as keyof typeof PUBLISHED]).toBe(entry.sha256)
    for (const entry of LEGAL_DOCUMENTS.slice(10)) {
      expect(PUBLISHED[keyOf(entry) as keyof typeof PUBLISHED], keyOf(entry)).toBe(entry.sha256)
    }
  })
})

describe("the migrated texts", () => {
  it("T6: each document's text equals the served page's, line for line", () => {
    for (const type of TYPES) expect(documentLines(blocksOf(type)), type).toEqual(fixtureLines(type))
  })

  it("T6: changing, adding or dropping one word in any block breaks the match", () => {
    const edits: ReadonlyArray<(text: string) => string> = [
      (text) => text.replace(/[A-Za-z]+/u, "Changed"),
      (text) => `${text} added`,
      (text) => text.replace(/\s*\S+$/u, ""),
    ]
    for (const type of TYPES) {
      const blocks = blocksOf(type)
      const expected = fixtureLines(type)
      blocks.forEach((_block, index) => {
        for (const edit of edits) {
          expect(documentLines(withFirstText(blocks, index, edit)), `${type} block ${index}`).not.toEqual(expected)
        }
      })
    }
  })

  it("T7: each fixture is the text the published hash of its page was taken from", () => {
    const hashes: Record<LegalDocumentType, string> = {
      terms: "52fe3908a8d7aa4427239a7555a2d7b2346d7a2b9730dfb539ecd157f6195772",
      privacy: "e7bb3df8d1bae0ebf3dac45021beb1f260c3035f2bf3cabd0201e2586eb2f127",
      cookies: "4a05415bba1ef0301058815ce6d01f98eb593bd18378e7ce52555074da3064c0",
      subprocessors: "5ab722bb37cc2972ada7521b6dc239bfd85f82691d0e3e2489f5dcac9983a198",
    }
    for (const type of TYPES) {
      expect(createHash("sha256").update(fixture(type), "utf8").digest("hex"), type).toBe(hashes[type])
    }
  })

  it("T8: links point at the same legal pages in order, and the contact address is plain text", () => {
    const page = (name: string): string => `https://civfix.org/legal/${name}`
    const expected: Record<LegalDocumentType, string[]> = {
      terms: ["privacy", "privacy", "privacy", "subprocessors", "privacy"].map(page),
      privacy: ["cookies", "subprocessors", "cookies", "terms"].map(page),
      cookies: ["privacy", "subprocessors"].map(page),
      subprocessors: ["privacy", "privacy"].map(page),
    }
    const addresses: Record<LegalDocumentType, number> = { terms: 1, privacy: 3, cookies: 1, subprocessors: 1 }
    for (const type of TYPES) {
      const parsed = inlineTexts(blocksOf(type)).map((text) => parseMarkdownInline(text))
      expect(parsed.flatMap((parse) => parse.unsafeHrefs), type).toEqual([])
      const links = parsed.flatMap((parse) => collect(parse.nodes, "link"))
      expect(links.map((link) => (link.type === "link" ? link.href : "")), type).toEqual(expected[type])
      expect(links.map((link) => plainText([link])).join(" "), type).not.toContain("roman@reachoutla.org")
      const text = parsed.map((parse) => plainText(parse.nodes)).join("\n")
      expect(text.split("roman@reachoutla.org").length - 1, type).toBe(addresses[type])
      expect(JSON.stringify(blocksOf(type)), type).not.toContain("mailto:")
    }
  })

  it("T10: bold and italic spans match the served page's, in order", () => {
    const spans = (type: LegalDocumentType, kind: "strong" | "em"): string[] =>
      inlineTexts(blocksOf(type))
        .flatMap((text) => collect(parseMarkdownInline(text).nodes, kind))
        .map((node) => plainText([node]).replace(/\s+/gu, " ").trim())
    const counts: Record<LegalDocumentType, [number, number]> = {
      terms: [11, 0],
      privacy: [45, 1],
      cookies: [3, 1],
      subprocessors: [0, 0],
    }
    for (const type of TYPES) {
      expect(spans(type, "strong"), type).toEqual(EMPHASIS[type].strong)
      expect(spans(type, "em"), type).toEqual(EMPHASIS[type].em)
      expect([spans(type, "strong").length, spans(type, "em").length], type).toEqual(counts[type])
    }
  })
})

describe("entry points", () => {
  it("T11: the root and /legal still reach nothing under src/legal-texts", () => {
    const imports = /(?:import|export)\s[^"';]*?from\s*["'](\.[^"']+)["']|import\(\s*["'](\.[^"']+)["']\s*\)/gu
    for (const entry of ["src/index.ts", "src/legal/index.ts"]) {
      const seen = new Set<string>()
      const queue = [join(ROOT, entry)]
      while (queue.length > 0) {
        const file = queue.pop() as string
        if (seen.has(file)) continue
        seen.add(file)
        for (const match of readFileSync(file, "utf8").matchAll(imports)) {
          const target = resolve(dirname(file), (match[1] ?? match[2]) as string)
          const ts = target.replace(/\.js$/u, ".ts")
          queue.push(existsSync(ts) ? ts : target)
        }
      }
      expect([...seen].filter((file) => relative(ROOT, file).startsWith("src/legal-texts")), entry).toEqual([])
    }
  })
})
