import type { LegalBlock } from "../legal/blocks.js"
import type { LegalDocumentVersion } from "../legal/documents.js"

export const LEGAL_TEXTS: Readonly<Record<string, readonly LegalBlock[]>> = Object.freeze({})

export function legalRecordSha256(_entry: LegalDocumentVersion, _blocks: readonly LegalBlock[]): string {
  throw new Error("not implemented")
}
