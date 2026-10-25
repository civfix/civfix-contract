import type { LegalDocumentType } from "../schemas/common.js"

/**
 * One published version of a legal document. `title`, `summary` and `material` are set on every version
 * written since DECISIONS §66 and missing only on the earlier ones, whose text was a web page and whose
 * `sha256` is kept as it was stored. A version's blocks live in `@civfix/contract/legal-texts`, keyed by
 * `type@version`, and `sha256` is `legalRecordSha256` of the two, written by `pnpm legal:hash`.
 */
export interface LegalDocumentVersion {
  type: LegalDocumentType
  version: string
  effectiveAt: string
  url: string
  sha256: string
  title?: string
  summary?: string
  material?: boolean
}

// Every version ever published, newest last per type. Versions are immutable: a change is a new entry.
// Entries are plain literals because `pnpm legal:hash` finds each one by its type and version.
const DOCUMENTS: readonly LegalDocumentVersion[] = [
  {
    type: "terms",
    version: "2026-09-06",
    effectiveAt: "2026-09-06T00:00:00.000Z",
    url: "https://civfix.org/legal/terms",
    sha256: "4a4fcfac1a8d4ced63c4c033feb14df58a2db74632bdca37865fd5ab299a485e",
  },
  {
    type: "terms",
    version: "2026-09-16",
    effectiveAt: "2026-09-16T00:00:00.000Z",
    url: "https://civfix.org/legal/terms",
    sha256: "afa437255814c5fb39e75f7507304b7a2618aa1397bcdbe3d66129385515ca36",
  },
  {
    type: "terms",
    version: "2026-09-21",
    effectiveAt: "2026-09-21T00:00:00.000Z",
    url: "https://civfix.org/legal/terms",
    sha256: "52fe3908a8d7aa4427239a7555a2d7b2346d7a2b9730dfb539ecd157f6195772",
  },
  {
    type: "privacy",
    version: "2026-09-06",
    effectiveAt: "2026-09-06T00:00:00.000Z",
    url: "https://civfix.org/legal/privacy",
    sha256: "91ba84fdeae76ed663b8711473e6c7b4ac5ae424925a663ea4383d4fe763b9dc",
  },
  {
    type: "privacy",
    version: "2026-09-16",
    effectiveAt: "2026-09-16T00:00:00.000Z",
    url: "https://civfix.org/legal/privacy",
    sha256: "d3789e993ddee83cb5c556234694a9d0f200e5d99b533eba6ca3ca2053df9417",
  },
  {
    type: "privacy",
    version: "2026-09-21",
    effectiveAt: "2026-09-21T00:00:00.000Z",
    url: "https://civfix.org/legal/privacy",
    sha256: "e7bb3df8d1bae0ebf3dac45021beb1f260c3035f2bf3cabd0201e2586eb2f127",
  },
  {
    type: "cookies",
    version: "2026-09-06",
    effectiveAt: "2026-09-06T00:00:00.000Z",
    url: "https://civfix.org/legal/cookies",
    sha256: "a45a5d61d54b22c60e7de8ea2a76fc58ed48c26cfdcbd73c5a9e02f5fb9a30ed",
  },
  {
    type: "cookies",
    version: "2026-09-16",
    effectiveAt: "2026-09-16T00:00:00.000Z",
    url: "https://civfix.org/legal/cookies",
    sha256: "4a05415bba1ef0301058815ce6d01f98eb593bd18378e7ce52555074da3064c0",
  },
  {
    type: "subprocessors",
    version: "2026-09-06",
    effectiveAt: "2026-09-06T00:00:00.000Z",
    url: "https://civfix.org/legal/subprocessors",
    sha256: "e3debad19253777755713b14ed4f1e853737e7e755b722d16f622fb0641c56a9",
  },
  {
    type: "subprocessors",
    version: "2026-09-16",
    effectiveAt: "2026-09-16T00:00:00.000Z",
    url: "https://civfix.org/legal/subprocessors",
    sha256: "5ab722bb37cc2972ada7521b6dc239bfd85f82691d0e3e2489f5dcac9983a198",
  },
]

export const LEGAL_DOCUMENTS: readonly LegalDocumentVersion[] = Object.freeze(
  DOCUMENTS.map((entry) => Object.freeze({ ...entry })),
)

/**
 * The newest version of `type` whose `effectiveAt` has passed at `now`. A version written ahead of its
 * `effectiveAt` ships early and only becomes current then (DECISIONS §66).
 */
export function currentLegalVersion(type: LegalDocumentType, now: Date): LegalDocumentVersion {
  const at = now.getTime()
  let known = false
  for (let i = LEGAL_DOCUMENTS.length - 1; i >= 0; i--) {
    const entry = LEGAL_DOCUMENTS[i] as LegalDocumentVersion
    if (entry.type !== type) continue
    known = true
    if (Date.parse(entry.effectiveAt) <= at) return entry
  }
  throw new RangeError(
    known
      ? `no "${type}" legal document is in effect at ${now.toISOString()}`
      : `unknown legal document type "${type}"`,
  )
}

/** The version of `type` in effect now. Backend only: clients get versions from the API (DECISIONS §66). */
export function legalDocument(type: LegalDocumentType): LegalDocumentVersion {
  return currentLegalVersion(type, new Date())
}

/** The version string of `type` in effect now. Backend only: clients get versions from the API (DECISIONS §66). */
export function currentVersion(type: LegalDocumentType): string {
  return legalDocument(type).version
}

/** Whether `version` is the version of `type` in effect now. Backend only: clients must not call it (DECISIONS §66). */
export function isCurrent(type: LegalDocumentType, version: string): boolean {
  return legalDocument(type).version === version
}
