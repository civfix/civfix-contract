import type { LegalDocumentVersion } from "../documents.js"

export interface LegalRegistry {
  documents: readonly LegalDocumentVersion[]
  texts: Readonly<Record<string, readonly unknown[]>>
  published: Readonly<Record<string, string>>
}

export function legalRegistryProblems(_registry: LegalRegistry): string[] {
  throw new Error("not implemented")
}
