import { createHash } from "node:crypto"
import type { LegalBlock } from "../legal/blocks.js"
import type { LegalDocumentVersion } from "../legal/documents.js"

// Keys sorted at every level and no whitespace, so the hash depends only on the content.
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>
    const members = Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    return `{${members.join(",")}}`
  }
  return JSON.stringify(value)
}

/**
 * The sha256 of a version's whole record (DECISIONS §66): every metadata field but `sha256`, and its
 * blocks. Versions from before §66 have no record and keep the hash they were stored with.
 */
export function legalRecordSha256(
  entry: Omit<LegalDocumentVersion, "sha256"> & { sha256?: string },
  blocks: readonly LegalBlock[],
): string {
  const { type, version, effectiveAt, url, title, summary, material } = entry
  if (title === undefined || summary === undefined || material === undefined) {
    throw new Error(`${type}@${version} has no title, summary and material, so it has no record to hash`)
  }
  const record = { type, version, effectiveAt, url, title, summary, material, blocks }
  return createHash("sha256").update(canonicalJson(record), "utf8").digest("hex")
}
