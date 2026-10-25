import type { LegalBlock } from "../legal/blocks.js"

// The text of every version written since DECISIONS §66, keyed by `type@version`. Only the backend imports
// `@civfix/contract/legal-texts`, so no app bundle carries the documents.
export const LEGAL_TEXTS: Readonly<Record<string, readonly LegalBlock[]>> = Object.freeze({})
