import { z } from "zod"
import { legalRecordSha256 } from "../../legal-texts/index.js"
import { LegalVersionSchema } from "../../schemas/legal.js"
import { LegalBlockSchema } from "../blocks.js"
import type { LegalDocumentVersion } from "../documents.js"

export interface LegalRegistry {
  documents: readonly LegalDocumentVersion[]
  texts: Readonly<Record<string, readonly unknown[]>>
  published: Readonly<Record<string, string>>
}

// Seeded before DECISIONS §66 from the web pages' text: no title, summary, material or blocks, and a hash
// nothing here can recompute.
const PRE_EPIC_KEYS: ReadonlySet<string> = new Set([
  "terms@2026-09-06",
  "terms@2026-09-16",
  "terms@2026-09-21",
  "privacy@2026-09-06",
  "privacy@2026-09-16",
  "privacy@2026-09-21",
  "cookies@2026-09-06",
  "cookies@2026-09-16",
  "subprocessors@2026-09-06",
  "subprocessors@2026-09-16",
])

const NEVER_MATERIAL: ReadonlySet<string> = new Set(["cookies", "subprocessors"])
const BlocksSchema = z.array(LegalBlockSchema).min(1)

const keyOf = (entry: { type: string; version: string }): string => `${entry.type}@${entry.version}`

/** Every way the registry breaks DECISIONS §66, each naming its `type@version`; empty when it holds. */
export function legalRegistryProblems({ documents, texts, published }: LegalRegistry): string[] {
  const problems: string[] = []
  const keys = new Set<string>()
  const lastEffectiveAt = new Map<string, number>()

  for (const entry of documents) {
    const key = keyOf(entry)
    if (keys.has(key)) problems.push(`${key}: a second version with the same version string`)
    keys.add(key)

    if (!LegalVersionSchema.safeParse(entry.version).success) {
      problems.push(`${key}: version is not YYYY-MM-DD or YYYY-MM-DD-<n> from 2`)
    }

    const effectiveAt = Date.parse(entry.effectiveAt)
    const previous = lastEffectiveAt.get(entry.type)
    if (previous !== undefined && !(effectiveAt > previous)) {
      problems.push(`${key}: effectiveAt is not after the previous ${entry.type} version (newest last)`)
    }
    lastEffectiveAt.set(entry.type, effectiveAt)

    if (entry.material === true && NEVER_MATERIAL.has(entry.type)) {
      problems.push(`${key}: ${entry.type} versions are never material`)
    }

    const described = [entry.title, entry.summary, entry.material].filter((field) => field !== undefined).length
    const blocks = texts[key]
    if (PRE_EPIC_KEYS.has(key)) {
      if (described > 0) problems.push(`${key}: a version from before §66 has no title, summary or material`)
      if (blocks !== undefined) problems.push(`${key}: a version from before §66 has no blocks`)
    } else if (described < 3) {
      problems.push(`${key}: a new version needs title, summary and material`)
    } else if (blocks === undefined) {
      problems.push(`${key}: no LEGAL_TEXTS entry`)
    } else {
      const parsed = BlocksSchema.safeParse(blocks)
      if (!parsed.success) {
        problems.push(`${key}: blocks are invalid: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`)
      } else if (legalRecordSha256(entry, parsed.data) !== entry.sha256) {
        problems.push(`${key}: sha256 differs from the recomputed record hash; run pnpm legal:hash`)
      }
    }

    const publishedSha256 = published[key]
    if (publishedSha256 === undefined) {
      problems.push(`${key}: missing from published-hashes.json`)
    } else if (publishedSha256 !== entry.sha256) {
      problems.push(`${key}: sha256 differs from the published hash; a published version never changes`)
    }
  }

  for (const key of Object.keys(texts)) {
    if (!keys.has(key)) problems.push(`${key}: LEGAL_TEXTS entry with no version in LEGAL_DOCUMENTS`)
  }
  for (const key of Object.keys(published)) {
    if (!keys.has(key)) problems.push(`${key}: published version removed from LEGAL_DOCUMENTS`)
  }
  return problems
}
