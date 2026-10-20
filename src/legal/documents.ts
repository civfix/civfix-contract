import type { LegalDocumentType } from "../schemas/common.js"

export interface LegalDocumentVersion {
  type: LegalDocumentType
  version: string
  sha256: string
  effectiveAt: string
  url: string
}

const TERMS_PRIVACY_VERSION = "2026-10-20"
const TERMS_PRIVACY_EFFECTIVE_AT = "2026-10-20T00:00:00.000Z"
const COOKIES_SUBPROCESSORS_VERSION = "2026-09-16"
const COOKIES_SUBPROCESSORS_EFFECTIVE_AT = "2026-09-16T00:00:00.000Z"
const LEGAL_BASE_URL = "https://civfix.org/legal"

const DOCUMENTS: Readonly<Record<LegalDocumentType, LegalDocumentVersion>> = {
  terms: {
    type: "terms",
    version: TERMS_PRIVACY_VERSION,
    sha256: "942aabae31cda45d9cdace018ee0953d28506b27d2f0c45b2d3cd554cfa66ed3",
    effectiveAt: TERMS_PRIVACY_EFFECTIVE_AT,
    url: `${LEGAL_BASE_URL}/terms`,
  },
  privacy: {
    type: "privacy",
    version: TERMS_PRIVACY_VERSION,
    sha256: "05dedba2376323c94697e2bfb43915f6b983761b806b74ba336d46c2f991ff8a",
    effectiveAt: TERMS_PRIVACY_EFFECTIVE_AT,
    url: `${LEGAL_BASE_URL}/privacy`,
  },
  cookies: {
    type: "cookies",
    version: COOKIES_SUBPROCESSORS_VERSION,
    sha256: "4a05415bba1ef0301058815ce6d01f98eb593bd18378e7ce52555074da3064c0",
    effectiveAt: COOKIES_SUBPROCESSORS_EFFECTIVE_AT,
    url: `${LEGAL_BASE_URL}/cookies`,
  },
  subprocessors: {
    type: "subprocessors",
    version: COOKIES_SUBPROCESSORS_VERSION,
    sha256: "5ab722bb37cc2972ada7521b6dc239bfd85f82691d0e3e2489f5dcac9983a198",
    effectiveAt: COOKIES_SUBPROCESSORS_EFFECTIVE_AT,
    url: `${LEGAL_BASE_URL}/subprocessors`,
  },
}

export const LEGAL_DOCUMENTS: readonly LegalDocumentVersion[] = Object.freeze(
  (Object.keys(DOCUMENTS) as LegalDocumentType[]).map((type) => Object.freeze(DOCUMENTS[type])),
)

export function legalDocument(type: LegalDocumentType): LegalDocumentVersion {
  const document = DOCUMENTS[type]
  if (document === undefined) throw new RangeError(`unknown legal document type "${type}"`)
  return document
}

export function currentVersion(type: LegalDocumentType): string {
  return legalDocument(type).version
}

export function isCurrent(type: LegalDocumentType, version: string): boolean {
  return legalDocument(type).version === version
}
