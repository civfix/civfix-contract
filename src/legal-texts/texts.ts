import type { LegalBlock } from "../legal/blocks.js"
import { COOKIES_2026_10_26 } from "./cookies.js"
import { PRIVACY_2026_10_26 } from "./privacy.js"
import { SUBPROCESSORS_2026_10_26 } from "./subprocessors.js"
import { TERMS_2026_10_26 } from "./terms.js"

// The text of every version written since DECISIONS §66, keyed by `type@version`. Only the backend imports
// `@civfix/contract/legal-texts`, so no app bundle carries the documents.
export const LEGAL_TEXTS: Readonly<Record<string, readonly LegalBlock[]>> = Object.freeze({
  "terms@2026-10-26": TERMS_2026_10_26,
  "privacy@2026-10-26": PRIVACY_2026_10_26,
  "cookies@2026-10-26": COOKIES_2026_10_26,
  "subprocessors@2026-10-26": SUBPROCESSORS_2026_10_26,
})
